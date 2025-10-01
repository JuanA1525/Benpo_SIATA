import requests
import json
from datetime import datetime, timedelta, timezone
from database.db_manager import get_db_cursor

# URLs SIATA
WRF_BASE_URL = "https://siata.gov.co/data/siata_app/"
ESTACIONES_URL = "https://siata.gov.co/data/siata_app/PluviometricaMeteo.json"

WRF_ZONES = [
    'sabaneta', 'palmitas', 'medOriente', 'medOccidente',
    'medCentro', 'laestrella', 'itagui', 'girardota',
    'envigado', 'copacabana', 'caldas', 'bello', 'barbosa'
]

# Zona horaria de Colombia (UTC-5)
COLOMBIA_TZ = timezone(timedelta(hours=-5))

def collect_all_data():
    """Recolectar todos los datos: pronósticos, estaciones y mediciones"""
    print(f"🔄 Iniciando recolección de datos - Hora servidor: {datetime.now()}")
    print(f"🌍 Hora Colombia: {datetime.now(tz=COLOMBIA_TZ)}")
    collect_wrf_forecasts()
    collect_estaciones()
    collect_mediciones()
    print("✅ Recolección completa")

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
            print(f"  📊 Datos {zona}: date={data.get('date')}, pronósticos={len(data.get('pronostico', []))}")
            save_wrf_forecast(zona, data)

        except requests.RequestException as e:
            print(f"  ❌ Error descargando {zona}: {e}")
        except json.JSONDecodeError as e:
            print(f"  ❌ Error JSON en {zona}: {e}")
        except Exception as e:
            print(f"  ❌ Error procesando {zona}: {e}")

def collect_estaciones():
    """Recolectar información de estaciones activas"""
    print("🏢 Recolectando estaciones...")

    try:
        response = requests.get(ESTACIONES_URL, timeout=30)
        response.raise_for_status()

        data = response.json()
        estaciones = data.get('estaciones', [])

        print(f"  📡 Encontradas {len(estaciones)} estaciones en la red {data.get('red', 'N/A')}")

        contador = 0
        with get_db_cursor() as cursor:
            for estacion in estaciones:
                cursor.execute("""
                    INSERT INTO estaciones (
                        codigo, nombre, latitud, longitud, ciudad,
                        comuna, subcuenca, barrio, valor, red, activa
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (codigo) DO UPDATE SET
                        nombre = EXCLUDED.nombre,
                        latitud = EXCLUDED.latitud,
                        longitud = EXCLUDED.longitud,
                        ciudad = EXCLUDED.ciudad,
                        comuna = EXCLUDED.comuna,
                        subcuenca = EXCLUDED.subcuenca,
                        barrio = EXCLUDED.barrio,
                        valor = EXCLUDED.valor,
                        red = EXCLUDED.red,
                        activa = true,
                        updated_at = CURRENT_TIMESTAMP
                """, (
                    estacion.get('codigo'),
                    estacion.get('nombre', ''),
                    estacion.get('latitud'),
                    estacion.get('longitud'),
                    estacion.get('ciudad', ''),
                    estacion.get('comuna', ''),
                    estacion.get('subcuenca', ''),
                    estacion.get('barrio', ''),
                    estacion.get('valor', 0),
                    data.get('red', 'meteo'),
                    True
                ))
                contador += 1

        print(f"  ✅ Guardadas {contador} estaciones")

    except Exception as e:
        print(f"  ❌ Error recolectando estaciones: {e}")

def collect_mediciones():
    """Recolectar mediciones de todas las estaciones activas"""
    print("📊 Recolectando mediciones...")

    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT codigo FROM estaciones WHERE activa = true")
            estaciones = cursor.fetchall()

            print(f"  📡 Procesando {len(estaciones)} estaciones...")

            estaciones_activas = 0
            estaciones_antiguas = 0
            estaciones_inactivas = 0
            mediciones_guardadas = 0

            for i, estacion in enumerate(estaciones):
                codigo = estacion['codigo']
                if i % 10 == 0:  # Log cada 10 estaciones
                    print(f"  🔄 Progreso: {i}/{len(estaciones)} estaciones procesadas")

                resultado = collect_medicion_estacion(codigo)
                if resultado == 'activa':
                    estaciones_activas += 1
                    mediciones_guardadas += 1
                elif resultado == 'antigua':
                    estaciones_antiguas += 1
                elif resultado == 'inactiva':
                    estaciones_inactivas += 1

            print(f"  📈 Resumen mediciones:")
            print(f"    ✅ Estaciones activas: {estaciones_activas}")
            print(f"    ⚠️ Estaciones con datos antiguos: {estaciones_antiguas}")
            print(f"    🗑️ Estaciones inactivas: {estaciones_inactivas}")
            print(f"    💾 Mediciones guardadas: {mediciones_guardadas}")

    except Exception as e:
        print(f"  ❌ Error recolectando mediciones: {e}")

