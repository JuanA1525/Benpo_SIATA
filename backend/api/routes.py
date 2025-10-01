from flask import Blueprint, jsonify, request
from database.db_manager import get_db_cursor
import traceback

api_bp = Blueprint('api', __name__)

@api_bp.route('/health', methods=['GET'])
def health():
    """Endpoint de salud"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as count FROM estaciones")
            result = cursor.fetchone()
            return jsonify({
                'status': 'ok',
                'estaciones_count': result['count'] if result else 0
            })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@api_bp.route('/estaciones', methods=['GET'])
def get_estaciones():
    """Obtener todas las estaciones"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT codigo, nombre, latitud, longitud, ciudad,
                       comuna, subcuenca, barrio, activa
                FROM estaciones
                WHERE activa = true
                ORDER BY nombre
            """)
            estaciones = cursor.fetchall()
            return jsonify([dict(row) for row in estaciones])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/pronosticos', methods=['GET'])
def get_pronosticos():
    """Obtener todos los pronósticos"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT zona, fecha, temperatura_maxima, temperatura_minima,
                       lluvia_madrugada, lluvia_mannana, lluvia_tarde, lluvia_noche,
                       date_update
                FROM pronosticos
                ORDER BY zona, fecha
            """)
            pronosticos = cursor.fetchall()
            return jsonify([dict(row) for row in pronosticos])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/pronosticos/<zona>', methods=['GET'])
def get_pronosticos_zona(zona):
    """Obtener pronósticos de una zona específica"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT zona, fecha, temperatura_maxima, temperatura_minima,
                       lluvia_madrugada, lluvia_mannana, lluvia_tarde, lluvia_noche,
                       date_update
                FROM pronosticos
                WHERE zona = %s
                ORDER BY fecha
            """, (zona,))
            pronosticos = cursor.fetchall()
            return jsonify([dict(row) for row in pronosticos])
    except Exception as e:
        return jsonify({'error': str(e)}), 500