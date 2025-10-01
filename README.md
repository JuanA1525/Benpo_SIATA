# 🌦️ SIATA Dashboard - Benpo

Sistema moderno de visualización de datos meteorológicos del SIATA (Sistema de Alerta Temprana del Valle de Aburrá).

## ✨ Características

### 🎯 Funcionalidades Principales

- **📊 Pronósticos por Zonas**: Selector interactivo tipo SIATA con iconos dinámicos para probabilidades de lluvia
- **🗺️ Mapa de Estaciones**: Visualización interactiva de todas las estaciones meteorológicas
- **🔥 Heatmaps**: Mapas de calor de temperatura y humedad con controles intuitivos
- **📱 Diseño Responsivo**: Interfaz moderna que se adapta a todos los dispositivos

### 🌡️ Pronósticos Inteligentes

- **Iconos Dinámicos**: 🌧️ (Alta), 🌦️ (Media), 🌤️ (Baja probabilidad)
- **Temperaturas**: Máximas y mínimas con iconos 🌡️ y ❄️
- **Datos Horarios**: Precipitación detallada por horas
- **Actualizaciones**: Datos en tiempo real del SIATA

### 🗺️ Mapa Interactivo

- **Estaciones**: Marcadores personalizados con información completa
- **Heatmap de Temperatura**: Por defecto al cargar
- **Heatmap de Humedad**: Intercambiable con un clic
- **Popups Informativos**: Datos completos de cada estación

## 🚀 Tecnologías

### Backend

- **Flask**: Framework web Python
- **PostgreSQL**: Base de datos robusta
- **SIATA API**: Conexión directa con datos oficiales
- **Docker**: Contenedorización completa

### Frontend

- **JavaScript Vanilla**: Sin frameworks pesados
- **Leaflet**: Mapas interactivos
- **CSS Moderno**: Gradientes, animaciones y glassmorphism
- **Responsive Design**: Mobile-first approach

## 🏃‍♂️ Instalación y Uso

### Prerrequisitos

- Docker y Docker Compose
- Puerto 80 y 5000 disponibles

### Lanzar la Aplicación

```bash
# Clonar y navegar al directorio
cd benpo_siata

# Construir y lanzar todos los servicios
docker-compose up --build

# La aplicación estará disponible en:
# Frontend: http://localhost
# Backend API: http://localhost:5000
```

### Desarrollo Local

```bash
# Backend
cd backend
pip install -r requirements.txt
python app.py

# Frontend
cd frontend
# Servir con cualquier servidor web local
python -m http.server 8000
```

## 📱 Uso de la Interfaz

### Pronósticos

1. **Selecciona un Municipio**: Click en las tarjetas coloridas con iconos
2. **Visualiza Datos**: Temperaturas, probabilidades y lluvia horaria
3. **Navega**: Botón "← Volver" para regresar al selector

### Mapa de Estaciones

1. **Explora el Mapa**: Zoom y navegación libre
2. **Heatmaps**:
   - 🌡️ Temperatura (por defecto)
   - 💧 Humedad (intercambiable)
   - ❌ Limpiar (quitar heatmap)
3. **Estaciones**: Click en marcadores para información detallada

## 🏗️ Arquitectura

```
benpo_siata/
├── backend/               # API Flask
│   ├── app.py            # Aplicación principal
│   ├── api/routes.py     # Endpoints REST
│   ├── etl/              # Colección de datos SIATA
│   └── database/         # Gestión PostgreSQL
├── frontend/             # Interfaz web
│   ├── index.html        # HTML principal
│   ├── css/style_new.css # Estilos modernos
│   ├── forecasts.js      # Pronósticos interactivos
│   ├── map.js           # Mapa y heatmaps
│   └── api.js           # Cliente API
└── docker-compose.yml   # Orquestación completa
```

## 🎨 Características de Diseño

### Visual Moderno

- **Gradientes**: Colores vibrantes del azul al púrpura
- **Glassmorphism**: Efectos de vidrio esmerilado
- **Animaciones**: Transiciones suaves y micro-interacciones
- **Iconos**: Font Awesome y emojis contextuales

### Experiencia de Usuario

- **Carga Progresiva**: Spinners y estados de carga
- **Feedback Visual**: Hover effects y estados activos
- **Navegación Intuitiva**: Tabs y botones claramente identificados
- **Responsive**: Perfecto en móvil, tablet y desktop

## 📡 API Endpoints

```javascript
GET / api / forecasts; // Todos los pronósticos
GET / api / forecasts / { zone }; // Pronóstico específico
GET / api / stations; // Lista de estaciones
GET / api / stations / { id } / data; // Datos de estación
GET / api / stations / all - data; // Todos los datos actuales
GET / api / health; // Estado del servicio
```

## 🔧 Configuración

### Variables de Entorno

```bash
DATABASE_URL=postgresql://user:pass@postgres:5432/db
FLASK_ENV=development
```

### Puertos

- **Frontend**: 80 (nginx)
- **Backend**: 5000 (Flask)
- **Database**: 5432 (PostgreSQL)

## 🌟 Características Técnicas

### Performance

- **Cache del Browser**: Headers optimizados
- **Lazy Loading**: Carga bajo demanda
- **Optimización CSS**: Selectores eficientes

### Seguridad

- **CORS**: Configurado correctamente
- **Headers**: Security headers habilitados
- **Validación**: Input sanitization

### Monitoreo

- **Health Checks**: Endpoint de estado
- **Logging**: Registro completo de eventos
- **Error Handling**: Manejo robusto de errores

## 🚧 Estado del Proyecto

✅ **Completado**:

- Backend API funcional
- Frontend moderno y responsivo
- Integración con SIATA
- Heatmaps interactivos
- Docker deployment

🔄 **En Desarrollo**:

- Alertas en tiempo real
- Datos históricos
- Exportación de datos

## 👥 Contribución

Este es un proyecto educativo desarrollado para demostrar integración con APIs meteorológicas y visualización de datos geoespaciales.

## 📄 Licencia

Proyecto académico - Valle de Aburrá, Colombia 🇨🇴

---

**Desarrollado con ❤️ para el Valle de Aburrá**
