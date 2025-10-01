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
        if (this.map) {
            // Already initialized, just ensure size
            setTimeout(()=> this.map.invalidateSize(), 150);
            return;
        }
        this.map = L.map('map').setView([6.2442, -75.5812], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        this.createHeatmapControls();
        this.loadStationsData();
        this.injectRefreshOverlay();
    }

    createHeatmapControls() {
        const today = new Date();
        const ymd = d => d.toISOString().split('T')[0];
        const endDefault = ymd(today);
        const startDefault = ymd(new Date(today.getTime() - 6 * 3600 * 1000));
        const panel = document.getElementById('map-controls');
        if (!panel) return;
        panel.innerHTML = `
            <div class="heatmap-controls standalone">
                <div class="panel-title">
                    <h3>🗺️ Heatmap</h3>
                    <button type="button" class="help-btn" onclick="mapManager.toggleHelp()" aria-expanded="false" aria-controls="heatmap-help" title="Cómo usar el heatmap">?</button>
                </div>
                <div class="form-grid">
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
                <div class="form-grid">
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
                <div class="form-grid small-cols">
                    <label class="checkbox-inline">
                        <input id="hm-interpolate" type="checkbox" /> Interpolar
                    </label>
                    <label class="checkbox-inline">
                        <input id="hm-toggle-markers" type="checkbox" checked /> Marcadores
                    </label>
                </div>
                <div class="action-row">
                    <button class="generate-btn" onclick="mapManager.generateAdvancedHeatmap()">Generar Heatmap</button>
                </div>
                <div id="heatmap-help" class="heatmap-help" style="display:none;">
                    <div class="help-header">
                        <h4>¿Cómo funciona?</h4>
                        <button type="button" class="close-help" onclick="mapManager.toggleHelp()" aria-label="Cerrar ayuda">×</button>
                    </div>
                    <ul>
                        <li><strong>Parámetro:</strong> Variable meteorológica a visualizar.</li>
                        <li><strong>Agregación:</strong> Cómo se resume el periodo (promedio / máximo / mínimo).</li>
                        <li><strong>Horas atrás:</strong> Intervalo relativo. Si lo dejas vacío puedes usar fechas Inicio / Fin.</li>
                        <li><strong>Inicio / Fin:</strong> Rango absoluto (YYYY-MM-DD). Ignora Horas atrás si se usa.</li>
                        <li><strong>Interpolar:</strong> Genera una malla continua (más suave pero computacionalmente más costosa).</li>
                        <li><strong>Marcadores:</strong> Muestra / oculta las estaciones sobre el mapa.</li>
                        <li><strong>Generar Heatmap:</strong> Llama a la API y renderiza el resultado. La leyenda muestra el rango real.</li>
                        <li><strong>Leyenda:</strong> Escala de colores dinámicos del mínimo al máximo hallado.</li>
                    </ul>
                    <p class="note">Consejo: Usa menos horas o sin interpolación para respuestas más rápidas.</p>
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
        // Determine marker intensity level
        let level = 1; // default
        if (hasTemp && hasHumidity && hasRain) level = 3; else if (hasTemp || hasHumidity) level = 2;
        const html = `<div class="station-marker level-${level}" data-station-id="${info.id || info.codigo}"></div>`;
        const customIcon = L.divIcon({
            className: 'custom-station-marker',
            html,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        const marker = L.marker([info.latitud, info.longitud], { icon: customIcon });
        // Remove popup binding, we will handle hover tooltip
        marker.on('mouseover', () => this.showStationTooltip(marker, stationData));
        marker.on('mouseout', () => this.hideStationTooltip(marker));
        return marker;
    }

    showStationTooltip(marker, stationData) {
        if (!marker._tooltip) {
            const info = stationData.info;
            const fmt = (v, suf = '') => (v == null || isNaN(v) ? '—' : `${v}${suf}`);
            const content = `<h3>${info.nombre}</h3>
                <p><strong>Temp:</strong> ${fmt(stationData.t,'°C')} | <strong>Hum:</strong> ${fmt(stationData.h,'%')}</p>
                <p><strong>Pres:</strong> ${fmt(stationData.p,' hPa')} | <strong>Lluvia 1h:</strong> ${fmt(stationData.p1h,' mm')}</p>
                <p><strong>Act:</strong> ${stationData.timestamp ? new Date(stationData.timestamp).toLocaleTimeString() : '—'}</p>`;
            marker.bindTooltip(content, { direction: 'top', opacity: 1, permanent: false, className: 'station-tooltip', offset: [0, -14] });
        }
        marker.openTooltip();
    }

    hideStationTooltip(marker) {
        if (marker && marker.closeTooltip) marker.closeTooltip();
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
    async refreshData(){
        const btn = document.querySelector('.map-refresh-overlay .refresh-btn');
        if(btn){
            const originalHTML = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<div class="refresh-spinner"></div> Actualizando';
            try {
                const loadPromise = this.loadStationsData();
                const timeout = new Promise(res=> setTimeout(res, 2000));
                await Promise.race([loadPromise, timeout]);
                this.showToast('Estaciones actualizadas ' + new Date().toLocaleTimeString());
            } catch(e){
                this.showToast('Error al actualizar estaciones');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            }
            return;
        }
        // Fallback cuando no existe overlay (ej: antes de inyección)
        try {
            const loadPromise = this.loadStationsData();
            const timeout = new Promise(res=> setTimeout(res, 2000));
            await Promise.race([loadPromise, timeout]);
            this.showToast('Estaciones actualizadas');
        } catch(e) {
            this.showToast('Error al actualizar estaciones');
        }
    }

    injectRefreshOverlay(){
        const mapWrapper = document.querySelector('#map-tab .map-wrapper');
        if(!mapWrapper) return;
        if(mapWrapper.querySelector('.map-refresh-overlay')) return; // already
        const overlay = document.createElement('div');
        overlay.className = 'map-refresh-overlay';
        overlay.innerHTML = `<button class="refresh-btn" onclick="mapManager.refreshData()"><i class="fas fa-sync-alt"></i> Actualizar Estaciones</button>`;
        mapWrapper.appendChild(overlay);
    }

    showToast(message){
        const container = document.getElementById('map-toast-container');
        if(!container) return;
        const toast = document.createElement('div');
        toast.className = 'map-toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(()=>{ toast.remove(); }, 5200);
    }

    toggleHelp(){
        const help = document.getElementById('heatmap-help');
        const btn = document.querySelector('.help-btn');
        if(!help || !btn) return;
        const visible = help.style.display !== 'none';
        if(visible){
            help.style.display = 'none';
            btn.setAttribute('aria-expanded','false');
        } else {
            help.style.display = 'block';
            btn.setAttribute('aria-expanded','true');
            // Scroll into view if panel has scroll
            help.scrollIntoView({behavior:'smooth', block:'start'});
        }
    }
}

const mapManager = new MapManager();