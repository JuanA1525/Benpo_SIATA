import requests
import json
from datetime import datetime
from database.db_manager import get_db_cursor

# URLs base y zonas
WRF_BASE_URL = "https://siata.gov.co/data/siata_app/"
WRF_ZONES = [
    'sabaneta', 'palmitas', 'medOriente', 'medOccidente',
    'medCentro', 'laestrella', 'itagui', 'girardota',
    'envigado', 'copacabana', 'caldas', 'bello', 'barbosa'
]

def collect_wrf_forecasts():
    """Recolectar pronósticos WRF de todas las zonas"""
    print("🌦️ Recolectando pronósticos WRF...")

    for zona in WRF_ZONES:
        try:
            url = f"{WRF_BASE_URL}wrf{zona}.json"
            print(f"  📡 Descargando {zona}...")

            response = requests.get(url, timeout=30)
            response.raise_for_status()

            data = response.json()

            # Procesar y guardar datos
            save_wrf_forecast(zona, data)

        except requests.RequestException as e:
            print(f"  ❌ Error descargando {zona}: {e}")
        except json.JSONDecodeError as e:
            print(f"  ❌ Error JSON en {zona}: {e}")
        except Exception as e:
            print(f"  ❌ Error procesando {zona}: {e}")

def save_wrf_forecast(zona, data):
    """Guardar pronóstico WRF en la base de datos"""
    try:
        with get_db_cursor() as cursor:
            date_update = data.get('date', '')
            pronosticos = data.get('pronostico', [])

            for pronostico in pronosticos:
                # Verificar si ya existe este pronóstico
                cursor.execute("""
                    SELECT id FROM pronosticos
                    WHERE zona = %s AND fecha = %s
                """, (zona, pronostico.get('fecha')))

                existing = cursor.fetchone()

                if existing:
                    # Actualizar existente
                    cursor.execute("""
                        UPDATE pronosticos SET
                            date_update = %s,
                            temperatura_maxima = %s,
                            temperatura_minima = %s,
                            lluvia_madrugada = %s,
                            lluvia_mannana = %s,
                            lluvia_tarde = %s,
                            lluvia_noche = %s
                        WHERE id = %s
                    """, (
                        date_update,
                        int(pronostico.get('temperatura_maxima', 0)),
                        int(pronostico.get('temperatura_minima', 0)),
                        pronostico.get('lluvia_madrugada', ''),
                        pronostico.get('lluvia_mannana', ''),
                        pronostico.get('lluvia_tarde', ''),
                        pronostico.get('lluvia_noche', ''),
                        existing['id']
                    ))
                else:
                    # Insertar nuevo
                    cursor.execute("""
                        INSERT INTO pronosticos (
                            zona, date_update, fecha, temperatura_maxima,
                            temperatura_minima, lluvia_madrugada, lluvia_mannana,
                            lluvia_tarde, lluvia_noche
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        zona,
                        date_update,
                        pronostico.get('fecha'),
                        int(pronostico.get('temperatura_maxima', 0)),
                        int(pronostico.get('temperatura_minima', 0)),
                        pronostico.get('lluvia_madrugada', ''),
                        pronostico.get('lluvia_mannana', ''),
                        pronostico.get('lluvia_tarde', ''),
                        pronostico.get('lluvia_noche', '')
                    ))

            print(f"  ✅ Guardado pronóstico para {zona}")

    except Exception as e:
        print(f"  ❌ Error guardando {zona}: {e}")
        raise e