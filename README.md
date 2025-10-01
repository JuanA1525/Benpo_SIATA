## Endpoints añadidos / actualizados

Base URL: `http://localhost:5000/api`

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/forecasts` | GET | Pronósticos por zona desde BD |
| `/forecasts/<zona>` | GET | Pronóstico detallado de una zona |
| `/stations` | GET | Listado estaciones activas |
| `/stations/all-data` | GET | Última medición de todas las estaciones (formato compatible con frontend) |
| `/stations/<id>/data` | GET | Última medición de una estación |
| `/stations/<id>/history` | GET | Histórico (params: `hours_back` o `start_date`, `end_date`) |
| `/heatmap` | GET | Puntos agregados para heatmap (`parameter`, `start_date`, `end_date`, `hours_back`, `agg`) |
| `/heatmap/interpolate` | GET | Grilla interpolada (requiere SciPy) |

Parámetros válidos para `parameter`: `temperature`, `humidity`, `pressure`, `wind_speed`, `precipitation`.

## Scheduler / ETL

El ETL se ejecuta cada 10 minutos mediante APScheduler y realiza:
1. Recolección de pronósticos WRF (tabla `pronosticos`).
2. Actualización de metadatos de estaciones (tabla `estaciones`).
3. Recolección de mediciones recientes filtrando:
   - Diferencia horaria > 24h => estación inactiva (no se guarda nueva medición)
   - Diferencia 2–24h => se ignoran mediciones antiguas
   - Valores -999 / outliers (< -900) => se tratan como NULL

Para deshabilitar el scheduler en desarrollo (evitar duplicado con auto-reload):

```
export DISABLE_SCHEDULER=1  # (Linux/macOS)
set DISABLE_SCHEDULER=1     # (Windows CMD)
```

## Plan de despliegue AWS (resumen)

1. Construir imágenes Docker con etiquetas versionadas.
2. Subir a Amazon ECR.
3. Provisionar en ECS Fargate o EC2:
   - Servicio `postgres` recomendado migrar a RDS (PostgreSQL).
   - Servicio `backend` (Flask + ETL scheduler) – variable `DATABASE_URL` apuntando a RDS.
   - Servicio `frontend` servido por Nginx (o migrar a S3 + CloudFront).
4. Programar tareas ETL dedicadas (opcional) usando AWS EventBridge + AWS ECS task si se quisiera desacoplar del backend web.
5. Observabilidad: CloudWatch Logs + métricas custom (pendiente de instrumentar).

Ver sección más abajo (Infraestructura) para detalle completo por fases.

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
<div align="center">

# 🌦️ Benpo SIATA Dashboard
**Plataforma integral para ingestión, limpieza, almacenamiento y visualización interactiva de datos meteorológicos (pronósticos + observaciones de estaciones SIATA) del Valle de Aburrá.**

![Estado](https://img.shields.io/badge/status-activo-success) ![Stack](https://img.shields.io/badge/stack-Flask%20|%20PostgreSQL%20|%20Leaflet-green) ![License](https://img.shields.io/badge/uso-académico-lightgrey)

</div>

## 1. Resumen Ejecutivo
Este sistema consolida datos externos (pronósticos WRF y mediciones de estaciones SIATA), los normaliza y los expone mediante una API REST y una interfaz web interactiva con mapas, heatmaps interpolados y análisis histórico por estación. Está diseñado para ser extensible, transparente y fácil de desplegar (Docker / contenedores).

## 2. Objetivos Principales
1. Centralizar pronósticos y mediciones heterogéneas en una base relacional confiable.
2. Ofrecer visualización geoespacial (Leaflet + heatmaps) y temporal (panel histórico con agregaciones por intervalo).
3. Asegurar calidad de datos: limpieza de valores centinela, control de frescura y de duplicados.
4. Proveer una API clara reutilizable para futuras integraciones (p.ej. analítica avanzada o alertas).

## 3. Arquitectura Lógica
```mermaid
flowchart LR
  subgraph SIATA[SIATA Fuentes Externas]
    A[WRF JSON zona] -->|Pronósticos| ETL
    B[JSON estación] -->|Metadatos| ETL
    C[JSON medición estación] -->|Variables t,h,p,ws,wd, lluvia| ETL
  end
  ETL[[ETL Scheduler\n(APScheduler)]] --> DB[(PostgreSQL)]
  DB --> API[(Flask API)]
  API --> UI[Frontend Web\n(Leaflet + JS)]
  UI --> Usuario[Usuario Final]
