-- ========================================================
-- VetFlow Schema - Supabase
-- Description: Business management for Vets and Pet Shops
-- ========================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- AMBOS TIPOS (Core Multitenant)
-- ========================================================

-- Table: tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('veterinaria', 'tienda')),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    estado TEXT NOT NULL DEFAULT 'trial' CHECK (estado IN ('trial', 'activo', 'trial_vencido', 'suspendido')),
    trial_inicio TIMESTAMPTZ DEFAULT now(),
    trial_fin TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Table: suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    razon_social TEXT NOT NULL,
    cuit TEXT,
    telefono TEXT,
    email TEXT,
    rubro TEXT,
    contacto TEXT,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Table: products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    nombre TEXT NOT NULL,
    codigo TEXT, -- NUEVO: Código de barras o SKU
    categoria TEXT,
    unidad_medida TEXT,
    stock_actual NUMERIC DEFAULT 0,
    stock_minimo NUMERIC DEFAULT 0,
    precio_venta NUMERIC DEFAULT 0,
    precio_costo NUMERIC DEFAULT 0,
    proveedor_id UUID REFERENCES suppliers(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- SOLO VETERINARIA (Clientes y Mascotas)
-- ========================================================

-- Table: clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    dni TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Table: pets
CREATE TABLE pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    nombre TEXT NOT NULL,
    especie TEXT NOT NULL,
    raza TEXT,
    fecha_nacimiento DATE,
    sexo TEXT CHECK (sexo IN ('M', 'F')),
    color TEXT,
    foto_url TEXT,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'fallecido')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- AMBOS TIPOS (Ventas y Costos)
-- ========================================================

-- Table: sales
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID REFERENCES clients(id), -- Optional for simple sales
    total NUMERIC NOT NULL DEFAULT 0,
    medio_pago TEXT CHECK (medio_pago IN ('efectivo', 'transferencia', 'tarjeta', 'otro')),
    estado TEXT DEFAULT 'pagado' CHECK (estado IN ('pendiente', 'pagado', 'anulado')),
    fecha TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Table: sale_items
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id), -- NULL for service lines
    descripcion TEXT, -- Used for services or as override for product name
    cantidad NUMERIC NOT NULL,
    precio_unitario NUMERIC NOT NULL,
    subtotal NUMERIC NOT NULL
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Table: costs
CREATE TABLE costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    concepto TEXT NOT NULL,
    categoria TEXT CHECK (categoria IN ('insumos', 'personal', 'servicios', 'alquiler', 'otros')),
    monto NUMERIC NOT NULL DEFAULT 0,
    proveedor_id UUID REFERENCES suppliers(id),
    comprobante_url TEXT,
    fecha DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE costs ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- SOLO VETERINARIA (Clínica)
-- ========================================================

-- Table: appointments (Agenda)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    pet_id UUID NOT NULL REFERENCES pets(id),
    fecha_hora TIMESTAMPTZ NOT NULL,
    motivo TEXT,
    veterinario TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'atendido', 'cancelado')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Table: medical_histories
CREATE TABLE medical_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    pet_id UUID NOT NULL REFERENCES pets(id),
    fecha DATE DEFAULT CURRENT_DATE,
    motivo TEXT,
    peso NUMERIC,
    temperatura NUMERIC,
    fc INTEGER,
    fr INTEGER,
    diagnostico TEXT,
    tratamiento TEXT,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE medical_histories ENABLE ROW LEVEL SECURITY;

-- Table: medical_attachments
CREATE TABLE medical_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    medical_history_id UUID NOT NULL REFERENCES medical_histories(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE medical_attachments ENABLE ROW LEVEL SECURITY;

-- Table: vaccinations
CREATE TABLE vaccinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    pet_id UUID NOT NULL REFERENCES pets(id),
    tipo TEXT NOT NULL,
    fecha_aplicacion DATE DEFAULT CURRENT_DATE,
    proxima_dosis DATE,
    lote TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;

-- Table: stock_movimientos
CREATE TABLE stock_movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'ajuste', 'venta')),
    cantidad NUMERIC NOT NULL,
    fecha TIMESTAMPTZ DEFAULT now(),
    observacion TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stock_movimientos ENABLE ROW LEVEL SECURITY;

-- Table: tenant_notas (Solo admin/service role)
CREATE TABLE tenant_notas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    nota TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tenant_notas ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- RLS POLICIES
-- ========================================================

-- Policies for: tenants
CREATE POLICY "Tenants - Owner can select" ON tenants 
    FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Tenants - Owner can update" ON tenants 
    FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Tenants - Users can insert their own tenant" ON tenants
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Helper: Policy creation for multitenant tables
-- Logic: (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()))

-- Policies for: suppliers
CREATE POLICY "Suppliers access" ON suppliers FOR ALL 
    USING (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()));

-- Policies for: products
CREATE POLICY "Products access" ON products FOR ALL 
    USING (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()));

-- Policies for: stock_movimientos
CREATE POLICY "Stock movements access" ON stock_movimientos FOR ALL 
    USING (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()));

-- Policies for: clients
CREATE POLICY "Clients access" ON clients FOR ALL 
    USING (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()));

-- Policies for: pets
CREATE POLICY "Pets access" ON pets FOR ALL 
    USING (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()));

-- Policies for: sales
CREATE POLICY "Sales access" ON sales FOR ALL 
    USING (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()));

-- Policies for: sale_items
CREATE POLICY "Sale items access" ON sale_items FOR ALL 
    USING (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()));

-- Policies for: costs
CREATE POLICY "Costs access" ON costs FOR ALL 
    USING (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()));

-- Policies for: appointments
CREATE POLICY "Appointments access" ON appointments FOR ALL 
    USING (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()));

-- Policies for: medical_histories
CREATE POLICY "Medical histories access" ON medical_histories FOR ALL 
    USING (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()));

-- Policies for: medical_attachments
CREATE POLICY "Medical attachments access" ON medical_attachments FOR ALL 
    USING (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()));

-- Policies for: vaccinations
CREATE POLICY "Vaccinations access" ON vaccinations FOR ALL 
    USING (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT id FROM tenants WHERE owner_id = auth.uid()));
