class HeatmapManager {
    constructor(map) {
        this.map = map;
        this.heatmapLayer = null;
        this.currentParameter = 'temperature';
        this.setupControls();
    }

    setupControls() {
        this.createHeatmapControls();
        this.setupEventListeners();
    }

    createHeatmapControls() {
        const controlsHTML = `
            <div class="heatmap-controls">
                <h3>Mapa de Calor</h3>
                <div class="control-group">
                    <label for="parameter-select">Parámetro:</label>
                    <select id="parameter-select">
                        <option value="temperature">Temperatura</option>
                        <option value="humidity">Humedad</option>
                        <option value="precipitation">Precipitación</option>
                        <option value="wind_speed">Velocidad del Viento</option>
                        <option value="pressure">Presión</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <label for="date-range">Rango de Fechas:</label>
                    <div class="date-inputs">
                        <input type="date" id="start-date" />
                        <input type="date" id="end-date" />
                    </div>
                </div>
                
                <div class="control-group">
                    <button id="generate-heatmap" class="btn-primary">Generar Mapa de Calor</button>
                    <button id="clear-heatmap" class="btn-secondary">Limpiar</button>
                </div>
                
                <div id="heatmap-legend" class="heatmap-legend" style="display: none;">
                    <h4>Leyenda</h4>
                    <div class="legend-scale"></div>
                    <div class="legend-labels">
                        <span class="legend-min"></span>
                        <span class="legend-max"></span>
                    </div>
                </div>
            </div>
        `;

        // Agregar controles al DOM
        const controlsContainer = document.getElementById('heatmap-controls') || 
                                 this.createControlsContainer();
        controlsContainer.innerHTML = controlsHTML;

        // Establecer fechas por defecto (último mes)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);

        document.getElementById('end-date').value = endDate.toISOString().split('T')[0];
        document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
    }

    createControlsContainer() {
        const container = document.createElement('div');
        container.id = 'heatmap-controls';
        container.className = 'controls-panel';
        document.body.appendChild(container);
        return container;
    }

    setupEventListeners() {
        document.getElementById('generate-heatmap').addEventListener('click', () => {
            this.generateHeatmap();
        });

        document.getElementById('clear-heatmap').addEventListener('click', () => {
            this.clearHeatmap();
        });

        document.getElementById('parameter-select').addEventListener('change', (e) => {
            this.currentParameter = e.target.value;
        });
    }

    async generateHeatmap() {
        try {
            const parameter = document.getElementById('parameter-select').value;
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;

            // Mostrar indicador de carga
            this.showLoadingIndicator();

            const heatmapData = await apiClient.getHeatmapData(parameter, startDate, endDate);
            
            this.hideLoadingIndicator();
            this.displayHeatmap(heatmapData, parameter);
            this.showLegend(heatmapData, parameter);

        } catch (error) {
            this.hideLoadingIndicator();
            console.error('Error generating heatmap:', error);
            this.showError('Error al generar el mapa de calor');
        }
    }

    displayHeatmap(data, parameter) {
        // Limpiar heatmap anterior
        this.clearHeatmap();

        if (!data || data.length === 0) {
            this.showError('No hay datos disponibles para el rango seleccionado');
            return;
        }

        // Preparar datos para el heatmap
        const heatmapPoints = data.map(point => [
            point.latitude,
            point.longitude,
            this.normalizeValue(point.value, data, parameter)
        ]);

        // Crear layer de heatmap usando Leaflet.heat
        this.heatmapLayer = L.heatLayer(heatmapPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: this.getGradientForParameter(parameter)
        }).addTo(this.map);
    }

    normalizeValue(value, data, parameter) {
        const values = data.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        if (max === min) return 0.5;
        
        return (value - min) / (max - min);
    }

    getGradientForParameter(parameter) {
        const gradients = {
            temperature: {
                0.0: 'blue',
                0.3: 'cyan',
                0.5: 'yellow',
                0.7: 'orange',
                1.0: 'red'
            },
            humidity: {
                0.0: 'brown',
                0.3: 'yellow',
                0.5: 'green',
                0.7: 'blue',
                1.0: 'purple'
            },
            precipitation: {
                0.0: 'white',
                0.3: 'lightblue',
                0.5: 'blue',
                0.7: 'darkblue',
                1.0: 'navy'
            },
            wind_speed: {
                0.0: 'green',
                0.3: 'yellow',
                0.5: 'orange',
                0.7: 'red',
                1.0: 'darkred'
            },
            pressure: {
                0.0: 'purple',
                0.3: 'blue',
                0.5: 'green',
                0.7: 'yellow',
                1.0: 'red'
            }
        };

        return gradients[parameter] || gradients.temperature;
    }

    showLegend(data, parameter) {
        const legend = document.getElementById('heatmap-legend');
        const legendScale = legend.querySelector('.legend-scale');
        const minLabel = legend.querySelector('.legend-min');
        const maxLabel = legend.querySelector('.legend-max');

        // Calcular min y max
        const values = data.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Obtener unidad del parámetro
        const units = this.getParameterUnit(parameter);

        // Crear escala de colores
        const gradient = this.getGradientForParameter(parameter);
        const gradientString = Object.entries(gradient)
            .map(([stop, color]) => `${color} ${stop * 100}%`)
            .join(', ');

        legendScale.style.background = `linear-gradient(to right, ${gradientString})`;
        minLabel.textContent = `${min.toFixed(1)} ${units}`;
        maxLabel.textContent = `${max.toFixed(1)} ${units}`;

        legend.style.display = 'block';
    }

    getParameterUnit(parameter) {
        const units = {
            temperature: '°C',
            humidity: '%',
            precipitation: 'mm',
            wind_speed: 'km/h',
            pressure: 'hPa'
        };
        return units[parameter] || '';
    }

    clearHeatmap() {
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
            this.heatmapLayer = null;
        }
        document.getElementById('heatmap-legend').style.display = 'none';
    }

    showLoadingIndicator() {
        const button = document.getElementById('generate-heatmap');
        button.disabled = true;
        button.textContent = 'Generando...';
    }

    hideLoadingIndicator() {
        const button = document.getElementById('generate-heatmap');
        button.disabled = false;
        button.textContent = 'Generar Mapa de Calor';
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