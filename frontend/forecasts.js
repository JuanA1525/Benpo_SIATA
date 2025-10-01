// Manejo de pronósticos por zona

class ForecastsManager {
    constructor() {
        this.forecastsData = {};
        this.zones = [
            'sabaneta', 'palmitas', 'medOriente', 'medOccidente', 'medCentro',
            'laestrella', 'itagui', 'girardota', 'envigado', 'copacabana',
            'caldas', 'bello', 'barbosa'
        ];
    }

    async loadForecasts() {
        try {
            console.log('🌦️ Cargando pronósticos...');
            this.showLoading();

            const response = await ApiClient.getPronosticos();
            if (response.success) {
                this.forecastsData = response.data;
                this.renderForecasts();
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
        const container = document.getElementById('forecastContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2">Cargando pronósticos...</p>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById('forecastContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle"></i> ${message}
                </div>
            </div>
        `;
    }

    renderForecasts() {
        const container = document.getElementById('forecastContainer');
        if (!container) return;

        container.innerHTML = '';

        Object.keys(this.forecastsData).forEach(zone => {
            const zoneData = this.forecastsData[zone];
            const zoneElement = this.createZoneElement(zone, zoneData);
            container.appendChild(zoneElement);
        });
    }

    createZoneElement(zone, data) {
        const zoneDiv = document.createElement('div');
        zoneDiv.className = 'forecast-zone';

        const title = document.createElement('h3');
        title.textContent = this.formatZoneName(zone);
        zoneDiv.appendChild(title);

        if (data.pronostico && data.pronostico.length > 0) {
            data.pronostico.forEach((forecast, index) => {
                const dayElement = this.createDayElement(forecast, index === 0 ? 'Hoy' : 'Mañana');
                zoneDiv.appendChild(dayElement);
            });
        }

        return zoneDiv;
    }

    createDayElement(forecast, dayLabel) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'forecast-day';

        dayDiv.innerHTML = `
            <h4>${dayLabel} - ${forecast.fecha}</h4>
            <div class="temperature-info">
                <span class="temp-max">Máx: ${forecast.temperatura_maxima}°C</span>
                <span class="temp-min">Mín: ${forecast.temperatura_minima}°C</span>
            </div>
            <div class="rain-forecast">
                <div class="rain-period">
                    <span class="period">Madrugada:</span>
                    <span class="rain-level ${forecast.lluvia_madrugada.toLowerCase()}">${forecast.lluvia_madrugada}</span>
                </div>
                <div class="rain-period">
                    <span class="period">Mañana:</span>
                    <span class="rain-level ${forecast.lluvia_mannana.toLowerCase()}">${forecast.lluvia_mannana}</span>
                </div>
                <div class="rain-period">
                    <span class="period">Tarde:</span>
                    <span class="rain-level ${forecast.lluvia_tarde.toLowerCase()}">${forecast.lluvia_tarde}</span>
                </div>
                <div class="rain-period">
                    <span class="period">Noche:</span>
                    <span class="rain-level ${forecast.lluvia_noche.toLowerCase()}">${forecast.lluvia_noche}</span>
                </div>
            </div>
        `;

        return dayDiv;
    }

    formatZoneName(zone) {
        const nameMap = {
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
        return nameMap[zone] || zone;
    }
}

// Instancia global
const forecastsManager = new ForecastsManager();