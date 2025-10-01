from flask import Blueprint, jsonify, request
import logging
from datetime import datetime, timedelta
from database.db_manager import get_db_cursor

api = Blueprint('api', __name__)

ZONES = [
    'sabaneta', 'palmitas', 'medOriente', 'medOccidente', 'medCentro',
    'laestrella', 'itagui', 'girardota', 'envigado', 'copacabana',
    'caldas', 'bello', 'barbosa'
]

@api.route('/forecasts', methods=['GET'])
def get_forecasts():
    """Obtiene pronósticos de lluvia para todas las zonas desde la BD"""
    try:
        data = {}
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT zona, date_update, fecha, temperatura_maxima, temperatura_minima,
                       lluvia_madrugada, lluvia_mannana, lluvia_tarde, lluvia_noche
                FROM pronosticos
                ORDER BY zona, fecha
            """)
            rows = cursor.fetchall()
        for row in rows:
            zona = row['zona']
            if zona not in data:
                data[zona] = {
                    'date': row['date_update'],
                    'pronostico': []
                }
            data[zona]['pronostico'].append({
                'fecha': row['fecha'],
                'temperatura_maxima': row['temperatura_maxima'],
                'temperatura_minima': row['temperatura_minima'],
                'lluvia_madrugada': row['lluvia_madrugada'],
                'lluvia_mannana': row['lluvia_mannana'],
                'lluvia_tarde': row['lluvia_tarde'],
                'lluvia_noche': row['lluvia_noche']
            })
        return jsonify({'success': True, 'data': data, 'zones': ZONES})
    except Exception as e:
        logging.exception("Error en /forecasts")
        return jsonify({'success': False, 'error': str(e)}), 500

@api.route('/forecasts/<zone>', methods=['GET'])
def get_zone_forecast(zone):
    """Pronóstico de una zona específica desde la BD"""
    if zone not in ZONES:
        return jsonify({'success': False, 'error': 'Zona no válida'}), 400
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT date_update, fecha, temperatura_maxima, temperatura_minima,
                       lluvia_madrugada, lluvia_mannana, lluvia_tarde, lluvia_noche
                FROM pronosticos WHERE zona = %s ORDER BY fecha
            """, (zone,))
            rows = cursor.fetchall()
        if not rows:
            return jsonify({'success': False, 'error': 'Datos no disponibles'}), 404
        data = {
            'date': rows[0]['date_update'],
            'pronostico': [
                {
                    'fecha': r['fecha'],
                    'temperatura_maxima': r['temperatura_maxima'],
                    'temperatura_minima': r['temperatura_minima'],
                    'lluvia_madrugada': r['lluvia_madrugada'],
                    'lluvia_mannana': r['lluvia_mannana'],
                    'lluvia_tarde': r['lluvia_tarde'],
                    'lluvia_noche': r['lluvia_noche']
                } for r in rows
            ]
        }
        return jsonify({'success': True, 'zone': zone, 'data': data})
    except Exception as e:
        logging.exception("Error en /forecasts/<zone>")
        return jsonify({'success': False, 'error': str(e)}), 500

@api.route('/stations', methods=['GET'])
def get_stations():
    """Lista estaciones activas desde la BD"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT codigo, nombre, latitud, longitud, ciudad, comuna, subcuenca, barrio, valor, red, activa
                FROM estaciones WHERE activa = true
            """)
            rows = cursor.fetchall()
        return jsonify({'success': True, 'data': rows, 'count': len(rows)})
    except Exception as e:
        logging.exception("Error en /stations")
        return jsonify({'success': False, 'error': str(e)}), 500

