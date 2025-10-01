from flask import Flask
from flask_cors import CORS
from api.routes import api
from api.heatmap_routes import heatmap_api
from etl.scheduler import start_scheduler
import logging, os

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app)

"""Aplicación principal Flask.

Se registra el blueprint de la API REST y se inicia el scheduler de ETL
en un hilo en background (APScheduler) para mantener la base de datos
actualizada con los datos de SIATA.

Variables de entorno relevantes:
    - DATABASE_URL: cadena de conexión PostgreSQL
    - DISABLE_SCHEDULER: si está definido ("1"), no inicia el scheduler
"""

# Registrar blueprints (API principal y endpoints de heatmap)
app.register_blueprint(api, url_prefix='/api')
app.register_blueprint(heatmap_api, url_prefix='/api')

@app.route('/')
def index():
    return {'message': 'SIATA Data API', 'status': 'running'}

def _maybe_start_scheduler():
    """Arranca el scheduler solo una vez evitando doble inicio con el reloader."""
    if os.getenv('DISABLE_SCHEDULER') == '1':
        logging.info("Scheduler deshabilitado por DISABLE_SCHEDULER=1")
        return
    # Evitar doble ejecución cuando FLASK_DEBUG está activo
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        try:
            start_scheduler()
        except Exception as e:
            logging.exception(f"No se pudo iniciar el scheduler: {e}")

_maybe_start_scheduler()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)