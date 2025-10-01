// Aplicación principal
class App {
    constructor() {
        this.currentTab = 'forecasts';
    }

    init() {
        console.log('Iniciando aplicación SIATA...');
        
        // Inicializar componentes
        this.initEventListeners();

        // Cargar datos iniciales de pronósticos
        if (typeof forecastsManager !== 'undefined') {
            forecastsManager.loadForecasts();
        }

        // Verificar estado de la API
        this.checkApiHealth();

        // Configurar actualización automática cada 10 minutos
        setInterval(() => {
            this.refreshCurrentTab();
        }, 600000);
    }

    initEventListeners() {
        console.log('Configurando event listeners...');
        
        // Configurar botones de pestañas si existen en el HTML
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab') || 
                              (e.target.textContent.includes('Pronósticos') ? 'forecasts' : 'map');
                this.showTab(tabName);
            });
        });
    }

    showTab(tabName) {
        console.log(`Cambiando a pestaña: ${tabName}`);
        
        // Ocultar todas las pestañas
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remover clase active de todos los botones
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Mostrar pestaña seleccionada
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Activar botón correspondiente
        const activeButton = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
            btn.textContent.toLowerCase().includes(tabName === 'forecasts' ? 'pronósticos' : 'mapa')
        );
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Actualizar pestaña actual
        this.currentTab = tabName;

        // Inicializar mapa si es necesario
        if (tabName === 'map' && typeof mapManager !== 'undefined' && !mapManager.map) {
            setTimeout(() => {
                console.log('Inicializando mapa...');
                mapManager.initMap();
            }, 100);
        }

        // Recargar datos de la pestaña actual
        this.refreshCurrentTab();
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
        console.log(`Actualizando pestaña: ${this.currentTab}`);
        
        if (this.currentTab === 'forecasts' && typeof forecastsManager !== 'undefined') {
            forecastsManager.loadForecasts();
        } else if (this.currentTab === 'map' && typeof mapManager !== 'undefined') {
            mapManager.refreshData();
        }
    }

    showError(message) {
        console.error('Error:', message);
        
        // Mostrar error en la interfaz
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Función global para cambiar pestañas (para compatibilidad con HTML)
function showTab(tabName) {
    if (window.app) {
        window.app.showTab(tabName);
    }
}

// Inicializar aplicación
let app;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new App();
        window.app = app; // Hacer accesible globalmente
        app.init();
    });
} else {
    app = new App();
    window.app = app;
    app.init();
}