@api.route('/stations/<int:station_id>/data', methods=['GET'])
def get_station_data(station_id):
    """Última medición de una estación"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT e.codigo, e.nombre, e.latitud, e.longitud, e.ciudad, m.*
                FROM estaciones e
                JOIN LATERAL (
                    SELECT * FROM mediciones m2 WHERE m2.estacion_codigo = e.codigo ORDER BY fecha_medicion DESC LIMIT 1
                ) m ON TRUE
                WHERE e.codigo = %s
            """, (station_id,))
            row = cursor.fetchone()
        if not row:
            return jsonify({'success': False, 'error': 'Estación no encontrada'}), 404
        return jsonify({'success': True, 'data': row})
    except Exception as e:
        logging.exception("Error en /stations/<id>/data")
        return jsonify({'success': False, 'error': str(e)}), 500

@api.route('/stations/all-data', methods=['GET'])
def get_all_stations_data():
    """Última medición de todas las estaciones activas"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT e.codigo, e.nombre, e.latitud, e.longitud, e.ciudad,
                       m.fecha_medicion, m.t, m.h, m.p, m.ws, m.wd, m.p1h, m.p24h
                FROM estaciones e
                LEFT JOIN LATERAL (
                    SELECT * FROM mediciones m2 WHERE m2.estacion_codigo = e.codigo ORDER BY fecha_medicion DESC LIMIT 1
                ) m ON TRUE
                WHERE e.activa = true
            """)
            rows = cursor.fetchall()
        # Transformar a dict keyed por codigo para mantener compatibilidad parcial con frontend actual
        data = {}
        for r in rows:
            codigo = r['codigo']
            data[codigo] = {
                'info': {
                    'codigo': codigo,
                    'nombre': r['nombre'],
                    'latitud': float(r['latitud']),
                    'longitud': float(r['longitud']),
                    'ciudad': r['ciudad']
                },
                'timestamp': r['fecha_medicion'].isoformat() if r.get('fecha_medicion') else None,
                't': float(r['t']) if r.get('t') is not None else None,
                'h': float(r['h']) if r.get('h') is not None else None,
                'p': float(r['p']) if r.get('p') is not None else None,
                'ws': float(r['ws']) if r.get('ws') is not None else None,
                'wd': float(r['wd']) if r.get('wd') is not None else None,
                'p1h': float(r['p1h']) if r.get('p1h') is not None else None,
                'p24h': float(r['p24h']) if r.get('p24h') is not None else None
            }
        return jsonify({'success': True, 'data': data, 'count': len(data)})
    except Exception as e:
        logging.exception("Error en /stations/all-data")
        return jsonify({'success': False, 'error': str(e)}), 500

@api.route('/stations/<int:station_id>/history', methods=['GET'])
def get_station_history(station_id):
    """Histórico de mediciones de una estación (últimas N horas o rango de fechas)."""
    hours_back = request.args.get('hours_back')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    where = ['estacion_codigo = %s']
    params = [station_id]
    try:
        if hours_back:
            hb = int(hours_back)
            since = datetime.utcnow() - timedelta(hours=hb)
            where.append('fecha_medicion >= %s')
            params.append(since)
        else:
            if start_date:
                sd = datetime.strptime(start_date, '%Y-%m-%d')
                where.append('fecha_medicion >= %s')
                params.append(sd)
            if end_date:
                ed = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                where.append('fecha_medicion < %s')
                params.append(ed)
    except ValueError:
        return jsonify({'success': False, 'error': 'Parámetros de fecha inválidos'}), 400
    sql = f"""
        SELECT fecha_medicion, t, h, p, ws, wd, p1h, p24h
        FROM mediciones
        WHERE {' AND '.join(where)}
        ORDER BY fecha_medicion DESC
        LIMIT 5000
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
        return jsonify({'success': True, 'station_id': station_id, 'data': rows, 'count': len(rows)})
    except Exception as e:
        logging.exception("Error en /stations/<id>/history")
        return jsonify({'success': False, 'error': str(e)}), 500

@api.route('/health', methods=['GET'])
def health_check():
    """Endpoint de salud"""
    return jsonify({'status': 'healthy', 'timestamp': str(datetime.now())})