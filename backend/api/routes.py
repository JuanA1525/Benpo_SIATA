from flask import Blueprint, jsonify, request
from etl.siata_collector import SiataCollector
import logging
from datetime import datetime

api = Blueprint('api', __name__)
siata_collector = SiataCollector()

@api.route('/forecasts', methods=['GET'])
def get_forecasts():
    """Obtiene pronósticos de lluvia para todas las zonas"""
    try:
        forecasts = siata_collector.fetch_forecast_data()
        return jsonify({
            'success': True,
            'data': forecasts,
            'zones': siata_collector.zones
        })
    except Exception as e:
        logging.error(f"Error en /forecasts: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api.route('/forecasts/<zone>', methods=['GET'])
def get_zone_forecast(zone):
    """Obtiene pronóstico de una zona específica"""
    try:
        if zone not in siata_collector.zones:
            return jsonify({'success': False, 'error': 'Zona no válida'}), 400

        forecasts = siata_collector.fetch_forecast_data()
        zone_data = forecasts.get(zone)

        if not zone_data:
            return jsonify({'success': False, 'error': 'Datos no disponibles'}), 404

        return jsonify({
            'success': True,
            'zone': zone,
            'data': zone_data
        })
    except Exception as e:
        logging.error(f"Error en /forecasts/{zone}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api.route('/stations', methods=['GET'])
def get_stations():
    """Obtiene lista de estaciones activas"""
    try:
        stations_list = siata_collector.fetch_stations_list()
        if not stations_list:
            return jsonify({'success': False, 'error': 'No se pudieron obtener las estaciones'}), 500

        return jsonify({
            'success': True,
            'data': stations_list
        })
    except Exception as e:
        logging.error(f"Error en /stations: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api.route('/stations/<int:station_id>/data', methods=['GET'])
def get_station_data(station_id):
    """Obtiene datos de una estación específica"""
    try:
        station_data = siata_collector.fetch_station_data(station_id)
        if not station_data:
            return jsonify({'success': False, 'error': 'Estación no encontrada'}), 404

        return jsonify({
            'success': True,
            'station_id': station_id,
            'data': station_data
        })
    except Exception as e:
        logging.error(f"Error en /stations/{station_id}/data: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api.route('/stations/all-data', methods=['GET'])
def get_all_stations_data():
    """Obtiene datos de todas las estaciones"""
    try:
        all_data = siata_collector.fetch_all_stations_data()
        return jsonify({
            'success': True,
            'data': all_data,
            'count': len(all_data)
        })
    except Exception as e:
        logging.error(f"Error en /stations/all-data: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api.route('/health', methods=['GET'])
def health_check():
    """Endpoint de salud"""
    return jsonify({'status': 'healthy', 'timestamp': str(datetime.now())})