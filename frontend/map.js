class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.stationsData = {};
        this.heatmapLayer = null;
        this.currentHeatmapType = 'temperature';
    }

    initMap() {
        // Inicializar mapa centrado en Medellín
        this.map = L.map('map').setView([6.2442, -75.5812], 11);

        // Agregar capa de OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Crear controles del heatmap
        this.createHeatmapControls();

        // Cargar datos de estaciones
        this.loadStationsData();
    }

    createHeatmapControls() {
        const controlsHTML = `
            <div class="heatmap-controls">
                <h3>🗺️ Controles del Mapa</h3>
                
                <div class="control-section">
                    <h4>Heatmap</h4>
                    <div class="heatmap-buttons">
                        <button class="heatmap-btn active" data-type="temperature" onclick="mapManager.showHeatmap('temperature')">
                            🌡️ Temperatura
                        </button>
                        <button class="heatmap-btn" data-type="humidity" onclick="mapManager.showHeatmap('humidity')">
                            💧 Humedad
                        </button>
                        <button class="heatmap-btn clear" onclick="mapManager.clearHeatmap()">
                            ❌ Limpiar
                        </button>
                    </div>
                </div>
                
                <div class="control-section">
                    <h4>Estaciones</h4>
                    <button class="control-btn" onclick="mapManager.refreshData()">
                        🔄 Actualizar Datos
                    </button>
                </div>
                
                <div id="heatmap-legend" class="heatmap-legend" style="display: none;">
                    <h4>Leyenda</h4>
                    <div class="legend-gradient"></div>
                    <div class="legend-labels">
                        <span class="legend-min"></span>
                        <span class="legend-max"></span>
                    </div>
                </div>
            </div>
        `;

        // Agregar controles al mapa
        const controlsDiv = document.createElement('div');
        controlsDiv.innerHTML = controlsHTML;
        controlsDiv.className = 'map-controls-container';
        
        const mapContainer = document.getElementById('map');
        if (mapContainer && mapContainer.parentNode) {
            mapContainer.parentNode.insertBefore(controlsDiv, mapContainer);
        }
    }

    async loadStationsData() {
        try {
            console.log('Cargando datos de estaciones...');
            const response = await apiClient.getAllStationsData();
            if (response.success) {
                this.stationsData = response.data;
                console.log('Datos de estaciones cargados:', Object.keys(this.stationsData).length, 'estaciones');
                this.addStationsToMap();
                // Mostrar heatmap de temperatura por defecto
                this.showHeatmap('temperature');
            } else {
                console.error('Error loading stations data:', response.error);
                this.showHeatmapMessage('Error al cargar datos de estaciones');
            }
        } catch (error) {
            console.error('Error loading stations data:', error);
            this.showHeatmapMessage('Error de conexión con el servidor');
        }
    }

    addStationsToMap() {
        // Limpiar marcadores existentes
        this.clearMarkers();

        if (!this.stationsData || typeof this.stationsData !== 'object') {
            console.warn('No hay datos de estaciones válidos');
            return;
        }

        Object.keys(this.stationsData).forEach(stationId => {
            const stationData = this.stationsData[stationId];
            if (stationData && stationData.info) {
                const marker = this.createStationMarker(stationData);
                if (marker) {
                    this.markers.push(marker);
                    marker.addTo(this.map);
                }
            }
        });

        console.log(`Agregados ${this.markers.length} marcadores al mapa`);
    }

    createStationMarker(stationData) {
        const info = stationData.info;
        const lat = info.latitud;
        const lng = info.longitud;

        if (!lat || !lng) return null;

        // Crear icono personalizado basado en el tipo de datos disponibles
        const hasTemp = stationData.t && stationData.t !== '-999';
        const hasHumidity = stationData.h && stationData.h !== '-999';
        const hasRain = stationData.p1h !== undefined || stationData['1h'] !== undefined;

        let iconColor = '#3498db'; // Azul por defecto
        if (hasTemp && hasHumidity && hasRain) iconColor = '#27ae60'; // Verde completo
        else if (hasTemp || hasHumidity) iconColor = '#f39c12'; // Naranja parcial

        const customIcon = L.divIcon({
            className: 'custom-station-marker',
            html: `<div style="background-color: ${iconColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        const marker = L.marker([lat, lng], { icon: customIcon });

        // Crear popup con información de la estación
        const popupContent = this.createPopupContent(stationData);
        marker.bindPopup(popupContent);

        return marker;
    }

    createPopupContent(stationData) {
        const info = stationData.info;

        let content = `
            <div class="station-popup">
                <h3>${info.nombre}</h3>
                <p><strong>📍 Ciudad:</strong> ${info.ciudad}</p>
                <p><strong>🏘️ Barrio:</strong> ${info.barrio}</p>
                <p><strong>🔢 Código:</strong> ${info.codigo}</p>
                <hr>
        `;

        // Agregar datos de sensores si están disponibles
        if (stationData.t && stationData.t !== '-999') {
            content += `<p><strong>🌡️ Temperatura:</strong> ${stationData.t}°C</p>`;
        }
        if (stationData.h && stationData.h !== '-999') {
            content += `<p><strong>💧 Humedad:</strong> ${stationData.h}%</p>`;
        }
        if (stationData.p && stationData.p !== '-999') {
            content += `<p><strong>🌫️ Presión:</strong> ${stationData.p} hPa</p>`;
        }
        if (stationData.p1h !== undefined) {
            content += `<p><strong>🌧️ Lluvia 1h:</strong> ${stationData.p1h} mm</p>`;
        }
        if (stationData.p24h !== undefined) {
            content += `<p><strong>🌧️ Lluvia 24h:</strong> ${stationData.p24h} mm</p>`;
        }

        // Formato alternativo para algunos sensores
        if (stationData['1h'] !== undefined) {
            content += `<p><strong>🌧️ Lluvia 1h:</strong> ${stationData['1h']} mm</p>`;
        }
        if (stationData['24h'] !== undefined) {
            content += `<p><strong>🌧️ Lluvia 24h:</strong> ${stationData['24h']} mm</p>`;
        }

        content += `
                <p><strong>⏰ Última actualización:</strong> ${new Date(stationData.timestamp).toLocaleString()}</p>
            </div>
        `;

        return content;
    }

    showHeatmap(type) {
        this.currentHeatmapType = type;
        
        // Actualizar botones activos
        document.querySelectorAll('.heatmap-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-type="${type}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Limpiar heatmap anterior
        this.clearHeatmap();

        // Crear datos del heatmap
        const heatmapData = this.generateHeatmapData(type);
        
        if (heatmapData.length === 0) {
            this.showHeatmapMessage('No hay datos suficientes para generar el mapa de calor');
            return;
        }

        // Verificar si L.heatLayer está disponible
        if (typeof L.heatLayer !== 'function') {
            console.error('Leaflet.heat plugin no está cargado');
            this.showHeatmapMessage('Plugin de heatmap no disponible');
            return;
        }

        // Crear el heatmap
        try {
            this.heatmapLayer = L.heatLayer(heatmapData, {
                radius: 40,
                blur: 25,
                maxZoom: 15,
                gradient: this.getHeatmapGradient(type)
            }).addTo(this.map);

            // Mostrar leyenda
            this.showHeatmapLegend(type, heatmapData);
            console.log(`Heatmap de ${type} creado con ${heatmapData.length} puntos`);
        } catch (error) {
            console.error('Error creando heatmap:', error);
            this.showHeatmapMessage('Error al crear el mapa de calor');
        }
    }

    generateHeatmapData(type) {
        const data = [];
        
        if (!this.stationsData || typeof this.stationsData !== 'object') {
            console.warn('No hay datos de estaciones para generar heatmap');
            return data;
        }
        
        Object.values(this.stationsData).forEach(station => {
            if (!station || !station.info || !station.info.latitud || !station.info.longitud) {
                return;
            }
            
            let value;
            switch (type) {
                case 'temperature':
                    value = station.t && station.t !== '-999' ? parseFloat(station.t) : null;
                    break;
                case 'humidity':
                    value = station.h && station.h !== '-999' ? parseFloat(station.h) : null;
                    break;
                default:
                    return;
            }

            if (value !== null && !isNaN(value)) {
                data.push([
                    parseFloat(station.info.latitud),
                    parseFloat(station.info.longitud),
                    this.normalizeValue(value, type)
                ]);
            }
        });

        console.log(`Generados ${data.length} puntos para heatmap de ${type}`);
        return data;
    }

    normalizeValue(value, type) {
        // Normalizar valores para el heatmap (0-1)
        switch (type) {
            case 'temperature':
                // Temperatura típica en Medellín: 15-35°C
                return Math.max(0, Math.min(1, (value - 15) / 20));
            case 'humidity':
                // Humedad: 0-100%
                return Math.max(0, Math.min(1, value / 100));
            default:
                return 0.5;
        }
    }

    getHeatmapGradient(type) {
        switch (type) {
            case 'temperature':
                return {
                    0.0: '#0000ff',  // Azul (frío)
                    0.3: '#00ffff',  // Cian
                    0.5: '#00ff00',  // Verde
                    0.7: '#ffff00',  // Amarillo
                    0.9: '#ff8000',  // Naranja
                    1.0: '#ff0000'   // Rojo (caliente)
                };
            case 'humidity':
                return {
                    0.0: '#8B4513',  // Marrón (seco)
                    0.2: '#DAA520',  // Dorado
                    0.4: '#FFFF00',  // Amarillo
                    0.6: '#00FF00',  // Verde
                    0.8: '#0080FF',  // Azul claro
                    1.0: '#0000FF'   // Azul (húmedo)
                };
            default:
                return {};
        }
    }

    showHeatmapLegend(type, data) {
        const legend = document.getElementById('heatmap-legend');
        if (!legend) return;

        const values = data.map(point => point[2]);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);

        let unit, minLabel, maxLabel;
        switch (type) {
            case 'temperature':
                unit = '°C';
                minLabel = '15°C';
                maxLabel = '35°C';
                break;
            case 'humidity':
                unit = '%';
                minLabel = '0%';
                maxLabel = '100%';
                break;
        }

        const gradient = this.getHeatmapGradient(type);
        const gradientColors = Object.values(gradient);
        
        legend.querySelector('.legend-gradient').style.background = 
            `linear-gradient(to right, ${gradientColors.join(', ')})`;
        legend.querySelector('.legend-min').textContent = minLabel;
        legend.querySelector('.legend-max').textContent = maxLabel;
        
        legend.style.display = 'block';
    }

    showHeatmapMessage(message) {
        // Mostrar mensaje temporal
        const messageDiv = document.createElement('div');
        messageDiv.className = 'heatmap-message';
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 1000;
        `;
        
        document.getElementById('map').appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 3000);
    }

    clearHeatmap() {
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
            this.heatmapLayer = null;
        }
        
        const legend = document.getElementById('heatmap-legend');
        if (legend) {
            legend.style.display = 'none';
        }
        
        // Remover clase active de botones
        document.querySelectorAll('.heatmap-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    clearMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    }

    refreshData() {
        this.loadStationsData();
    }
}

// Instancia global
const mapManager = new MapManager();