def collect_medicion_estacion(codigo_estacion):
    """Recolectar medición de una estación específica"""
    try:
        url = f"{WRF_BASE_URL}{codigo_estacion}.json"

        response = requests.get(url, timeout=10)
        response.raise_for_status()

        data = response.json()

        # Obtener y convertir timestamp
        date_raw = data.get('date', '0').strip()
        
        try:
            # Convertir a float primero, luego a int
            date_timestamp = int(float(date_raw))
        except (ValueError, TypeError):
            print(f"    ⚠️ Timestamp inválido para estación {codigo_estacion}: {date_raw}")
            return 'error'

        # El timestamp viene en UTC, convertir a hora Colombia sumando 5 horas
        fecha_medicion_utc = datetime.fromtimestamp(date_timestamp, tz=timezone.utc)
        fecha_medicion_colombia = fecha_medicion_utc
        now_colombia = datetime.now(tz=COLOMBIA_TZ)

        # Calcular diferencia en horas
        diferencia_horas = (now_colombia.replace(tzinfo=None) - fecha_medicion_colombia.replace(tzinfo=None)).total_seconds() / 3600

        print(f"    📅 Estación {codigo_estacion}:")
        print(f"        🕐 Medición Colombia: {fecha_medicion_colombia}")
        print(f"        🕐 Ahora Colombia: {now_colombia}")
        print(f"        ⏱️ Diferencia: {diferencia_horas:.2f} horas")

        # Filtrar datos muy antiguos (más de 24 horas)
        if diferencia_horas > 24:
            print(f"    🗑️ Estación {codigo_estacion} inactiva: {diferencia_horas:.1f} horas sin datos")
            return 'inactiva'

        # Filtrar datos antiguos (más de 2 horas)
        if diferencia_horas > 2:
            print(f"    ⚠️ Datos antiguos para estación {codigo_estacion}: {diferencia_horas:.2f} horas")
            return 'antigua'

        print(f"    ✅ Estación {codigo_estacion} activa: {diferencia_horas:.2f} horas")

        # Limpiar valores -999
        def clean_value(value):
            try:
                val = float(value)
                return None if val == -999 or val < -900 else val
            except (ValueError, TypeError):
                return None

        datos_limpios = {
            't': clean_value(data.get('t')),
            'h': clean_value(data.get('h')),
            'p': clean_value(data.get('p')),
            'ws': clean_value(data.get('ws')),
            'wd': clean_value(data.get('wd')),
            'p10m': clean_value(data.get('p10m')),
            'p1h': clean_value(data.get('p1h')),
            'p24h': clean_value(data.get('p24h'))
        }

        with get_db_cursor() as cursor:
            # Verificar si ya existe esta medición
            cursor.execute("""
                SELECT id FROM mediciones
                WHERE estacion_codigo = %s AND date_timestamp = %s
            """, (codigo_estacion, date_timestamp))

            existing = cursor.fetchone()
            if existing:
                print(f"    🔄 Medición ya existe para estación {codigo_estacion}")
                return 'existente'

            # Insertar nueva medición (convertir a UTC naive para PostgreSQL)
            fecha_utc_naive = fecha_medicion_utc.replace(tzinfo=None)
            
            cursor.execute("""
                INSERT INTO mediciones (
                    estacion_codigo, date_timestamp, fecha_medicion,
                    t, h, p, ws, wd, p10m, p1h, p24h, is_valid
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                codigo_estacion,
                date_timestamp,
                fecha_utc_naive,  # Guardar en UTC naive
                datos_limpios['t'],
                datos_limpios['h'],
                datos_limpios['p'],
                datos_limpios['ws'],
                datos_limpios['wd'],
                datos_limpios['p10m'],
                datos_limpios['p1h'],
                datos_limpios['p24h'],
                True
            ))
            print(f"    💾 Guardada medición para estación {codigo_estacion}")
            return 'activa'

    except requests.RequestException:
        # Silenciar errores de estaciones no disponibles
        return 'error_conexion'
    except Exception as e:
        print(f"    ❌ Error en estación {codigo_estacion}: {e}")
        return 'error'

def save_wrf_forecast(zona, data):
    """Guardar pronóstico WRF en la base de datos"""
    try:
        with get_db_cursor() as cursor:
            date_update = data.get('date', '')
            pronosticos = data.get('pronostico', [])

            print(f"  💾 Guardando {len(pronosticos)} pronósticos para {zona}")

            guardados = 0
            actualizados = 0

            for pronostico in pronosticos:
                cursor.execute("""
                    SELECT id FROM pronosticos
                    WHERE zona = %s AND fecha = %s
                """, (zona, pronostico.get('fecha')))

                existing = cursor.fetchone()

                if existing:
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
                    actualizados += 1
                else:
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
                    guardados += 1

        print(f"  ✅ {zona}: {guardados} nuevos, {actualizados} actualizados")

    except Exception as e:
        print(f"  ❌ Error guardando {zona}: {e}")
        raise e