class ApiClient {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
    }

    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Obtener pronósticos de todas las zonas
    async getForecasts() {
        return await this.get('/forecasts');
    }

    // Obtener pronóstico de una zona específica
    async getZoneForecast(zone) {
        return await this.get(`/forecasts/${zone}`);
    }

    // Obtener todas las estaciones
    async getStations() {
        return await this.get('/stations');
    }

    // Obtener datos de una estación específica
    async getStationData(stationId) {
        return await this.get(`/stations/${stationId}/data`);
    }

    // Obtener datos de todas las estaciones
    async getAllStationsData() {
        return await this.get('/stations/all-data');
    }

    // Histórico de una estación (filtros opcionales)
    async getStationHistory(stationId, {hoursBack, startDate, endDate, metrics} = {}) {
        const params = new URLSearchParams();
        if (hoursBack) params.append('hours_back', hoursBack);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        // metrics filtrado en frontend; el backend devuelve todas las columnas
        return await this.get(`/stations/${stationId}/history?${params.toString()}`);
    }

    // Health check
    async healthCheck() {
        return await this.get('/health');
    }

    // Heatmap raw aggregated points
    async getHeatmapData(parameter, startDate, endDate, agg = 'mean') {
        const params = new URLSearchParams();
        if (parameter) params.append('parameter', parameter);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (agg) params.append('agg', agg);
        const resp = await this.get(`/heatmap?${params.toString()}`);
        if (resp && resp.success) {
            return resp.points || [];
        }
        return [];
    }
}

// Instancia global del cliente API
const apiClient = new ApiClient();