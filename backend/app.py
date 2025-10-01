from flask import Flask
from flask_cors import CORS
from api.routes import api
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app)

# Registrar blueprints
app.register_blueprint(api, url_prefix='/api')

@app.route('/')
def index():
    return {'message': 'SIATA Data API', 'status': 'running'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)