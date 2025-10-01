from flask import Flask
from flask_cors import CORS
import os
from database.db_manager import init_db
from api.routes import api_bp
from etl.scheduler import start_scheduler

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Configuración
    app.config['DATABASE_URL'] = os.getenv('DATABASE_URL')

    # Registrar blueprints
    app.register_blueprint(api_bp, url_prefix='/api')

    # Inicializar base de datos
    init_db()

    # Iniciar scheduler ETL
    start_scheduler()

    @app.route('/')
    def health_check():
        return {'status': 'Backend SIATA running', 'version': '1.0'}

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)