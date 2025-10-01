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
    where_clauses = [f"m.{value_field} IS NOT NULL"]
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


@heatmap_api.route('/heatmap/interpolate', methods=['GET'])
def get_heatmap_interpolation():
    """Endpoint: grilla interpolada (si SciPy disponible) + submuestreo.

    Query: mismos parámetros que /heatmap + grid_size (por defecto 40)
    """
    if not _SCIPY_AVAILABLE:
        return jsonify({'success': False, 'error': 'SciPy no disponible en el contenedor'}), 501

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
        return result
    points = result
    if len(points) < 4:
        return jsonify({'success': False, 'warning': 'Datos insuficientes para interpolación', 'points': points})

    grid_size = int(request.args.get('grid_size', 40))
    lats = np.array([p['latitude'] for p in points])
    lons = np.array([p['longitude'] for p in points])
    vals = np.array([p['value'] for p in points])

    # Build interpolation grid
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

    return jsonify({
        'success': True,
        'parameter': parameter,
        'aggregation': agg,
        'points_used': len(points),
        'grid_size': grid_size,
        'interpolated_points': interpolated,
        'count': len(interpolated)
    })
