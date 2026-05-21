CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS clientes_ubicacion (
    cliente_id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    ultima_compra DATE NOT NULL,
    monto_anual NUMERIC(12, 2) NOT NULL,
    moneda CHAR(3) NOT NULL,
    coordenadas GEOMETRY(Point, 4326) NOT NULL
);

CREATE INDEX idx_clientes_coordenadas ON clientes_ubicacion USING gist(coordenadas);

CLUSTER clientes_ubicacion USING idx_clientes_coordenadas;