```

### Flujo de Datos (resumen)
1. Scheduler (cada 10 min) invoca recolectores.
2. Datos crudos se limpian (-999 → NULL) y se filtra obsolescencia (>2h advertido, >24h descartado).
3. Inserciones idempotentes (verificación por timestamp/estación) evitan duplicados.
4. API expone pronósticos, puntos de estaciones, históricos y heatmaps (agregados e interpolados).
5. Frontend consume endpoints y renderiza mapa dinámico + paneles.

## 4. Stack Tecnológico
| Capa | Tecnología | Uso Principal |
|------|------------|---------------|
| Backend Web | Flask | Endpoints REST y registro de blueprints |
| Datos | PostgreSQL | Persistencia relacional (pronósticos, estaciones, mediciones) |
| Acceso BD | psycopg2 | Conexión y cursores tipo diccionario + transacciones seguras |
| ETL / Scheduling | APScheduler | Tareas recurrentes de ingesta/actualización |
| HTTP Externo | Requests | Descarga robusta de JSON SIATA |
| Ciencia de Datos | NumPy / SciPy | Interpolación espacial (griddata) para heatmaps |
| Limpieza Tiempo | datetime / dateutil | Normalización horaria y cálculo de frescura |
| Frontend | JavaScript Vanilla | Lógica UI sin frameworks pesados |
| Geoespacial | Leaflet + leaflet.heat | Mapa base y capas de densidad térmica |
| UI/Estilos | CSS personalizado (tema verde) | Diseño responsivo, contraste, accesibilidad |
| Contenedores | Docker / Compose | Orquestación local y base para despliegue cloud |

## 5. Fuentes Externas (SIATA)
| Recurso | Ejemplo URL (patrón) | Contenido | Uso Interno |
|---------|----------------------|-----------|-------------|
| Pronóstico WRF por zona | `wrf{zona}.json` | Fecha de actualización, arreglo de días con temperaturas y lluvia en segmentos | Tabla `pronosticos` |
| Metadatos estaciones | `PluviometricaMeteo.json` | Lista estaciones: ubicación, red, atributos | Tabla `estaciones` |
| Medición estación | `{codigo}.json` | Última medición puntual (t, h, p, ws, wd, p1h, p24h, timestamp) | Tabla `mediciones` |

Notas: El timestamp se convierte a UTC naive para almacenamiento; valores -999 y outliers < -900 se convierten a NULL.

## 6. Modelo de Datos (Conceptual Simplificado)
```text
estaciones(codigo PK, nombre, latitud, longitud, ciudad, comuna, subcuenca, barrio, valor, red, activa, updated_at)
pronosticos(id PK, zona, date_update, fecha, temperatura_maxima, temperatura_minima, lluvia_madrugada, lluvia_mannana, lluvia_tarde, lluvia_noche)
mediciones(id PK, estacion_codigo FK->estaciones, date_timestamp, fecha_medicion, t, h, p, ws, wd, p10m, p1h, p24h, is_valid)
```

## 7. Endpoints API Interna
Base: `http://localhost:5000/api`

| Endpoint | Método | Parámetros Clave | Descripción |
|----------|--------|------------------|-------------|
| `/forecasts` | GET | — | Pronósticos agrupados por zona |
| `/forecasts/<zona>` | GET | zona | Pronóstico detallado de una zona |
| `/stations` | GET | — | Estaciones activas (metadatos) |
| `/stations/all-data` | GET | — | Última medición de cada estación (formato optimizado) |
| `/stations/<id>/data` | GET | id | Última medición de una estación |
| `/stations/<id>/history` | GET | `hours_back` o (`start_date`,`end_date`) | Histórico crudo (limit 5000) |
| `/heatmap` | GET | `parameter`, `agg`, ventana temporal | Puntos agregados por estación |
| `/heatmap/interpolate` | GET | + `grid_size` | Interpolación espacial (requiere SciPy) |
| `/health` | GET | — | Estado simple del servicio |

Parámetros válidos `parameter`: `temperature`, `humidity`, `pressure`, `wind_speed`, `precipitation`.
Parámetros válidos `agg`: `mean`, `max`, `min`.

## 8. ETL y Calidad de Datos
| Regla | Propósito |
|-------|-----------|
| -999 / < -900 → NULL | Evitar sesgo en promedios / interpolaciones |
| Duplicados (mismo timestamp y estación) ignorados | Integridad temporal |
| >24h de antigüedad → no se inserta | Estaciones obsoletas |
| 2–24h de desfase → clasificada como antigua | Monitoreo de frescura |
| Conversión de timestamp a UTC naive | Homogeneidad en BD |

## 9. Heatmaps e Interpolación
1. Selección de parámetro y función de agregación.
2. Consulta: se agrupan valores por coordenada (lat, lon) (AVG/MAX/MIN).
3. Interpolación (opcional): grilla regular (`grid_size`, default 40–55) via `scipy.interpolate.griddata` (linear → fallback nearest).
4. Submuestreo para limitar puntos (≈2000) optimizando render.
5. Normalización min-max dinámica para color scale y leyenda.

## 10. Panel Histórico de Estaciones
- Filtros: horas atrás o rango absoluto (fecha inicio/fin).
- Selección múltiple de métricas (t, h, p, ws, p1h, p24h).
- Agregación en cliente por intervalos: 30m, 1h, 3h, 6h, 12h, 24h (promedio + conteo n).
- Tabla con máximo 500 filas post-agrupación para mantener usabilidad.

