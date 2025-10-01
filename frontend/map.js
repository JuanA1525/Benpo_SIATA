class WeatherMap {
    constructor() {
        this.map = null;
        this.markers = {};
        this.stationsData = [];
        this.currentHeatmap = null;
        this.init();
    }

    async init() {
        this.initMap();
        await this.loadStations();
        this.setupEventListeners();
    }

    initMap() {
        // Coordenadas centradas en Medellín
        this.map = L.map('map').setView([6.2442, -75.5812], 11);

        // Tile layer de OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
    }

    async loadStations() {
        try {
            this.stationsData = await apiClient.getStations();
            this.addStationMarkers();
        } catch (error) {
            console.error('Error loading stations:', error);
            this.showError('Error al cargar las estaciones');
        }
    }

    addStationMarkers() {
        this.stationsData.forEach(station => {
            const marker = L.marker([station.latitude, station.longitude])
                .addTo(this.map);

            // Popup con información básica
            const popupContent = `
                <div class="station-popup">
                    <h3>${station.name}</h3>
                    <p><strong>Código:</strong> ${station.code}</p>
                    <p><strong>Municipio:</strong> ${station.municipality}</p>
                    <p><strong>Altitud:</strong> ${station.altitude}m</p>
                    <button onclick="weatherMap.showStationDetails('${station.code}')" class="btn-details">
                        Ver Detalles
                    </button>
                </div>
            `;

            marker.bindPopup(popupContent);
            this.markers[station.code] = marker;

            // Click event para mostrar datos recientes
            marker.on('click', () => {
                this.highlightStation(station.code);
            });
        });
    }

    async showStationDetails(stationCode) {
        try {
            const station = this.stationsData.find(s => s.code === stationCode);
            const recentData = await apiClient.getStationData(stationCode);
            
            this.displayStationModal(station, recentData);
        } catch (error) {
            console.error('Error loading station details:', error);
            this.showError('Error al cargar los detalles de la estación');
        }
    }

    displayStationModal(station, data) {
        const modal = document.getElementById('stationModal');
        const modalContent = document.getElementById('modalContent');

        const latestData = data.length > 0 ? data[data.length - 1] : null;

        modalContent.innerHTML = `
            <div class="station-details">
                <h2>${station.name}</h2>
                <div class="station-info">
                    <p><strong>Código:</strong> ${station.code}</p>
                    <p><strong>Municipio:</strong> ${station.municipality}</p>
                    <p><strong>Coordenadas:</strong> ${station.latitude}, ${station.longitude}</p>
                    <p><strong>Altitud:</strong> ${station.altitude}m</p>
                </div>
                
                ${latestData ? `
                    <div class="latest-data">
                        <h3>Datos Más Recientes</h3>
                        <div class="data-grid">
                            <div class="data-item">
                                <span class="label">Temperatura:</span>
                                <span class="value">${latestData.temperature}°C</span>
                            </div>
                            <div class="data-item">
                                <span class="label">Humedad:</span>
                                <span class="value">${latestData.humidity}%</span>
                            </div>
                            <div class="data-item">
                                <span class="label">Precipitación:</span>
                                <span class="value">${latestData.precipitation}mm</span>
                            </div>
                            <div class="data-item">
                                <span class="label">Viento:</span>
                                <span class="value">${latestData.wind_speed} km/h</span>
                            </div>
                            <div class="data-item">
                                <span class="label">Presión:</span>
                                <span class="value">${latestData.pressure} hPa</span>
                            </div>
                            <div class="data-item">
                                <span class="label">Fecha:</span>
                                <span class="value">${new Date(latestData.timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                ` : '<p>No hay datos disponibles</p>'}
                
                <div class="modal-actions">
                    <button onclick="weatherMap.showStationChart('${station.code}')" class="btn-chart">
                        Ver Gráficos
                    </button>
                    <button onclick="weatherMap.closeModal()" class="btn-close">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    async showStationChart(stationCode) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7); // Últimos 7 días

            const data = await apiClient.getStationData(
                stationCode,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );

            this.displayChart(data);
        } catch (error) {
            console.error('Error loading chart data:', error);
            this.showError('Error al cargar los datos del gráfico');
        }
    }

    displayChart(data) {
        const chartContainer = document.getElementById('chartContainer');
        if (!chartContainer) {
            // Crear contenedor si no existe
            const container = document.createElement('div');
            container.id = 'chartContainer';
            container.innerHTML = '<canvas id="dataChart" width="400" height="200"></canvas>';
            document.getElementById('modalContent').appendChild(container);
        }

        const ctx = document.getElementById('dataChart').getContext('2d');
        
        // Preparar datos para Chart.js
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
                    tension: 0.1
                }, {
                    label: 'Humedad (%)',
                    data: humidity,
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    highlightStation(stationCode) {
        // Resetear todos los marcadores
        Object.values(this.markers).forEach(marker => {
            marker.setIcon(new L.Icon.Default());
        });

        // Resaltar el marcador seleccionado
        if (this.markers[stationCode]) {
            const highlightIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            this.markers[stationCode].setIcon(highlightIcon);
        }
    }

    closeModal() {
        const modal = document.getElementById('stationModal');
        modal.style.display = 'none';
    }

    setupEventListeners() {
        // Cerrar modal al hacer click fuera
        window.onclick = function(event) {
            const modal = document.getElementById('stationModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
}

// Instancia global del mapa
let weatherMap;