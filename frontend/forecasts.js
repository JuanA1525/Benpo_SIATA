// Manejo de pronósticos por zona

class ForecastsManager {
    constructor() {
        this.forecastsData = {};
        this.selectedZone = null;
    }

    async loadForecasts() {
        try {
            console.log('📊 [FORECAST] Iniciando carga de pronósticos...');
            this.showLoading();

            console.log('📡 [FORECAST] Llamando a apiClient.getForecasts()...');
            const response = await apiClient.getForecasts();
            console.log('� [FORECAST] Respuesta recibida:', response);

            // Verificar la respuesta - puede ser success: true O status: 'success'
            if ((response.success === true || response.status === 'success') && response.data) {
                console.log('✅ [FORECAST] Respuesta válida, procesando datos...');
                this.forecastsData = response.data;
                console.log('📊 [FORECAST] Datos procesados:', Object.keys(this.forecastsData).length, 'zonas');
                console.log('🗺️ [FORECAST] Zonas disponibles:', Object.keys(this.forecastsData));
                
                // Log detallado de cada zona
                Object.keys(this.forecastsData).forEach(zone => {
                    const zoneData = this.forecastsData[zone];
                    console.log(`🏘️ [FORECAST] ${zone}:`, {
                        hasPronostico: !!(zoneData && zoneData.pronostico),
                        pronosticoCount: zoneData.pronostico ? zoneData.pronostico.length : 0,
                        firstDay: zoneData.pronostico ? zoneData.pronostico[0] : null
                    });
                });
                
                this.renderZoneSelector();
                console.log('🎨 [FORECAST] Selector de zonas renderizado');
            } else {
                console.error('❌ [FORECAST] Formato de respuesta inválido:', response);
                throw new Error('Formato de respuesta inválido');
            }
        } catch (error) {
            console.error('💥 [FORECAST] Error cargando pronósticos:', error);
            this.showError('Error al cargar los pronósticos: ' + error.message);
        }
    }

    showLoading() {
        console.log('⏳ [FORECAST] Mostrando indicador de carga...');
        const container = document.getElementById('forecasts-container');
        if (!container) {
            console.error('❌ [FORECAST] No se encontró el contenedor forecasts-container');
            return;
        }

        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
                <p>Cargando pronósticos del SIATA...</p>
            </div>
        `;
        console.log('✅ [FORECAST] Indicador de carga mostrado');
    }

    showError(message) {
        console.log('🚨 [FORECAST] Mostrando error:', message);
        const container = document.getElementById('forecasts-container');
        if (!container) {
            console.error('❌ [FORECAST] No se encontró el contenedor forecasts-container');
            return;
        }

        container.innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <h3>Error al cargar datos</h3>
                <p>${message}</p>
                <button onclick="forecastsManager.loadForecasts()" class="btn-primary">Reintentar</button>
            </div>
        `;
        console.log('✅ [FORECAST] Error mostrado en UI');
    }

