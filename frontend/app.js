class WeatherApp {
    constructor() {
        this.weatherMap = null;
        this.heatmapManager = null;
        this.currentView = 'stations';
        this.init();
    }

    async init() {
        try {
            // Inicializar mapa
            this.weatherMap = new WeatherMap();
            
            // Esperar a que el mapa se cargue
            await new Promise(resolve => {
                setTimeout(resolve, 1000);
            });
            
            // Inicializar gestor de heatmaps
            this.heatmapManager = new HeatmapManager(this.weatherMap.map);
            
            // Configurar navegación
            this.setupNavigation();
            
            // Configurar filtros globales
            this.setupGlobalFilters();
            
            // Cargar datos iniciales
            await this.loadInitialData();
            
            console.log('WeatherApp initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError('Error al inicializar la aplicación');
        }
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });
    }

    switchView(view) {
        // Actualizar navegación activa
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Mostrar/ocultar paneles
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.style.display = 'none';
        });

        switch(view) {
            case 'stations':
                document.getElementById('stations-view').style.display = 'block';
                this.heatmapManager.clearHeatmap();
                break;
            case 'heatmap':
                document.getElementById('heatmap-view').style.display = 'block';
                break;
            case 'analytics':
                document.getElementById('analytics-view').style.display = 'block';
                this.loadAnalytics();
                break;
        }

        this.currentView = view;
    }

    setupGlobalFilters() {
        // Filtro de municipios
        this.setupMunicipalityFilter();
        
        // Filtro de rango de fechas global
        this.setupDateRangeFilter();
        
        // Filtro de actualización automática
        this.setupAutoRefresh();
    }

    async setupMunicipalityFilter() {
        try {
            const stations = await apiClient.getStations();
            const municipalities = [...new Set(stations.map(s => s.municipality))].sort();
            
            const select = document.getElementById('municipality-filter');
            select.innerHTML = '<option value="">Todos los municipios</option>';
            
            municipalities.forEach(municipality => {
                const option = document.createElement('option');
                option.value = municipality;
                option.textContent = municipality;
                select.appendChild(option);
            });

            select.addEventListener('change', (e) => {
                this.filterByMunicipality(e.target.value);
            });
        } catch (error) {
            console.error('Error setting up municipality filter:', error);
        }
    }

    filterByMunicipality(municipality) {
        if (!this.weatherMap || !this.weatherMap.markers) return;

        Object.entries(this.weatherMap.markers).forEach(([stationCode, marker]) => {
            const station = this.weatherMap.stationsData.find(s => s.code === stationCode);
            
            if (!municipality || station.municipality === municipality) {
                marker.addTo(this.weatherMap.map);
            } else {
                this.weatherMap.map.removeLayer(marker);
            }
        });
    }

    setupDateRangeFilter() {
        const startDateInput = document.getElementById('global-start-date');
        const endDateInput = document.getElementById('global-end-date');

        // Establecer fechas por defecto
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        startDateInput.value = startDate.toISOString().split('T')[0];
        endDateInput.value = endDate.toISOString().split('T')[0];

        // Eventos de cambio
        [startDateInput, endDateInput].forEach(input => {
            input.addEventListener('change', () => {
                this.applyDateFilter();
            });
        });
    }

    applyDateFilter() {
        const startDate = document.getElementById('global-start-date').value;
        const endDate = document.getElementById('global-end-date').value;

        // Actualizar filtros de heatmap si están visibles
        if (this.currentView === 'heatmap') {
            document.getElementById('start-date').value = startDate;
            document.getElementById('end-date').value = endDate;
        }

        // Actualizar analytics si están visibles
        if (this.currentView === 'analytics') {
            this.loadAnalytics();
        }
    }

    setupAutoRefresh() {
        const autoRefreshCheckbox = document.getElementById('auto-refresh');
        const intervalSelect = document.getElementById('refresh-interval');

        let refreshInterval = null;

        autoRefreshCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                const interval = parseInt(intervalSelect.value) * 1000;
                refreshInterval = setInterval(() => {
                    this.refreshData();
                }, interval);
            } else {
                if (refreshInterval) {
                    clearInterval(refreshInterval);
                    refreshInterval = null;
                }
            }
        });

        intervalSelect.addEventListener('change', () => {
            if (autoRefreshCheckbox.checked) {
                // Reiniciar intervalo con nuevo valor
                autoRefreshCheckbox.dispatchEvent(new Event('change'));
            }
        });
    }

    async refreshData() {
        try {
            console.log('Refreshing data...');
            
            if (this.currentView === 'stations') {
                await this.weatherMap.loadStations();
            } else if (this.currentView === 'analytics') {
                await this.loadAnalytics();
            }
            
            this.showNotification('Datos actualizados', 'success');
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showNotification('Error al actualizar datos', 'error');
        }
    }

    async loadInitialData() {
        // Cargar resumen de estaciones
        await this.loadStationsSummary();
    }

    async loadStationsSummary() {
        try {
            const stations = await apiClient.getStations();
            const summaryContainer = document.getElementById('stations-summary');
            
            const activeStations = stations.length;
            const municipalities = [...new Set(stations.map(s => s.municipality))].length;
            
            summaryContainer.innerHTML = `
                <div class="summary-card">
                    <h3>Estaciones Activas</h3>
                    <span class="summary-value">${activeStations}</span>
                </div>
                <div class="summary-card">
                    <h3>Municipios</h3>
                    <span class="summary-value">${municipalities}</span>
                </div>
                <div class="summary-card">
                    <h3>Última Actualización</h3>
                    <span class="summary-value">${new Date().toLocaleTimeString()}</span>
                </div>
            `;
        } catch (error) {
            console.error('Error loading stations summary:', error);
        }
    }

    async loadAnalytics() {
        try {
            const startDate = document.getElementById('global-start-date').value;
            const endDate = document.getElementById('global-end-date').value;
            
            // Cargar estadísticas generales
            await this.loadGeneralStats(startDate, endDate);
            
            // Cargar gráfico de tendencias
            await this.loadTrendsChart(startDate, endDate);
            
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError('Error al cargar las analíticas');
        }
    }

    async loadGeneralStats(startDate, endDate) {
        const statsContainer = document.getElementById('general-stats');
        statsContainer.innerHTML = '<div class="loading">Cargando estadísticas...</div>';

        try {
            const stations = await apiClient.getStations();
            
            // Obtener datos de muestra de algunas estaciones
            const sampleStations = stations.slice(0, 5);
            const statsPromises = sampleStations.map(station => 
                apiClient.getStationStats(station.code, 'temperature', startDate, endDate)
            );
            
            const statsResults = await Promise.all(statsPromises);
            
            // Calcular promedios generales
            const validStats = statsResults.filter(stat => stat && stat.avg !== null);
            
            if (validStats.length > 0) {
                const avgTemp = validStats.reduce((sum, stat) => sum + stat.avg, 0) / validStats.length;
                const maxTemp = Math.max(...validStats.map(stat => stat.max));
                const minTemp = Math.min(...validStats.map(stat => stat.min));
                
                statsContainer.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-item">
                            <h4>Temperatura Promedio</h4>
                            <span class="stat-value">${avgTemp.toFixed(1)}°C</span>
                        </div>
                        <div class="stat-item">
                            <h4>Temperatura Máxima</h4>
                            <span class="stat-value">${maxTemp.toFixed(1)}°C</span>
                        </div>
                        <div class="stat-item">
                            <h4>Temperatura Mínima</h4>
                            <span class="stat-value">${minTemp.toFixed(1)}°C</span>
                        </div>
                        <div class="stat-item">
                            <h4>Estaciones Analizadas</h4>
                            <span class="stat-value">${validStats.length}</span>
                        </div>
                    </div>
                `;
            } else {
                statsContainer.innerHTML = '<p>No hay datos disponibles para el período seleccionado</p>';
            }
        } catch (error) {
            console.error('Error loading general stats:', error);
            statsContainer.innerHTML = '<p>Error al cargar las estadísticas</p>';
        }
    }

    async loadTrendsChart(startDate, endDate) {
        const chartContainer = document.getElementById('trends-chart');
        
        try {
            // Obtener datos de una estación de muestra para el gráfico
            const stations = await apiClient.getStations();
            if (stations.length === 0) return;
            
            const sampleStation = stations[0];
            const data = await apiClient.getStationData(sampleStation.code, startDate, endDate);
            
            if (data.length === 0) {
                chartContainer.innerHTML = '<p>No hay datos disponibles para el gráfico</p>';
                return;
            }
            
            // Crear canvas si no existe
            if (!document.getElementById('trendsCanvas')) {
                chartContainer.innerHTML = '<canvas id="trendsCanvas" width="400" height="200"></canvas>';
            }
            
            const ctx = document.getElementById('trendsCanvas').getContext('2d');
            
            // Preparar datos
            const labels = data.map(d => new Date(d.timestamp).toLocaleDateString());
            const temperatures = data.map(d => d.temperature);
            const humidity = data.map(d => d.humidity);
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Temperatura (°C)',
                        data: temperatures,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.1
                    }, {
                        label: 'Humedad (%)',
                        data: humidity,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.1,
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Fecha'
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Temperatura (°C)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Humedad (%)'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('Error loading trends chart:', error);
            chartContainer.innerHTML = '<p>Error al cargar el gráfico de tendencias</p>';
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animación de entrada
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.weatherApp = new WeatherApp();
});