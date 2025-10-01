<div align="center">

# 🌦️ SIATA Dashboard - Benpo
**Visualización y análisis de datos meteorológicos (pronósticos + observaciones de estaciones SIATA) para el Valle de Aburrá.**

![Estado](https://img.shields.io/badge/status-activo-success) ![Stack](https://img.shields.io/badge/stack-Flask%20|%20PostgreSQL%20|%20Leaflet-green) ![License](https://img.shields.io/badge/uso-académico-lightgrey)

</div>

## ✨ Características Principales (Resumen Rápido)
| Tipo | Descripción |
|------|------------|
| Pronósticos | Vista interactiva multi-zona (13 zonas WRF) con temperaturas y segmentos de lluvia |
| Estaciones | Marcadores dinámicos con tooltips y estado de datos recientes |
| Heatmaps | Parámetro seleccionable, agregación (mean/max/min), interpolación opcional SciPy |
| Histórico | Panel lateral filtrable (horas o rango), métricas múltiples, agregación por intervalos |
| Calidad | Limpieza -999, control de frescura, prevención de duplicados |
| UI/UX | Tema verde accesible, leyendas dinámicas, ayuda contextual, toasts y loader |

---

## 1. Resumen Ejecutivo
Plataforma modular que ingesta datos SIATA, los normaliza y expone vía API REST para una interfaz geoespacial y temporal. Incluye interpolación espacial y agregación temporal cliente, preparada para ampliaciones (alertas, métricas derivadas, exportaciones).

## 2. Objetivos
1. Integrar pronósticos y mediciones en un modelo consistente.
2. Entregar visualización rápida y configurable (mapa + heatmaps + histórico).
3. Garantizar que sólo datos limpios y recientes impulsen el análisis.
4. Servir de base extensible para analítica futura.

## 3. Arquitectura Lógica
```mermaid
flowchart LR
  subgraph SIATA[Fuentes SIATA]
    A[WRF zona JSON] --> ETL
    B[Metadatos estaciones] --> ETL
    C[Mediciones estación JSON] --> ETL
  end
  ETL[[Scheduler ETL (APScheduler)]] --> DB[(PostgreSQL)]
  DB --> API[(Flask API)]
  API --> UI[Frontend Web (Leaflet + JS)]
  UI --> Usuario[Usuario Final]
```

## 1. Resumen Ejecutivo
Este sistema consolida datos externos (pronósticos WRF y mediciones de estaciones SIATA), los normaliza y los expone mediante una API REST y una interfaz web interactiva con mapas, heatmaps interpolados y análisis histórico por estación. Está diseñado para ser extensible, transparente y fácil de desplegar (Docker / contenedores).

## 2. Objetivos Principales
1. Centralizar pronósticos y mediciones heterogéneas en una base relacional confiable.
2. Ofrecer visualización geoespacial (Leaflet + heatmaps) y temporal (panel histórico con agregaciones por intervalo).
3. Asegurar calidad de datos: limpieza de valores centinela, control de frescura y de duplicados.
4. Proveer una API clara reutilizable para futuras integraciones (p.ej. analítica avanzada o alertas).

### Flujo de Datos
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

## 24. Apéndice: Tabla Rápida de Endpoints
| Endpoint | Método | Descripción Breve |
|----------|--------|-------------------|
| `/forecasts` | GET | Pronósticos agrupados |
| `/forecasts/<zona>` | GET | Pronóstico zona específica |
| `/stations` | GET | Estaciones activas |
| `/stations/all-data` | GET | Últimas mediciones todas |
| `/stations/<id>/data` | GET | Última medición estación |
| `/stations/<id>/history` | GET | Histórico filtrable |
| `/heatmap` | GET | Puntos agregados heatmap |
| `/heatmap/interpolate` | GET | Interpolación espacial |
| `/health` | GET | Salud del servicio |

> Parámetros clave: `parameter` (temperature|humidity|pressure|wind_speed|precipitation), `agg` (mean|max|min), `hours_back` o `start_date`/`end_date`.
- Datos: SIATA (Sistema de Alerta Temprana del Valle de Aburrá)
- Desarrollo: Benpo SIATA Dashboard

---
**Hecho con enfoque en claridad, extensibilidad y visualización ambiental.**

> ¿Necesitas un diagrama adicional (infra cloud / secuencia)? Abre un issue o extiéndelo fácilmente.
