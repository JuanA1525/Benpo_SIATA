// Manejo de pronósticos por zona

class ForecastsManager {
    constructor() {
        this.forecastsData = {};
        this.zones = [
            'sabaneta', 'palmitas', 'medOriente', 'medOccidente', 'medCentro',
            'laestrella', 'itagui', 'girardota', 'envigado', 'copacabana',
            'caldas', 'bello', 'barbosa'
        ];
        this.selectedZone = null;
    }

    async loadForecasts() {
        try {
            console.log('🌦️ Cargando pronósticos...');
            this.showLoading();

            const response = await apiClient.getForecasts();
            if (response.success) {
                this.forecastsData = response.data;
                this.renderZoneSelector();
                if (this.selectedZone) {
                    this.renderForecastDetails(this.selectedZone);
                }
            } else {
                console.error('Error cargando pronósticos:', response.error);
                this.showError('Error al cargar los pronósticos');
            }
        } catch (error) {
            console.error('Error cargando pronósticos:', error);
            this.showError('Error al cargar los pronósticos');
        }
    }

    showLoading() {
        const container = document.getElementById('forecasts-container');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
                <p>Cargando pronósticos del SIATA...</p>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById('forecasts-container');
        if (!container) return;

        container.innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <h3>Error al cargar datos</h3>
                <p>${message}</p>
                <button onclick="forecastsManager.loadForecasts()" class="btn-primary">Reintentar</button>
            </div>
        `;
    }

    renderZoneSelector() {
        const container = document.getElementById('forecasts-container');
        if (!container) return;

        let html = `
            <div class="zone-selector">
                <h3>Selecciona un municipio</h3>
                <div class="zones-grid">
        `;

        Object.keys(this.forecastsData).forEach(zone => {
            const zoneName = this.formatZoneName(zone);
            const hasData = this.forecastsData[zone] && this.forecastsData[zone].pronostico;
            
            html += `
                <div class="zone-card ${!hasData ? 'no-data' : ''}" onclick="forecastsManager.selectZone('${zone}')">
                    <div class="zone-icon">${this.getZoneIcon(zone)}</div>
                    <h4>${zoneName}</h4>
                    ${hasData ? '<span class="status-indicator available">Datos disponibles</span>' : '<span class="status-indicator unavailable">Sin datos</span>'}
                </div>
            `;
        });

        html += `
                </div>
            </div>
            <div id="forecast-details"></div>
        `;

        container.innerHTML = html;
    }

    selectZone(zone) {
        this.selectedZone = zone;
        this.renderForecastDetails(zone);
    }

    renderForecastDetails(zone) {
        const detailsContainer = document.getElementById('forecast-details');
        if (!detailsContainer) return;

        const data = this.forecastsData[zone];
        if (!data || !data.pronostico) {
            detailsContainer.innerHTML = `
                <div class="no-forecast-data">
                    <h3>No hay datos disponibles para ${this.formatZoneName(zone)}</h3>
                </div>
            `;
            return;
        }

        let html = `
            <div class="forecast-details">
                <div class="forecast-header">
                    <button class="back-btn" onclick="forecastsManager.goBackToSelector()">← Volver</button>
                    <h2>${this.formatZoneName(zone)}</h2>
                    <div class="last-update">Última actualización: ${new Date().toLocaleString()}</div>
                </div>
                
                <div class="forecast-days">
        `;

        data.pronostico.forEach((forecast, index) => {
            const dayLabel = index === 0 ? 'Hoy' : 
                           index === 1 ? 'Mañana' : 
                           this.getDayName(index);
            
            html += this.createDayElement(forecast, dayLabel, index);
        });

        html += `
                </div>
            </div>
        `;

        detailsContainer.innerHTML = html;
    }

    goBackToSelector() {
        const detailsContainer = document.getElementById('forecast-details');
        if (detailsContainer) {
            detailsContainer.innerHTML = '';
        }
        this.selectedZone = null;
    }

    createDayElement(forecast, dayLabel, index) {
        const tempMax = forecast.tmax || 'N/A';
        const tempMin = forecast.tmin || 'N/A';
        const rainProb = this.calculateRainProbability(forecast);
        const rainLevel = this.getRainLevel(rainProb);

        return `
            <div class="forecast-day ${index === 0 ? 'today' : ''}">
                <div class="day-header">
                    <h4>${dayLabel}</h4>
                    <div class="date">${this.formatDate(index)}</div>
                </div>
                
                <div class="weather-info">
                    <div class="temperature-section">
                        <div class="temp-item">
                            <span class="temp-icon">🌡️</span>
                            <div class="temp-details">
                                <div class="temp-max">${tempMax}°C</div>
                                <div class="temp-label">Máxima</div>
                            </div>
                        </div>
                        <div class="temp-item">
                            <span class="temp-icon">❄️</span>
                            <div class="temp-details">
                                <div class="temp-min">${tempMin}°C</div>
                                <div class="temp-label">Mínima</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="rain-section">
                        <div class="rain-probability">
                            <div class="rain-icon">${this.getRainIcon(rainLevel)}</div>
                            <div class="rain-details">
                                <div class="rain-percent">${rainProb}%</div>
                                <div class="rain-level rain-level-${rainLevel}">
                                    ${this.getRainLevelText(rainLevel)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="hourly-rain">
                    <h5>Precipitación por horas</h5>
                    <div class="rain-hours">
                        ${this.createHourlyRain(forecast)}
                    </div>
                </div>
            </div>
        `;
    }

    calculateRainProbability(forecast) {
        // Calcular probabilidad basada en los datos de precipitación por horas
        if (!forecast.p) return 0;
        
        const rainValues = Object.values(forecast.p).filter(val => val && val > 0);
        if (rainValues.length === 0) return 0;
        
        const maxRain = Math.max(...rainValues);
        
        if (maxRain > 10) return 80 + Math.min(20, maxRain);
        if (maxRain > 5) return 60 + (maxRain * 2);
        if (maxRain > 1) return 30 + (maxRain * 6);
        if (maxRain > 0.1) return 10 + (maxRain * 20);
        
        return 5;
    }

    getRainLevel(probability) {
        if (probability >= 70) return 'alta';
        if (probability >= 40) return 'media';
        return 'baja';
    }

    getRainIcon(level) {
        switch (level) {
            case 'alta': return '🌧️';
            case 'media': return '🌦️';
            case 'baja': return '🌤️';
            default: return '☀️';
        }
    }

    getRainLevelText(level) {
        switch (level) {
            case 'alta': return 'Prob. Alta';
            case 'media': return 'Prob. Media';
            case 'baja': return 'Prob. Baja';
            default: return 'Sin lluvia';
        }
    }

    createHourlyRain(forecast) {
        if (!forecast.p) return '<p class="no-data">No hay datos horarios</p>';
        
        let html = '';
        Object.keys(forecast.p).forEach(hour => {
            const rain = forecast.p[hour] || 0;
            const rainClass = rain > 5 ? 'high' : rain > 1 ? 'medium' : 'low';
            
            html += `
                <div class="hour-rain ${rainClass}">
                    <div class="hour">${hour}h</div>
                    <div class="rain-amount">${rain.toFixed(1)}mm</div>
                </div>
            `;
        });
        
        return html;
    }

    getZoneIcon(zone) {
        const icons = {
            'medCentro': '🏢',
            'medOriente': '🏔️',
            'medOccidente': '🌳',
            'bello': '🏘️',
            'itagui': '🏭',
            'envigado': '🌺',
            'sabaneta': '🌸',
            'caldas': '☘️',
            'laestrella': '⭐',
            'copacabana': '🌊',
            'girardota': '🌾',
            'barbosa': '🍃',
            'palmitas': '🌴'
        };
        return icons[zone] || '📍';
    }

    formatZoneName(zone) {
        const zoneNames = {
            'sabaneta': 'Sabaneta',
            'palmitas': 'Palmitas',
            'medOriente': 'Medellín Oriente',
            'medOccidente': 'Medellín Occidente',
            'medCentro': 'Medellín Centro',
            'laestrella': 'La Estrella',
            'itagui': 'Itagüí',
            'girardota': 'Girardota',
            'envigado': 'Envigado',
            'copacabana': 'Copacabana',
            'caldas': 'Caldas',
            'bello': 'Bello',
            'barbosa': 'Barbosa'
        };
        
        return zoneNames[zone] || zone;
    }

    getDayName(index) {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + index);
        return days[targetDate.getDay()];
    }

    formatDate(index) {
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + index);
        return targetDate.toLocaleDateString('es-CO');
    }
}

// Instancia global
const forecastsManager = new ForecastsManager();