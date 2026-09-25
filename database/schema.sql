CREATE DATABASE IF NOT EXISTS cafe_chanchamayo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cafe_chanchamayo;

CREATE TABLE IF NOT EXISTS usuarios (
  id CHAR(36) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('ADMINISTRADOR', 'PRODUCTOR') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
);

CREATE TABLE IF NOT EXISTS productores (
  id CHAR(36) NOT NULL,
  usuario_id CHAR(36) NULL,
  nombre VARCHAR(150) NOT NULL,
  documento_identidad VARCHAR(15) NOT NULL,
  telefono VARCHAR(20) NULL,
  organizacion VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_productores_documento (documento_identidad),
  UNIQUE KEY uq_productores_usuario (usuario_id),
  CONSTRAINT fk_productores_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
);

CREATE TABLE IF NOT EXISTS parcelas (
  id CHAR(36) NOT NULL,
  productor_id CHAR(36) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  distrito VARCHAR(80) NOT NULL,
  localidad VARCHAR(120) NULL,
  area_hectareas DECIMAL(10, 2) NOT NULL,
  altitud_msnm INT NULL,
  latitud DECIMAL(9, 6) NULL,
  longitud DECIMAL(9, 6) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_parcelas_productor_nombre (productor_id, nombre),
  KEY idx_parcelas_productor (productor_id),
  CONSTRAINT fk_parcelas_productor FOREIGN KEY (productor_id) REFERENCES productores (id)
);

CREATE TABLE IF NOT EXISTS lotes (
  id CHAR(36) NOT NULL,
  codigo VARCHAR(32) NOT NULL,
  parcela_id CHAR(36) NOT NULL,
  fecha_cosecha DATE NOT NULL,
  cantidad_kg DECIMAL(10, 2) NOT NULL,
  variedad VARCHAR(80) NOT NULL,
  observaciones VARCHAR(500) NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'REGISTRADO',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lotes_codigo (codigo),
  KEY idx_lotes_parcela (parcela_id),
  CONSTRAINT fk_lotes_parcela FOREIGN KEY (parcela_id) REFERENCES parcelas (id)
);

CREATE TABLE IF NOT EXISTS analisis_lotes (
  id CHAR(36) NOT NULL,
  lote_id CHAR(36) NOT NULL,
  estrategia VARCHAR(40) NOT NULL,
  clasificacion VARCHAR(20) NOT NULL,
  resumen VARCHAR(1000) NOT NULL,
  observaciones JSON NOT NULL,
  confianza VARCHAR(10) NOT NULL,
  proveedor VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_analisis_lote (lote_id, created_at),
  CONSTRAINT fk_analisis_lote FOREIGN KEY (lote_id) REFERENCES lotes (id)
);
