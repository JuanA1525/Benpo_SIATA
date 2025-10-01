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

    // Health check
    async healthCheck() {
        return await this.get('/health');
    }
}

// Instancia global del cliente API
const apiClient = new ApiClient();