// Aplicación principal
class App {
    constructor() {
        this.currentTab = 'forecasts';
    }

    init() {
        // Inicializar componentes
        this.initEventListeners();

        // Cargar datos iniciales
        forecastsManager.loadForecasts();

        // Verificar estado de la API
        this.checkApiHealth();

        // Configurar actualización automática cada 10 minutos
        setInterval(() => {
            this.refreshCurrentTab();
        }, 600000);
    }

    initEventListeners() {
        // Event listeners para las pestañas ya están en el HTML

        // Inicializar mapa cuando se cambie a esa pestaña
        document.addEventListener('DOMContentLoaded', () => {
            this.init();
        });
    }

    async checkApiHealth() {
        try {
            const response = await apiClient.healthCheck();
            console.log('API Health:', response);
        } catch (error) {
            console.error('API Health Check failed:', error);
            this.showError('No se puede conectar con el servidor');
        }
    }

    refreshCurrentTab() {
        if (this.currentTab === 'forecasts') {
            forecastsManager.loadForecasts();
        } else if (this.currentTab === 'map') {
            mapManager.refreshData();
        }
    }

    showError(message) {
        // Mostrar error en la interfaz
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 5000);
    }
}

// Función para cambiar pestañas
function showTab(tabName) {
    // Ocultar todas las pestañas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remover clase active de todos los botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar pestaña seleccionada
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');

    // Actualizar pestaña actual
    app.currentTab = tabName;

    // Inicializar mapa si es necesario
    if (tabName === 'map' && !mapManager.map) {
        setTimeout(() => mapManager.initMap(), 100);
    }
}

// Inicializar aplicación
const app = new App();

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}