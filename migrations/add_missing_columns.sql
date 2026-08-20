-- ==============================================================================
-- คำสั่ง SQL สำหรับเพิ่มเฉพาะฟิลด์ใหม่/ฟิลด์ที่ยังไม่มี (Safe Migration - ไม่กระทบข้อมูลเดิม)
-- ให้นำโค้ดนี้ไปวางและกด Run ใน Supabase Dashboard -> เมนู SQL Editor
-- ==============================================================================

-- 1. เพิ่มฟิลด์ในตารางลูกค้า (customers)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS borrowed_tanks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS price_list JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS google_map_url TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS default_vat_type TEXT DEFAULT 'INCLUDED';

-- 2. เพิ่มฟิลด์ในตารางสต็อกสินค้า (inventory)
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'GAS';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS notes TEXT;
-- ปลดล็อคให้สินค้าประเภทอุปกรณ์สามารถเว้นว่าง brand/size ได้
ALTER TABLE public.inventory ALTER COLUMN tank_brand DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN tank_size DROP NOT NULL;

-- 3. เพิ่มฟิลด์ในตารางการขาย/รายรับ (sales)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gas_return_kg NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gas_return_price NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gas_return_qty INTEGER DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS vat_type TEXT DEFAULT 'INCLUDED';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS pre_vat_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- 4. เพิ่มฟิลด์ในตารางรายจ่าย/การส่งเติมแก๊ส (expenses)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payee TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS refill_details JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS gas_return_kg NUMERIC DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS gas_return_amount NUMERIC DEFAULT 0;
ALTER TABLE public.expenses ALTER COLUMN type TYPE TEXT;

-- 5. อัปเดตนโยบายสิทธิ์ (RLS Policies) ให้บันทึกข้อมูลได้ไม่ติด Permission
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for all users" ON public.customers;
CREATE POLICY "Enable all access for all users" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for all users" ON public.inventory;
CREATE POLICY "Enable all access for all users" ON public.inventory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for all users" ON public.sales;
CREATE POLICY "Enable all access for all users" ON public.sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for all users" ON public.expenses;
CREATE POLICY "Enable all access for all users" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
