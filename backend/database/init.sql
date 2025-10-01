-- Crear base de datos y tablas para SIATA

CREATE TABLE IF NOT EXISTS estaciones (
    codigo INTEGER PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    latitud DECIMAL(10, 7) NOT NULL,
    longitud DECIMAL(10, 7) NOT NULL,
    ciudad VARCHAR(100),
    comuna VARCHAR(100),
    subcuenca VARCHAR(100),
    barrio VARCHAR(100),
    valor INTEGER,
    red VARCHAR(50),
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mediciones (
    id SERIAL PRIMARY KEY,
    estacion_codigo INTEGER REFERENCES estaciones(codigo),
    date_timestamp BIGINT NOT NULL,
    fecha_medicion TIMESTAMP,
    t DECIMAL(6, 3),
    h DECIMAL(6, 3),
    p DECIMAL(8, 3),
    ws DECIMAL(6, 3),
    wd DECIMAL(6, 3),
    p10m DECIMAL(8, 5),
    p1h DECIMAL(8, 5),
    p24h DECIMAL(8, 5),
    is_valid BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pronosticos (
    id SERIAL PRIMARY KEY,
    zona VARCHAR(50) NOT NULL,
    date_update VARCHAR(20),
    fecha VARCHAR(20) NOT NULL,
    temperatura_maxima INTEGER,
    temperatura_minima INTEGER,
    lluvia_madrugada VARCHAR(10),
    lluvia_mannana VARCHAR(10),
    lluvia_tarde VARCHAR(10),
    lluvia_noche VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_mediciones_estacion_fecha ON mediciones(estacion_codigo, fecha_medicion);
CREATE INDEX IF NOT EXISTS idx_mediciones_fecha ON mediciones(fecha_medicion);
CREATE INDEX IF NOT EXISTS idx_pronosticos_zona_fecha ON pronosticos(zona, fecha);
CREATE INDEX IF NOT EXISTS idx_estaciones_activa ON estaciones(activa);

-- Insertar datos de prueba (opcional)
INSERT INTO estaciones (codigo, nombre, latitud, longitud, ciudad, activa)
VALUES (999, 'Estacion Test', 6.2442, -75.5812, 'Medellin', true)
ON CONFLICT (codigo) DO NOTHING;