    renderZoneSelector() {
        console.log('🎨 [FORECAST] Iniciando renderizado del selector de zonas...');
        const container = document.getElementById('forecasts-container');
        if (!container) {
            console.error('❌ [FORECAST] No se encontró el contenedor forecasts-container');
            return;
        }

        const zones = Object.keys(this.forecastsData);
        console.log('🗺️ [FORECAST] Zonas a renderizar:', zones.length, 'zonas ->', zones);

        if (zones.length === 0) {
            console.warn('⚠️ [FORECAST] No hay zonas disponibles');
            this.showError('No hay datos de pronósticos disponibles');
            return;
        }

        let html = `
            <div class="zone-selector">
                <h2>🌦️ Pronósticos por Zona</h2>
                <p class="zones-subtitle">Selecciona una zona para ver el pronóstico detallado</p>
                <div class="zones-grid">
        `;

        zones.forEach(zone => {
            console.log(`🏘️ [FORECAST] Procesando zona: ${zone}`);
            const zoneName = this.formatZoneName(zone);
            const zoneData = this.forecastsData[zone];
            console.log(`📊 [FORECAST] Datos de ${zone}:`, zoneData);
            
            const hasData = zoneData && zoneData.pronostico && zoneData.pronostico.length > 0;
            console.log(`✔️ [FORECAST] ${zone} tiene datos:`, hasData);
            
            if (hasData) {
                const todayForecast = zoneData.pronostico[0];
                console.log(`📅 [FORECAST] Pronóstico de hoy para ${zone}:`, todayForecast);
                
                const tempMax = todayForecast.temperatura_maxima || 'N/A';
                const tempMin = todayForecast.temperatura_minima || 'N/A';
                const rainProb = this.calculateRainProbability(todayForecast);
                const rainLevel = this.getRainLevel(rainProb);
                
                console.log(`🌡️ [FORECAST] ${zone}: Temp max: ${tempMax}°C, min: ${tempMin}°C, lluvia: ${rainProb}% (${rainLevel})`);
                
                html += `
                    <div class="zone-card" onclick="forecastsManager.selectZone('${zone}')">
                        <div class="zone-header">
                            <div class="zone-icon">${this.getZoneIcon(zone)}</div>
                            <h3>${zoneName}</h3>
                        </div>
                        <div class="zone-weather">
                            <div class="zone-temps">
                                <span class="temp-max">↗️ ${tempMax}°C</span>
                                <span class="temp-min">↘️ ${tempMin}°C</span>
                            </div>
                            <div class="zone-rain ${rainLevel}">
                                ${this.getRainIcon(rainLevel)}
                                <span>${rainProb}%</span>
                            </div>
                        </div>
                        <div class="zone-status">
                            ${this.getRainLevelText(rainLevel)}
                        </div>
                    </div>
                `;
            } else {
                console.warn(`⚠️ [FORECAST] ${zone}: Sin datos`);
                html += `
                    <div class="zone-card no-data">
                        <div class="zone-header">
                            <div class="zone-icon">${this.getZoneIcon(zone)}</div>
                            <h3>${zoneName}</h3>
                        </div>
                        <div class="no-data-msg">Sin datos disponibles</div>
                    </div>
                `;
            }
        });

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
        console.log('✅ [FORECAST] Selector de zonas renderizado exitosamente');
    }

    selectZone(zone) {
        console.log(`🎯 [FORECAST] Zona seleccionada: ${zone}`);
        this.selectedZone = zone;
        this.renderForecastDetails(zone);
    }

    renderForecastDetails(zone) {
        console.log(`📋 [FORECAST] Renderizando detalles para zona: ${zone}`);
        const container = document.getElementById('forecasts-container');
        if (!container) {
            console.error('❌ [FORECAST] No se encontró el contenedor forecasts-container');
            return;
        }

        const zoneData = this.forecastsData[zone];
        console.log(`📊 [FORECAST] Datos para ${zone}:`, zoneData);
        
        if (!zoneData || !zoneData.pronostico || zoneData.pronostico.length === 0) {
            console.warn(`⚠️ [FORECAST] Sin datos para ${zone}`);
            this.showError(`No hay datos disponibles para ${this.formatZoneName(zone)}`);
            return;
        }

        const zoneName = this.formatZoneName(zone);
        const lastUpdate = zoneData.date || 'No disponible';

        console.log(`📅 [FORECAST] ${zone}: ${zoneData.pronostico.length} días de pronóstico`);

        let html = `
            <div class="forecast-details">
                <div class="forecast-header">
                    <button class="back-btn" onclick="forecastsManager.goBackToSelector()">
                        <i class="fas fa-arrow-left"></i> Volver
                    </button>
                    <h2>${zoneName}</h2>
                    <div class="last-update">Última actualización: ${lastUpdate}</div>
                </div>
                
                <div class="forecast-days">
        `;

        zoneData.pronostico.forEach((forecast, index) => {
            console.log(`📈 [FORECAST] Día ${index + 1} para ${zone}:`, forecast);
            const dayLabel = index === 0 ? 'Hoy' : 
                           index === 1 ? 'Mañana' : 
                           this.getDayName(new Date(forecast.fecha));
            
            html += this.createDayElement(forecast, dayLabel, index);
        });

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
        console.log(`✅ [FORECAST] Detalles renderizados para ${zone}`);
    }

    goBackToSelector() {
        this.selectedZone = null;
        this.renderZoneSelector();
    }

