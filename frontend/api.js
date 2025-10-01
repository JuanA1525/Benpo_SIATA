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

    // Obtener todas las estaciones
    async getStations() {
        return await this.get('/stations');
    }

    // Obtener datos de una estación específica
    async getStationData(stationId, startDate = null, endDate = null) {
        let endpoint = `/stations/${stationId}/data`;
        const params = new URLSearchParams();
        
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return await this.get(endpoint);
    }

    // Obtener datos para heatmap
    async getHeatmapData(parameter, startDate = null, endDate = null) {
        let endpoint = `/heatmap/${parameter}`;
        const params = new URLSearchParams();
        
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return await this.get(endpoint);
    }

    // Obtener estadísticas de una estación
    async getStationStats(stationId, parameter, startDate = null, endDate = null) {
        let endpoint = `/stations/${stationId}/stats/${parameter}`;
        const params = new URLSearchParams();
        
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return await this.get(endpoint);
    }
}

// Instancia global del cliente API
const apiClient = new ApiClient();