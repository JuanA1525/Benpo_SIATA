import requests
import json
import time
from datetime import datetime
import logging

class SiataCollector:
    def __init__(self):
        self.base_url = "https://siata.gov.co/data/siata_app"
        self.zones = [
            'sabaneta', 'palmitas', 'medOriente', 'medOccidente', 'medCentro',
            'laestrella', 'itagui', 'girardota', 'envigado', 'copacabana',
            'caldas', 'bello', 'barbosa'
        ]

    def fetch_forecast_data(self):
        """Obtiene datos de pronóstico para todas las zonas"""
        forecast_data = {}

        for zone in self.zones:
            try:
                url = f"{self.base_url}/wrf{zone}.json"
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    forecast_data[zone] = response.json()
                    logging.info(f"Datos de pronóstico obtenidos para {zone}")
                else:
                    logging.warning(f"Error al obtener datos de {zone}: {response.status_code}")
            except Exception as e:
                logging.error(f"Error al obtener datos de {zone}: {e}")

        return forecast_data

    def fetch_stations_list(self):
        """Obtiene la lista de estaciones activas"""
        try:
            url = f"{self.base_url}/PluviometricaMeteo.json"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                return response.json()
            else:
                logging.warning(f"Error al obtener lista de estaciones: {response.status_code}")
                return None
        except Exception as e:
            logging.error(f"Error al obtener lista de estaciones: {e}")
            return None

    def fetch_station_data(self, station_id):
        """Obtiene datos de una estación específica"""
        try:
            url = f"{self.base_url}/{station_id}.json"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                data['station_id'] = station_id
                data['timestamp'] = datetime.now().isoformat()
                return data
            else:
                logging.warning(f"Error al obtener datos de estación {station_id}: {response.status_code}")
                return None
        except Exception as e:
            logging.error(f"Error al obtener datos de estación {station_id}: {e}")
            return None

    def fetch_all_stations_data(self):
        """Obtiene datos de todas las estaciones activas"""
        stations_list = self.fetch_stations_list()
        if not stations_list or 'estaciones' not in stations_list:
            return {}

        stations_data = {}
        for station in stations_list['estaciones']:
            station_id = station['codigo']
            station_data = self.fetch_station_data(station_id)
            if station_data:
                # Combinar información de la estación con sus datos
                station_data['info'] = station
                stations_data[station_id] = station_data

        return stations_data