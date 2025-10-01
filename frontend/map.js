class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.stationsData = {};
        this.heatmapLayer = null;
        this.currentHeatmapType = 'temperature';
        this.currentRawPoints = [];
        this.interpolated = false;
        this.lastHeatmapMeta = {};
    }

    initMap() {
        this.map = L.map('map').setView([6.2442, -75.5812], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        this.createHeatmapControls();
        this.loadStationsData();
    }

    createHeatmapControls() {
        const today = new Date();
        const ymd = d => d.toISOString().split('T')[0];
        const endDefault = ymd(today);
        const startDefault = ymd(new Date(today.getTime() - 6 * 3600 * 1000));
        const controlsHTML = `
            <div class="heatmap-controls">
                <h3>🗺️ Heatmap & Estaciones</h3>
                <div class="control-section form-grid">
                    <label>Parámetro
                        <select id="hm-parameter" class="input-select">
                            <option value="temperature">Temperatura (°C)</option>
                            <option value="humidity">Humedad (%)</option>
                            <option value="precipitation">Precipitación (mm 1h)</option>
                            <option value="pressure">Presión (hPa)</option>
                            <option value="wind_speed">Viento (m/s)</option>
                        </select>
                    </label>
                    <label>Agregación
                        <select id="hm-agg" class="input-select">
                            <option value="mean">Promedio</option>
                            <option value="max">Máx</option>
                            <option value="min">Mín</option>
                        </select>
                    </label>
                </div>
                <div class="control-section form-grid">
                    <label>Horas atrás
                        <input id="hm-hours-back" class="input-number" type="number" min="1" max="48" placeholder="6" />
                    </label>
                    <label>Inicio
                        <input id="hm-start-date" class="input-date" type="date" value="${startDefault}" />
                    </label>
                    <label>Fin
                        <input id="hm-end-date" class="input-date" type="date" value="${endDefault}" />
                    </label>
                </div>
                <div class="control-section form-grid small-cols">
                    <label class="checkbox-inline">
                        <input id="hm-interpolate" type="checkbox" /> Interpolar
                    </label>
                    <label class="checkbox-inline">
                        <input id="hm-toggle-markers" type="checkbox" checked /> Marcadores
                    </label>
                </div>
                <div class="control-section buttons-row">
                    <button class="heatmap-btn" onclick="mapManager.generateAdvancedHeatmap()">⚡ Generar</button>
                    <button class="heatmap-btn" onclick="mapManager.showQuick('temperature')">🌡️</button>
                    <button class="heatmap-btn" onclick="mapManager.showQuick('humidity')">💧</button>
                    <button class="heatmap-btn clear" onclick="mapManager.clearHeatmap()">❌</button>
                </div>
                <div class="control-section">
                    <button class="control-btn" onclick="mapManager.refreshData()">🔄 Actualizar Estaciones</button>
                </div>
                <div class="meta-info" id="hm-meta" style="display:none;"></div>
                <div id="heatmap-legend" class="heatmap-legend" style="display:none;">
                    <h4>Leyenda</h4>
                    <div class="legend-gradient"></div>
                    <div class="legend-labels">
                        <span class="legend-min"></span>
                        <span class="legend-max"></span>
                    </div>
                </div>
            </div>`;
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
            const response = await apiClient.getAllStationsData();
            if (response.success) {
                this.stationsData = response.data;
                this.addStationsToMap();
                this.showQuick('temperature');
            } else {
                this.showHeatmapMessage('Error al cargar estaciones');
            }
        } catch (e) {
            console.error(e);
            this.showHeatmapMessage('Error conexión backend');
        }
    }

    addStationsToMap() {
        this.clearMarkers();
        if (!this.stationsData || typeof this.stationsData !== 'object') return;
        Object.keys(this.stationsData).forEach(id => {
            const st = this.stationsData[id];
            if (st && st.info) {
                const marker = this.createStationMarker(st);
                if (marker) {
                    this.markers.push(marker);
                    marker.addTo(this.map);
                }
            }
        });
    }

    createStationMarker(stationData) {
        const info = stationData.info;
        if (!info.latitud || !info.longitud) return null;
        const hasTemp = stationData.t != null;
        const hasHumidity = stationData.h != null;
        const hasRain = stationData.p1h != null;
        let iconColor = '#3498db';
        if (hasTemp && hasHumidity && hasRain) iconColor = '#27ae60';
        else if (hasTemp || hasHumidity) iconColor = '#f39c12';
        const customIcon = L.divIcon({
            className: 'custom-station-marker',
            html: `<div style="background-color:${iconColor};width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16,16], iconAnchor:[8,8]
        });
        const marker = L.marker([info.latitud, info.longitud], {icon: customIcon});
        marker.bindPopup(this.createPopupContent(stationData));
        return marker;
    }

    createPopupContent(stationData) {
        const info = stationData.info;
        const fmt = (v, suf='') => (v==null||isNaN(v)? '—' : `${v}${suf}`);
        return `<div class="station-popup">
            <h3>${info.nombre}</h3>
            <p><strong>📍 Ciudad:</strong> ${info.ciudad||''}</p>
            <p><strong>🔢 Código:</strong> ${info.codigo}</p>
            <hr/>
            <p><strong>🌡️ Temp:</strong> ${fmt(stationData.t,'°C')}</p>
            <p><strong>💧 Humedad:</strong> ${fmt(stationData.h,'%')}</p>
            <p><strong>🌫️ Presión:</strong> ${fmt(stationData.p,' hPa')}</p>
            <p><strong>🌧️ Lluvia 1h:</strong> ${fmt(stationData.p1h,' mm')}</p>
            <p><strong>🌧️ Lluvia 24h:</strong> ${fmt(stationData.p24h,' mm')}</p>
            <p><strong>⏰ Actualización:</strong> ${stationData.timestamp? new Date(stationData.timestamp).toLocaleString(): '—'}</p>
        </div>`;
    }

    showQuick(type) {
        this.currentHeatmapType = type;
        this.interpolated = false;
        this.clearHeatmap();
        const heatmapData = this.generateQuickHeatmapData(type);
        if (heatmapData.length === 0) {
            this.showHeatmapMessage('Sin datos para heatmap rápido');
            return;
        }
        this.renderHeatLayer(heatmapData, type, { dynamicLegend: true });
    }

    async generateAdvancedHeatmap() {
        try {
            const parameter = document.getElementById('hm-parameter').value;
            const agg = document.getElementById('hm-agg').value;
            const hoursBack = document.getElementById('hm-hours-back').value;
            const startDate = document.getElementById('hm-start-date').value;
            const endDate = document.getElementById('hm-end-date').value;
            const interpolate = document.getElementById('hm-interpolate').checked;
            const showMarkers = document.getElementById('hm-toggle-markers').checked;
            if (!showMarkers) this.clearMarkers(); else if (this.markers.length===0) this.addStationsToMap();
            this.showHeatmapMessage('Generando...');
            this.currentHeatmapType = parameter; this.interpolated = interpolate; this.clearHeatmap();
            const qs = new URLSearchParams();
            qs.append('parameter', parameter); qs.append('agg', agg);
            if (hoursBack) qs.append('hours_back', hoursBack); else { if (startDate) qs.append('start_date', startDate); if (endDate) qs.append('end_date', endDate);}
            const endpoint = interpolate ? `/api/heatmap/interpolate?${qs.toString()}&grid_size=55` : `/api/heatmap?${qs.toString()}`;
            const resp = await fetch(endpoint);
            if (!resp.ok) throw new Error('HTTP '+resp.status);
            const json = await resp.json();
            if (!json.success) throw new Error(json.error||'Error backend');
            const points = interpolate ? (json.interpolated_points||[]) : (json.points||[]);
            if (points.length === 0) { this.showHeatmapMessage('Sin puntos'); return; }
            this.currentRawPoints = points;
            const values = points.map(p=>p.value).filter(v=>typeof v==='number');
            const min = Math.min(...values), max = Math.max(...values);
            const layerData = points.map(p=>[p.latitude, p.longitude, this.minMaxNormalize(p.value, min, max)]);
            this.renderHeatLayer(layerData, parameter, {min, max, dynamicLegend:true});
            this.updateMetaInfo({parameter, agg, count: points.length, min, max, interpolate});
        } catch (e) {
            console.error(e);
            this.showHeatmapMessage('Error generando heatmap');
        }
    }

    updateMetaInfo(meta) {
        this.lastHeatmapMeta = meta;
        const el = document.getElementById('hm-meta');
        if (!el) return; el.style.display='block';
        el.innerHTML = `<div><strong>${this.prettyParam(meta.parameter)}</strong> (${meta.agg}) ${meta.interpolate? '• Interpolado':''}</div>
                        <div>Puntos: ${meta.count}</div>
                        <div>Rango: ${meta.min.toFixed(2)} – ${meta.max.toFixed(2)} ${this.getUnits(meta.parameter)}</div>`;
    }

    minMaxNormalize(v,min,max){ if(max===min) return .5; return (v-min)/(max-min); }

    generateQuickHeatmapData(type){
        const data=[]; if(!this.stationsData) return data;
        Object.values(this.stationsData).forEach(st=>{
            if(!st||!st.info) return; const lat=st.info.latitud, lon=st.info.longitud; if(!lat||!lon) return;
            let val=null; switch(type){
                case 'temperature': val=st.t!=null? parseFloat(st.t): null; break;
                case 'humidity': val=st.h!=null? parseFloat(st.h): null; break;
                case 'precipitation': val=st.p1h!=null? parseFloat(st.p1h): null; break;
                case 'pressure': val=st.p!=null? parseFloat(st.p): null; break;
                case 'wind_speed': val=st.ws!=null? parseFloat(st.ws): null; break;
                default: return;
            }
            if(val!=null && !isNaN(val)) data.push([parseFloat(lat), parseFloat(lon), this.normalizeForType(val,type)]);
        });
        return data;
    }

    normalizeForType(value,type){
        const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
        switch(type){
            case 'temperature': return clamp((value-15)/20,0,1);
            case 'humidity': return clamp(value/100,0,1);
            case 'precipitation': return clamp(value/30,0,1);
            case 'pressure': return clamp((value-900)/130,0,1);
            case 'wind_speed': return clamp(value/15,0,1);
            default: return .5;
        }
    }

    renderHeatLayer(data,type,opts={}){
        if(typeof L.heatLayer !== 'function'){ this.showHeatmapMessage('Leaflet.heat no disponible'); return; }
        this.clearHeatmap();
        this.heatmapLayer = L.heatLayer(data, { radius: this.interpolated? 30:45, blur: 28, maxZoom: 15, gradient: this.getHeatmapGradient(type)}).addTo(this.map);
        if(opts.dynamicLegend){ this.showDynamicLegend(type, opts.min, opts.max); }
    }

    showDynamicLegend(type,min,max){
        const legend=document.getElementById('heatmap-legend'); if(!legend) return; legend.style.display='block';
        if(min==null||max==null){
            switch(type){
                case 'temperature': min=15; max=35; break;
                case 'humidity': min=0; max=100; break;
                case 'precipitation': min=0; max=30; break;
                case 'pressure': min=900; max=1030; break;
                case 'wind_speed': min=0; max=15; break;
                default: min=0; max=1; break;}
        }
        const gradient=this.getHeatmapGradient(type); const colors=Object.values(gradient);
         legend.querySelector('.legend-gradient').style.background=`linear-gradient(to right, ${colors.join(', ')})`;
        legend.querySelector('.legend-min').textContent=`${min.toFixed(1)} ${this.getUnits(type)}`;
        legend.querySelector('.legend-max').textContent=`${max.toFixed(1)} ${this.getUnits(type)}`;
    }

    getUnits(type){ return {temperature:'°C', humidity:'%', precipitation:'mm', pressure:'hPa', wind_speed:'m/s'}[type]||''; }
    prettyParam(type){ return {temperature:'Temperatura', humidity:'Humedad', precipitation:'Precipitación', pressure:'Presión', wind_speed:'Viento'}[type]||type; }

    getHeatmapGradient(type){
        switch(type){
            case 'temperature': return {0.0:'#0000ff',0.25:'#00bfff',0.5:'#00ff6e',0.7:'#ffff00',0.9:'#ff8000',1.0:'#ff0000'};
            case 'humidity': return {0.0:'#8B4513',0.2:'#DAA520',0.4:'#FFFF66',0.6:'#00FF66',0.8:'#3399FF',1.0:'#0000FF'};
            case 'precipitation': return {0.0:'#ffffff',0.2:'#b3e5fc',0.4:'#4fc3f7',0.6:'#0288d1',0.8:'#01579b',1.0:'#002f6c'};
            case 'pressure': return {0.0:'#4a148c',0.3:'#6a1b9a',0.5:'#1565c0',0.7:'#26a69a',0.85:'#ffee58',1.0:'#ef6c00'};
            case 'wind_speed': return {0.0:'#e0f7fa',0.2:'#80deea',0.4:'#26c6da',0.6:'#00acc1',0.8:'#00838f',1.0:'#004d40'};
            default: return {0.0:'#ffffff',1.0:'#000000'};
        }
    }

    showHeatmapMessage(message){
        const messageDiv=document.createElement('div');
        messageDiv.className='heatmap-message';
        messageDiv.textContent=message;
        messageDiv.style.cssText='position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.8);color:#fff;padding:10px;border-radius:5px;z-index:1000;';
        document.getElementById('map').appendChild(messageDiv);
        setTimeout(()=>messageDiv.remove(),3000);
    }

    clearHeatmap(){
        if(this.heatmapLayer){ this.map.removeLayer(this.heatmapLayer); this.heatmapLayer=null; }
        const legend=document.getElementById('heatmap-legend'); if(legend) legend.style.display='none';
    }
    clearMarkers(){ this.markers.forEach(m=>this.map.removeLayer(m)); this.markers=[]; }
    refreshData(){ this.loadStationsData(); }
}

const mapManager = new MapManager();