## 11. Frontend (Módulos Clave)
| Archivo | Rol |
|---------|-----|
| `api.js` | Cliente ligero fetch para endpoints REST |
| `map.js` | Mapa Leaflet, heatmaps, marcadores, tooltips, panel histórico, agregación temporal |
| `forecasts.js` | Render y lógica de vista de pronósticos por zona |
| `app.js` | Gestión de tabs, inicialización general y loader global |
| `css/style_green.css` | Tema visual (paleta verde, accesibilidad, paneles) |

## 12. Diseño UI / UX
- Tema verde de alto contraste + glassmorphism ligero.
- Leyendas dinámicas y tooltips compactos.
- Panel lateral para histórico no obstructivo.
- Ayuda contextual (sección “¿Cómo funciona?” en heatmap).
- Feedback: toasts, spinner de refresco, loader global inicial.

## 13. Despliegue Local Rápido
```bash
# Construir y levantar
docker-compose up --build

# Frontend: http://localhost
# Backend:  http://localhost:5000/api/health
```

Desarrollo sin Docker:
```bash
# Backend
cd backend
pip install -r requirements.txt
python app.py

# Frontend (servidor estático simple)
cd frontend
python -m http.server 8000
```

## 14. Variables de Entorno Clave
| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Conexión PostgreSQL |
| `DISABLE_SCHEDULER` | `1` | Evita iniciar ETL (debug) |
| `FLASK_ENV` | `development` | Modo desarrollo Flask |

Desactivar scheduler (Windows PowerShell / Linux):
```bash
export DISABLE_SCHEDULER=1   # Linux/macOS
set DISABLE_SCHEDULER=1      # Windows CMD
```

## 15. Estrategia de Escalado / Producción (AWS sugerido)
| Componente | Opción Recomendada |
|------------|--------------------|
| Base de datos | Amazon RDS (PostgreSQL) |
| Backend API | ECS Fargate / App Runner |
| Frontend | S3 + CloudFront (estático) o Nginx en ECS |
| ETL | Integrado (actual) o tarea programada ECS + EventBridge |
| Observabilidad | CloudWatch Logs + métricas custom futuras |
| Seguridad | SG restringidos, secretos en AWS SSM / Secrets Manager |

## 16. Consideraciones de Performance
- Interpolación solo bajo demanda (costo computacional moderado).
- Submuestreo de grilla para evitar sobrecarga en Leaflet.
- Límites (5000 filas histórico / 500 filas render) protegen el navegador.
- Agregación cliente reduce densidad temporal.

## 17. Calidad y Robustez
- Limpieza agresiva de outliers.
- Manejo de errores con logging detallado.
- Capa CORS controlada (orígenes configurables si se endurece).
- Estructura modular facilita pruebas unitarias futuras.

## 18. Futuras Mejores (Roadmap sugerido)
- Exportación CSV / GeoJSON de histórico y heatmaps.
- Métricas derivadas (índice de calor, vientos promediados vectorialmente).
- Alertas push (websocket o SSE) para eventos climatológicos.
- Caché de interpolaciones frecuentes.
- Panel analítico con gráficos (Sparkline / líneas comparativas).

## 19. Ejemplos de Uso API (cURL)
```bash
# Pronósticos todas las zonas
curl http://localhost:5000/api/forecasts

# Histórico últimas 12h estación 101
curl "http://localhost:5000/api/stations/101/history?hours_back=12"

# Heatmap humedad promedio últimas 6h interpolado
curl "http://localhost:5000/api/heatmap/interpolate?parameter=humidity&agg=mean&hours_back=6&grid_size=55"
```

## 20. Seguridad Básica Actual
| Aspecto | Estado |
|---------|--------|
| Sanitización path params | Validaciones básicas (zona válida, ids enteros) |
| Inyección SQL | Prevenidas usando parámetros psycopg2 |
| CORS | Abierto (ajustar para prod) |
| Gestión de secretos | Via entorno (centralizar en vault para prod) |

## 21. Limitaciones Conocidas
- Sin autenticación / autorización (no requerida en alcance académico).
- Sin índices avanzados (añadir sobre `mediciones(estacion_codigo, fecha_medicion)` en escala mayor).
- Sin sistema de roles ni auditoría.
- Interpolación bloqueante (podría moverse a tarea asíncrona).

## 22. Licencia y Uso
Proyecto académico orientado a análisis ambiental del Valle de Aburrá. Uso interno / educativo. Añadir licencia formal si se abre al público.

## 23. Créditos
- Datos: SIATA (Sistema de Alerta Temprana del Valle de Aburrá)
- Desarrollo: Benpo SIATA Dashboard

---
**Hecho con enfoque en claridad, extensibilidad y visualización ambiental.**

> ¿Necesitas un diagrama adicional (infra cloud / secuencia)? Abre un issue o extiéndelo fácilmente.