    createDayElement(forecast, dayLabel, index) {
        const tempMax = forecast.temperatura_maxima || 'N/A';
        const tempMin = forecast.temperatura_minima || 'N/A';
        const rainProb = this.calculateRainProbability(forecast);
        const rainLevel = this.getRainLevel(rainProb);
        const date = new Date(forecast.fecha);

        return `
            <div class="forecast-day ${index === 0 ? 'today' : ''}">
                <div class="day-header">
                    <h3>${dayLabel}</h3>
                    <div class="date">${date.toLocaleDateString('es-CO')}</div>
                </div>
                
                <div class="weather-info">
                    <div class="temperature-section">
                        <div class="temp-item">
                            <span class="temp-icon">🌡️</span>
                            <div class="temp-details">
                                <div class="temp-value">${tempMax}°C</div>
                                <div class="temp-label">Máxima</div>
                            </div>
                        </div>
                        <div class="temp-item">
                            <span class="temp-icon">❄️</span>
                            <div class="temp-details">
                                <div class="temp-value">${tempMin}°C</div>
                                <div class="temp-label">Mínima</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="rain-section">
                        <div class="rain-probability ${rainLevel}">
                            <div class="rain-icon">${this.getRainIcon(rainLevel)}</div>
                            <div class="rain-details">
                                <div class="rain-percent">${rainProb}%</div>
                                <div class="rain-level">
                                    ${this.getRainLevelText(rainLevel)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="hourly-rain">
                    <h4>Precipitación por horas</h4>
                    <div class="rain-hours">
                        ${this.createHourlyRain(forecast)}
                    </div>
                </div>
            </div>
        `;
    }

    createHourlyRain(forecast) {
        const hours = [
            { label: 'Madrugada', data: forecast.lluvia_madrugada, time: '00-06h' },
            { label: 'Mañana', data: forecast.lluvia_mannana, time: '06-12h' },
            { label: 'Tarde', data: forecast.lluvia_tarde, time: '12-18h' },
            { label: 'Noche', data: forecast.lluvia_noche, time: '18-24h' }
        ];

        return hours.map(hour => {
            const levelText = hour.data || 'SIN DATOS';
            const prob = this.convertTextToProbability(levelText);
            const level = this.getRainLevel(prob);
            
            return `
                <div class="hour-item ${level}">
                    <div class="hour-label">${hour.label}</div>
                    <div class="hour-time">${hour.time}</div>
                    <div class="hour-rain">${this.getRainIcon(level)} ${prob}%</div>
                    <div class="hour-desc">${levelText}</div>
                </div>
            `;
        }).join('');
    }

    calculateRainProbability(forecast) {
        console.log('🌧️ [FORECAST] Calculando probabilidad de lluvia para:', forecast);
        
        // Convertir los textos ALTA, MEDIA, BAJA a probabilidades numéricas
        const levels = [
            forecast.lluvia_madrugada,
            forecast.lluvia_mannana,
            forecast.lluvia_tarde,
            forecast.lluvia_noche
        ];
        
        console.log('⏰ [FORECAST] Niveles por período:', {
            madrugada: forecast.lluvia_madrugada,
            mannana: forecast.lluvia_mannana,
            tarde: forecast.lluvia_tarde,
            noche: forecast.lluvia_noche
        });
        
        let totalProb = 0;
        let count = 0;
        
        levels.forEach((level, index) => {
            if (level) {
                const prob = this.convertTextToProbability(level);
                console.log(`📊 [FORECAST] Período ${index}: ${level} = ${prob}%`);
                totalProb += prob;
                count++;
            }
        });
        
        const avgProb = count > 0 ? Math.round(totalProb / count) : 0;
        console.log(`📈 [FORECAST] Probabilidad promedio calculada: ${avgProb}%`);
        
        return avgProb;
    }

    convertTextToProbability(text) {
        if (!text) return 0;
        
        const level = text.toUpperCase();
        switch (level) {
            case 'ALTA': return 80;
            case 'MEDIA': return 50;
            case 'BAJA': return 20;
            default: return 0;
        }
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

    getDayName(date) {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[date.getDay()];
    }
}

// Instancia global
const forecastsManager = new ForecastsManager();