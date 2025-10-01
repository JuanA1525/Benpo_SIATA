class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.stationsData = {};
    }

    initMap() {
        // Inicializar mapa centrado en Medellín
        this.map = L.map('map').setView([6.2442, -75.5812], 11);

        // Agregar capa de OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Cargar datos de estaciones
        this.loadStationsData();
    }

    async loadStationsData() {
        try {
            const response = await apiClient.getAllStationsData();
            if (response.success) {
                this.stationsData = response.data;
                this.addStationsToMap();
            } else {
                console.error('Error loading stations data:', response.error);
            }
        } catch (error) {
            console.error('Error loading stations data:', error);
        }
    }

    addStationsToMap() {
        // Limpiar marcadores existentes
        this.clearMarkers();

        Object.keys(this.stationsData).forEach(stationId => {
            const stationData = this.stationsData[stationId];
            if (stationData.info) {
                const marker = this.createStationMarker(stationData);
                if (marker) {
                    this.markers.push(marker);
                    marker.addTo(this.map);
                }
            }
        });
    }

    createStationMarker(stationData) {
        const info = stationData.info;
        const lat = info.latitud;
        const lng = info.longitud;

        if (!lat || !lng) return null;

        const marker = L.marker([lat, lng]);

        // Crear popup con información de la estación
        const popupContent = this.createPopupContent(stationData);
        marker.bindPopup(popupContent);

        return marker;
    }

    createPopupContent(stationData) {
        const info = stationData.info;
        const data = stationData;

        let content = `
            <div class="station-popup">
                <h3>${info.nombre}</h3>
                <p><strong>Ciudad:</strong> ${info.ciudad}</p>
                <p><strong>Barrio:</strong> ${info.barrio}</p>
                <p><strong>Código:</strong> ${info.codigo}</p>
        `;

        // Agregar datos de sensores si están disponibles
        if (data.t && data.t !== '-999') {
            content += `<p><strong>Temperatura:</strong> ${data.t}°C</p>`;
        }
        if (data.h && data.h !== '-999') {
            content += `<p><strong>Humedad:</strong> ${data.h}%</p>`;
        }
        if (data.p && data.p !== '-999') {
            content += `<p><strong>Presión:</strong> ${data.p} hPa</p>`;
        }
        if (data.p1h) {
            content += `<p><strong>Lluvia 1h:</strong> ${data.p1h} mm</p>`;
        }
        if (data.p24h) {
            content += `<p><strong>Lluvia 24h:</strong> ${data.p24h} mm</p>`;
        }

        // Formato alternativo para algunos sensores
        if (data['1h']) {
            content += `<p><strong>Lluvia 1h:</strong> ${data['1h']} mm</p>`;
        }
        if (data['24h']) {
            content += `<p><strong>Lluvia 24h:</strong> ${data['24h']} mm</p>`;
        }

        content += `
                <p><strong>Última actualización:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
            </div>
        `;

        return content;
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