import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from database.db_manager import get_db_cursor
import numpy as np
try:
    from scipy.interpolate import griddata
    _SCIPY_AVAILABLE = True
except Exception:  # pragma: no cover
    _SCIPY_AVAILABLE = False

heatmap_api = Blueprint('heatmap_api', __name__)

# Estaciones excluidas permanentemente de cualquier interpolación (outliers espaciales)
EXCLUDED_STATIONS = {403}


# ---------------------------------------------------------------------------
# Internal helper to build the heatmap points query (shared by both endpoints)
# ---------------------------------------------------------------------------
def _fetch_heatmap_points(parameter: str, agg: str, hours_back: str | None,
                          start_date: str | None, end_date: str | None):
    """Return (ok, result) where result is list of point dicts or error response.

    This encapsulates the DB query so we don't need to fake a request context
    (previous code attempted blueprint.test_request_context, which does not
    exist on Blueprint objects and caused AttributeError).
    """
    field_map = {
        'temperature': 't',
        'humidity': 'h',
        'pressure': 'p',
        'wind_speed': 'ws',
        'wind_direction': 'wd',
        'precipitation': 'p1h'
    }
    if parameter not in field_map:
        return False, (jsonify({'success': False, 'error': 'Parámetro inválido'}), 400)

    value_field = field_map[parameter]
    where_clauses = [f"m.{value_field} IS NOT NULL", "e.codigo <> 403"]
    params = []

    # Time window handling
    if hours_back:
        try:
            hb = int(hours_back)
            since = datetime.utcnow() - timedelta(hours=hb)
            where_clauses.append("m.fecha_medicion >= %s")
            params.append(since)
        except ValueError:
            return False, (jsonify({'success': False, 'error': 'hours_back inválido'}), 400)
    else:
        try:
            if start_date:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                where_clauses.append("m.fecha_medicion >= %s")
                params.append(start_dt)
            if end_date:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                where_clauses.append("m.fecha_medicion < %s")
                params.append(end_dt)
        except ValueError:
            return False, (jsonify({'success': False, 'error': 'Formato de fecha inválido'}), 400)

    agg_func = {
        'mean': 'AVG',
        'max': 'MAX',
        'min': 'MIN'
    }.get(agg, 'AVG')

    sql = f"""
        SELECT e.latitud, e.longitud, {agg_func}(m.{value_field}) as value
        FROM mediciones m
        JOIN estaciones e ON e.codigo = m.estacion_codigo
        WHERE {' AND '.join(where_clauses)}
        GROUP BY e.latitud, e.longitud
        HAVING COUNT(*) > 0
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
        points = [
            {
                'latitude': float(r['latitud']),
                'longitude': float(r['longitud']),
                'value': float(r['value']) if r['value'] is not None else None
            }
            for r in rows if r['value'] is not None
        ]
        return True, points
    except Exception as e:  # pragma: no cover - runtime protection
        logging.exception("Error obteniendo datos de heatmap")
        return False, (jsonify({'success': False, 'error': str(e)}), 500)


@heatmap_api.route('/heatmap', methods=['GET'])
def get_heatmap_points():
    """Endpoint: devuelve puntos crudos (lat, lon, valor) para un parámetro.

    Query:
      parameter, agg, hours_back | start_date, end_date
    """
    parameter = request.args.get('parameter', 'temperature')
    agg = request.args.get('agg', 'mean')
    ok, result = _fetch_heatmap_points(
        parameter,
        agg,
        request.args.get('hours_back'),
        request.args.get('start_date'),
        request.args.get('end_date')
    )
    if not ok:
        return result  # (response, status)
    points = result
    return jsonify({
        'success': True,
        'parameter': parameter,
        'aggregation': agg,
        'points': points,
        'count': len(points)
    })


def _poly_fit(points, grid_size: int, degree: int):
    """Ajusta un polinomio 2D de grado 2 o 3 y devuelve grilla evaluada.

    Para grado 2: términos 1, x, y, x², xy, y² (6 coeficientes) – requiere >=6 puntos.
    Para grado 3: añade x³, x²y, xy², y³ (10 coeficientes) – requiere >=10 puntos (>=12 recomendado).
    Retorna (grid_lat, grid_lon, grid_vals) o None si el ajuste no es viable.
    """
    if degree not in (2, 3):
        raise ValueError("Solo grados 2 o 3 soportados")
    min_points = 6 if degree == 2 else 10
    if len(points) < min_points:
        return None
    lats = np.array([p['latitude'] for p in points], dtype=float)
    lons = np.array([p['longitude'] for p in points], dtype=float)
    vals = np.array([p['value'] for p in points], dtype=float)
    lat_mean, lon_mean = lats.mean(), lons.mean()
    lat_std = lats.std() or 1.0
    lon_std = lons.std() or 1.0
    Y = (lats - lat_mean) / lat_std
    Xc = (lons - lon_mean) / lon_std
    cols = [
        np.ones_like(Xc),  # a
        Xc,                # b
        Y,                 # c
        Xc**2,             # d
        Xc*Y,              # e
        Y**2               # f
    ]
    if degree == 3:
        cols.extend([
            Xc**3,         # g
            (Xc**2)*Y,     # h
            Xc*(Y**2),     # i
            Y**3           # j
        ])
    X_design = np.column_stack(cols)
    try:
        coeffs, *_ = np.linalg.lstsq(X_design, vals, rcond=None)
    except Exception:
        return None
    lat_lin = np.linspace(lats.min(), lats.max(), grid_size)
    lon_lin = np.linspace(lons.min(), lons.max(), grid_size)
    grid_lon, grid_lat = np.meshgrid(lon_lin, lat_lin)
    Gy = (grid_lat - lat_mean) / lat_std
    Gx = (grid_lon - lon_mean) / lon_std
    # Reconstrucción
    if degree == 2:
        a,b,c,d,e,f = coeffs
        grid_vals = a + b*Gx + c*Gy + d*Gx**2 + e*Gx*Gy + f*Gy**2
    else:
        a,b,c,d,e,f,g,h,i,j = coeffs
        grid_vals = (a + b*Gx + c*Gy + d*Gx**2 + e*Gx*Gy + f*Gy**2 +
                     g*Gx**3 + h*(Gx**2)*Gy + i*Gx*(Gy**2) + j*Gy**3)
    return grid_lat, grid_lon, grid_vals


@heatmap_api.route('/heatmap/interpolate', methods=['GET'])
def get_heatmap_interpolation():
    """Endpoint: grilla interpolada + submuestreo.

    Query: parameter, agg, ventana temporal, grid_size, method (grid|poly2|poly3)
    - grid (default): SciPy griddata linear → nearest fallback.
    - poly2: Ajuste polinomial de segundo grado (regresión mínima cuadrados).
    - poly3: Ajuste polinomial cúbico (más flexible, riesgo de sobreajuste con pocos puntos).
    """
    parameter = request.args.get('parameter', 'temperature')
    agg = request.args.get('agg', 'mean')
    method = request.args.get('method', 'grid').lower()

    # Obtener puntos base
    ok, result = _fetch_heatmap_points(
        parameter,
        agg,
        request.args.get('hours_back'),
        request.args.get('start_date'),
        request.args.get('end_date')
    )
    if not ok:
        return result
    points = result
    if len(points) < 4:
        return jsonify({'success': False, 'warning': 'Datos insuficientes para interpolación', 'points': points})

    grid_size = int(request.args.get('grid_size', 40))

    # Seleccionar método
    if method.startswith('poly'):
        degree = 2 if method == 'poly2' else 3 if method == 'poly3' else 2
        poly_output = _poly_fit(points, grid_size, degree)
        if poly_output is None:
            return jsonify({'success': False, 'warning': f'Polinomio grado {degree} no estable con puntos disponibles', 'points': points})
        grid_lat, grid_lon, grid_vals = poly_output
    else:
        # Requiere SciPy
        if not _SCIPY_AVAILABLE:
            return jsonify({'success': False, 'error': 'SciPy no disponible para método grid'}), 501
        lats = np.array([p['latitude'] for p in points])
        lons = np.array([p['longitude'] for p in points])
        vals = np.array([p['value'] for p in points])
        lat_lin = np.linspace(lats.min(), lats.max(), grid_size)
        lon_lin = np.linspace(lons.min(), lons.max(), grid_size)
        grid_lon, grid_lat = np.meshgrid(lon_lin, lat_lin)
        grid_vals = griddata((lats, lons), vals, (grid_lat, grid_lon), method='linear')
        if np.isnan(grid_vals).all():
            grid_vals = griddata((lats, lons), vals, (grid_lat, grid_lon), method='nearest')

    max_cells = 2000
    step = max(1, int((grid_size * grid_size) / max_cells))
    interpolated = []
    for i in range(0, grid_size, step):
        for j in range(0, grid_size, step):
            v = grid_vals[i, j]
            if np.isnan(v):
                continue
            interpolated.append({
                'latitude': float(grid_lat[i, j]),
                'longitude': float(grid_lon[i, j]),
                'value': float(v)
            })

    # Estadísticos para mejorar leyenda
    values = [p['value'] for p in points if isinstance(p['value'], (int, float))]
    stats = None
    if values:
        arr = np.array(values)
        stats = {
            'min': float(arr.min()),
            'q25': float(np.quantile(arr, 0.25)),
            'q50': float(np.quantile(arr, 0.50)),
            'q75': float(np.quantile(arr, 0.75)),
            'q90': float(np.quantile(arr, 0.90)),
            'max': float(arr.max())
        }

    return jsonify({
        'success': True,
        'parameter': parameter,
        'aggregation': agg,
        'points_used': len(points),
        'grid_size': grid_size,
        'interpolated_points': interpolated,
        'count': len(interpolated),
        'interp_method': method,
        'stats': stats
    })
