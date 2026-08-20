
import React, { useState } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { supabaseClient } from '../lib/supabaseClient';
import CheckCircleIcon from '../components/icons/CheckCircleIcon';
import XCircleIcon from '../components/icons/XCircleIcon';
import TrashIcon from '../components/icons/TrashIcon';
import { Brand, Size, ExpenseType, PaymentMethod, InvoiceType, InventoryCategory, CompanyInfo } from '../types';
import { formatSupabaseError, normalizeGoogleDriveUrl } from '../lib/utils';
import { useAppContext } from '../context/AppContext';
import somkiatOfficialLogo from '../src/assets/images/somkiat_official_logo_1786700374453.jpg';
import { exportToExcel, exportToSql } from '../lib/backupUtils';

type Status = 'idle' | 'testing' | 'success' | 'error';
type ErrorType = 'schema' | 'rls' | 'connection' | 'unknown';

interface TestResult {
  status: Status;
  messages: string[];
  errorType: ErrorType | null;
  schemaFixes: { table: string, fix: string }[];
}

const Settings: React.FC = () => {
  const { 
    companyInfo, 
    updateCompanyInfo, 
    expenseTypes, 
    addExpenseType, 
    removeExpenseType,
    customers,
    inventory,
    sales,
    expenses,
    tankLoanLogs
  } = useAppContext();
  const [newExpenseType, setNewExpenseType] = useState('');
  
  const [testResult, setTestResult] = useState<TestResult>({
    status: 'idle',
    messages: [],
    errorType: null,
    schemaFixes: []
  });
  
  // Company Info Form State
  const [formInfo, setFormInfo] = useState<CompanyInfo>(companyInfo);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  // Backup handlers
  const handleExportExcel = () => {
    try {
      setBackupStatus('กำลังสร้างไฟล์ Excel (.xlsx)...');
      exportToExcel(customers, inventory, sales, expenses, companyInfo, tankLoanLogs || []);
      setBackupStatus('✅ ดาวน์โหลดไฟล์ Excel สำรองข้อมูลเรียบร้อยแล้ว');
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการส่งออก Excel: ${err.message}`);
      setBackupStatus(null);
    }
  };

  const handleExportSql = () => {
    try {
      setBackupStatus('กำลังสร้างไฟล์ SQL Dump (.sql)...');
      exportToSql(customers, inventory, sales, expenses, companyInfo);
      setBackupStatus('✅ ดาวน์โหลดไฟล์ SQL Dump สำรองข้อมูลเรียบร้อยแล้ว');
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการส่งออก SQL: ${err.message}`);
      setBackupStatus(null);
    }
  };

  const handleExportAll = () => {
    try {
      setBackupStatus('กำลังสำรองข้อมูลทั้งหมด (Excel + SQL)...');
      exportToExcel(customers, inventory, sales, expenses, companyInfo, tankLoanLogs || []);
      setTimeout(() => {
        exportToSql(customers, inventory, sales, expenses, companyInfo);
        setBackupStatus('✅ สำรองข้อมูลทั้ง Excel และ SQL เรียบร้อยแล้ว');
        setTimeout(() => setBackupStatus(null), 4000);
      }, 500);
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการสำรองข้อมูล: ${err.message}`);
      setBackupStatus(null);
    }
  };

  const fullSqlScript = `-- คำสั่ง SQL สำหรับอัปเกรดฐานข้อมูลร้านสมเกียรติแก๊ส (Safe Migration)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS borrowed_tanks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS price_list JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS google_map_url TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS default_vat_type TEXT DEFAULT 'INCLUDED';

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'GAS';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.inventory ALTER COLUMN tank_brand DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN tank_size DROP NOT NULL;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gas_return_kg NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gas_return_price NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gas_return_qty INTEGER DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS vat_type TEXT DEFAULT 'INCLUDED';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS pre_vat_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_number TEXT;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payee TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS refill_details JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS gas_return_kg NUMERIC DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS gas_return_amount NUMERIC DEFAULT 0;
ALTER TABLE public.expenses ALTER COLUMN type TYPE TEXT;

-- เปิดสิทธิ์ Row-Level Security (RLS)
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
CREATE POLICY "Enable all access for all users" ON public.expenses FOR ALL USING (true) WITH CHECK (true);`;

  const copySqlToClipboard = (sqlText: string) => {
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setFormInfo(prev => ({ ...prev, logo: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const saveCompanyInfo = () => {
      updateCompanyInfo(formInfo);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
  };

  const handleAddExpenseType = (e: React.FormEvent) => {
      e.preventDefault();
      if (newExpenseType.trim()) {
          addExpenseType(newExpenseType.trim());
          setNewExpenseType('');
      }
  };

  const addMessage = (msg: string) => {
    setTestResult(prev => ({ ...prev, messages: [...prev.messages, msg] }));
  };

  const handleTestConnection = async () => {
    setTestResult({ status: 'testing', messages: [], errorType: null, schemaFixes: [] });
    
    const schemaErrors: string[] = [];
    const schemaFixes: { table: string, fix: string }[] = [];
    const testId = `_test_${Date.now()}`;
    let customerId: string | null = null;
    let inventoryId: string | null = null;
    let expenseId: string | null = null;
    let saleId: string | null = null;

    try {
      // --- Stage 1: Schema Validation ---
      addMessage('1. กำลังตรวจสอบโครงสร้างฐานข้อมูล (Schema)...');
      
      // Define Columns to check
      const checks = [
          { table: 'customers', column: 'borrowed_tanks', type: 'jsonb', fix: 'ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS borrowed_tanks jsonb DEFAULT \'[]\'::jsonb;' },
          { table: 'customers', column: 'price_list', type: 'jsonb', fix: 'ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS price_list jsonb DEFAULT \'[]\'::jsonb;' },
          { table: 'customers', column: 'google_map_url', type: 'text', fix: 'ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS google_map_url text;' },
          { table: 'customers', column: 'notes', type: 'text', fix: 'ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes text;' },
          { table: 'customers', column: 'phone', type: 'text', fix: 'ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone text;' },
          { table: 'customers', column: 'address', type: 'text', fix: 'ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address text;' },
          { table: 'customers', column: 'tax_id', type: 'text', fix: 'ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_id text;' },
          { table: 'customers', column: 'default_vat_type', type: 'text', fix: 'ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS default_vat_type text DEFAULT \'INCLUDED\';' },
          { table: 'inventory', column: 'category', type: 'text', fix: 'ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS category text DEFAULT \'GAS\';' },
          { table: 'inventory', column: 'name', type: 'text', fix: 'ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS name text;' },
          { table: 'inventory', column: 'cost_price', type: 'numeric', fix: 'ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;' },
          { table: 'inventory', column: 'notes', type: 'text', fix: 'ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS notes text;' },
          { table: 'inventory', column: 'low_stock_threshold', type: 'integer', fix: 'ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5;' },
          { table: 'expenses', column: 'refill_details', type: 'jsonb', fix: 'ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS refill_details jsonb DEFAULT \'[]\'::jsonb;' },
          { table: 'expenses', column: 'payee', type: 'text', fix: 'ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payee text;' },
          { table: 'expenses', column: 'gas_return_kg', type: 'numeric', fix: 'ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS gas_return_kg numeric DEFAULT 0;' },
          { table: 'expenses', column: 'gas_return_amount', type: 'numeric', fix: 'ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS gas_return_amount numeric DEFAULT 0;' },
          { table: 'sales', column: 'cost_price', type: 'numeric', fix: 'ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;' },
          { table: 'sales', column: 'items', type: 'jsonb', fix: 'ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items jsonb DEFAULT \'[]\'::jsonb;' },
          { table: 'sales', column: 'gas_return_price', type: 'numeric', fix: 'ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gas_return_price numeric DEFAULT 0;' },
          { table: 'sales', column: 'gas_return_kg', type: 'numeric', fix: 'ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gas_return_kg numeric DEFAULT 0;' },
          { table: 'sales', column: 'gas_return_qty', type: 'integer', fix: 'ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gas_return_qty integer DEFAULT 0;' },
          { table: 'sales', column: 'vat_type', type: 'text', fix: 'ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS vat_type text DEFAULT \'INCLUDED\';' },
          { table: 'sales', column: 'pre_vat_amount', type: 'numeric', fix: 'ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS pre_vat_amount numeric DEFAULT 0;' },
          { table: 'sales', column: 'vat_amount', type: 'numeric', fix: 'ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0;' },
          { table: 'sales', column: 'invoice_number', type: 'text', fix: 'ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_number text;' },
      ];

      for (const check of checks) {
          addMessage(`- ตรวจสอบตาราง '${check.table}' คอลัมน์ '${check.column}'`);
          const { error } = await supabaseClient.from(check.table).select(check.column).limit(1);
          if (error) {
             schemaErrors.push(`❌ ตาราง '${check.table}' ขาดคอลัมน์: '${check.column}'`);
             schemaFixes.push(check);
          }
      }

      // Special Check: Verify 'expense.type' allows arbitrary text (not strict enum)
      addMessage('- ตรวจสอบประเภทคอลัมน์ expenses.type...');
      const { error: customTypeError } = await supabaseClient.from('expenses').insert({
          date: new Date().toISOString(),
          type: 'TEST_CUSTOM_TYPE_XYZ', 
          description: 'Type Check',
          amount: 0,
          payment_method: PaymentMethod.CASH,
      }).select('id').single();

      if (customTypeError) {
          if (customTypeError.code === '22P02' || customTypeError.message.includes('invalid input value for enum')) {
              schemaErrors.push('❌ ตาราง expenses.type ถูกล็อคเป็น Enum (ต้องเปลี่ยนเป็น Text)');
              schemaFixes.push({ 
                  table: 'expenses', 
                  fix: `ALTER TABLE public.expenses ALTER COLUMN type TYPE text; DROP TYPE IF EXISTS expense_type;` 
              });
          }
      } else {
          await supabaseClient.from('expenses').delete().eq('type', 'TEST_CUSTOM_TYPE_XYZ');
      }

      // Special Check for Nullable constraints in Inventory (for Accessories)
      addMessage('- ทดสอบการบันทึกอุปกรณ์ (Accessory)...');
      const { error: accError } = await supabaseClient.from('inventory').insert({
          category: InventoryCategory.ACCESSORY,
          name: 'Test Accessory',
          total: 1,
          full: 0,
          on_loan: 0,
          tank_brand: null, 
          tank_size: null,   
      }).select().single();

      if (accError) {
           if (accError.message?.includes('null value') || accError.details?.includes('failing row contains')) {
               schemaErrors.push(`❌ ตาราง 'inventory' ยังไม่รองรับสินค้าที่ไม่มีแบรนด์ (อุปกรณ์)`);
               schemaFixes.push({ table: 'inventory', fix: 'ALTER TABLE public.inventory ALTER COLUMN tank_brand DROP NOT NULL;' });
               schemaFixes.push({ table: 'inventory', fix: 'ALTER TABLE public.inventory ALTER COLUMN tank_size DROP NOT NULL;' });
           } else {
               if (accError.code !== '23505') {
                   throw { stage: 'INSERT Accessory', table: 'inventory', originalError: accError };
               }
           }
      } else {
           await supabaseClient.from('inventory').delete().eq('name', 'Test Accessory');
      }

      if (schemaErrors.length > 0) {
        throw { isSchemaError: true, messages: schemaErrors, fixes: schemaFixes };
      }
      addMessage('✅ โครงสร้างฐานข้อมูลถูกต้อง');

      // --- Stage 2: CRUD Permissions Test ---
      addMessage('2. กำลังทดสอบสิทธิ์การใช้งาน (Permissions)...');
      
      const { data: cData, error: cInsertErr } = await supabaseClient.from('customers').insert({ 
          name: testId, 
          branch: 'test', 
          price: 0, 
          tank_brand: Brand.OTHER, 
          tank_size: Size.OTHER,
          borrowed_tanks: [],
          price_list: [],
          notes: 'Test'
      }).select('id').single();
      if (cInsertErr) throw { stage: 'INSERT', table: 'customers', originalError: cInsertErr };
      customerId = cData.id;

      const { data: iData, error: iInsertErr } = await supabaseClient.from('inventory').insert({ 
          total: 1, 
          full: 1, 
          on_loan: 0, 
          tank_brand: Brand.OTHER, 
          tank_size: Size.OTHER, 
          category: InventoryCategory.GAS,
          cost_price: 0,
          notes: 'Test',
          low_stock_threshold: 0
      }).select('id').single();
      if (iInsertErr) throw { stage: 'INSERT', table: 'inventory', originalError: iInsertErr };
      inventoryId = iData.id;
      
      const { data: eData, error: eInsertErr } = await supabaseClient.from('expenses').insert({ 
          date: new Date().toISOString(), 
          type: ExpenseType.OTHER, 
          description: testId, 
          amount: 0, 
          payment_method: PaymentMethod.CASH,
          payee: 'System Test', 
          refill_details: [], 
          gas_return_kg: 0, 
          gas_return_amount: 0 
      }).select('id').single();
      if (eInsertErr) throw { stage: 'INSERT', table: 'expenses', originalError: eInsertErr };
      expenseId = eData.id;

      const { data: sData, error: sInsertErr } = await supabaseClient.from('sales').insert({ 
          customer_id: customerId, 
          date: new Date().toISOString(), 
          quantity: 1, 
          unit_price: 0, 
          total_amount: 0, 
          tank_brand: Brand.OTHER, 
          tank_size: Size.OTHER, 
          payment_method: PaymentMethod.CASH, 
          invoice_type: InvoiceType.CASH, 
          invoice_number: testId,
          cost_price: 0,
          items: [],
          gas_return_price: 0
      }).select('id').single();
      if (sInsertErr) throw { stage: 'INSERT', table: 'sales', originalError: sInsertErr };
      saleId = sData.id;

      addMessage('- กำลังลบข้อมูลทดสอบ...');
      setTestResult(prev => ({ ...prev, status: 'success', messages: ['✅ เชื่อมต่อและทดสอบฐานข้อมูลสำเร็จ! โครงสร้างและสิทธิ์การใช้งานถูกต้องทั้งหมด'] }));

    } catch (error: any) {
        if (error.isSchemaError) {
            setTestResult({
                status: 'error',
                messages: error.messages,
                errorType: 'schema',
                schemaFixes: error.fixes,
            });
            return;
        }

        const stage = error.stage || 'Unknown';
        const table = error.table || 'N/A';
        const originalError = error.originalError || error;
        const errorMsg = formatSupabaseError(originalError);

        let errorMessages: string[] = [`การทดสอบล้มเหลวที่ขั้นตอน '${stage}' ของตาราง '${table}'`];
        let errorType: ErrorType = 'unknown';

        if (errorMsg.includes('violates row-level security policy') || (originalError.message && originalError.message.includes('violates row-level security policy'))) {
            errorMessages.push(`สาเหตุ: ไม่ได้รับอนุญาตจากนโยบายความปลอดภัย (RLS)`);
            errorType = 'rls';
        } else if (errorMsg.includes('fetch') || (originalError.message && originalError.message.includes('fetch'))) {
            errorMessages.push(`สาเหตุ: ไม่สามารถเชื่อมต่อกับ Supabase URL ได้`);
            errorType = 'connection';
        } else {
             errorMessages.push(`ข้อผิดพลาด: ${errorMsg}`);
        }

        setTestResult(prev => ({ ...prev, status: 'error', messages: errorMessages, errorType }));
    } finally {
        const clean = async () => {
             if (saleId) await supabaseClient.from('sales').delete().eq('id', saleId);
             if (customerId) await supabaseClient.from('customers').delete().eq('id', customerId);
             if (inventoryId) await supabaseClient.from('inventory').delete().eq('id', inventoryId);
             if (expenseId) await supabaseClient.from('expenses').delete().eq('id', expenseId);
        }
        clean();
    }
  };

  const renderStatus = () => {
    const { status, messages, errorType, schemaFixes } = testResult;

    if (status === 'idle') return null;
    if (status === 'testing') return <div className="mt-4 p-4 rounded-lg bg-blue-100 text-blue-800">กำลังทดสอบ...</div>;
    if (status === 'success') return <div className="mt-4 p-4 rounded-lg bg-green-100 text-green-800 flex items-center space-x-2"><CheckCircleIcon /><p>{messages[0]}</p></div>;

    if (status === 'error') {
      return (
        <div className="mt-4 p-4 rounded-lg bg-red-100 text-red-800">
          <div className="flex items-center space-x-2 font-bold"><XCircleIcon /><p>พบข้อผิดพลาด</p></div>
          <div className="mt-2 pl-8 text-sm space-y-1">{messages.map((msg, i) => <p key={i}>{msg}</p>)}</div>
          
          {errorType === 'schema' && schemaFixes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-red-200 text-xs text-gray-700">
              <div className="flex justify-between items-center mb-2">
                <p className="font-bold">วิธีแก้ไข (อัปเกรดฐานข้อมูล):</p>
                <button
                  type="button"
                  onClick={() => copySqlToClipboard(schemaFixes.map(fix => fix.fix).join('\n'))}
                  className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-semibold shadow-sm transition-colors"
                >
                  {copiedSql ? '✓ คัดลอกสำเร็จ' : '📋 คัดลอกคำสั่ง SQL'}
                </button>
              </div>
              <p className="mb-2">คัดลอกโค้ด SQL นี้ไปรันใน Supabase Dashboard &gt; SQL Editor:</p>
              <pre className="bg-gray-800 text-white p-2.5 rounded-md text-xs overflow-x-auto select-all">
                <code>{schemaFixes.map(fix => fix.fix).join('\n')}</code>
              </pre>
            </div>
          )}
          
           {errorType === 'rls' && (
            <div className="mt-3 pt-3 border-t border-red-200 text-xs text-gray-700">
              <p className="font-bold mb-2">วิธีแก้ไข (เปิดสิทธิ์การใช้งาน):</p>
              <pre className="bg-gray-800 text-white p-2 rounded-md text-xs overflow-x-auto select-all">
                <code>
{`CREATE POLICY "Enable all access for all users" ON "public"."customers" FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON "public"."inventory" FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON "public"."sales" FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON "public"."expenses" FOR ALL USING (true);
`}
                </code>
              </pre>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <Header title="ตั้งค่า" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <h2 className="text-lg font-semibold mb-4 text-gray-700">ข้อมูลร้านค้า</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">ชื่อร้าน/บริษัท</label>
                    <input name="name" value={formInfo.name} onChange={handleInfoChange} className="w-full mt-1 p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">ที่อยู่</label>
                    <textarea name="address" value={formInfo.address} onChange={handleInfoChange} rows={2} className="w-full mt-1 p-2 border rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
                    <input name="phone" value={formInfo.phone} onChange={handleInfoChange} className="w-full mt-1 p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">เลขประจำตัวผู้เสียภาษี</label>
                    <input name="taxId" value={formInfo.taxId} onChange={handleInfoChange} className="w-full mt-1 p-2 border rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">โลโก้ร้าน (URL หรือ อัปโหลดไฟล์)</label>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-4">
                            {formInfo.logo && (
                              <img 
                                src={normalizeGoogleDriveUrl(formInfo.logo)} 
                                alt="Logo Preview" 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (target.src !== somkiatOfficialLogo) {
                                    target.src = somkiatOfficialLogo;
                                  }
                                }}
                                className="h-16 w-16 object-contain border rounded p-1 bg-white" 
                              />
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleLogoUpload} 
                              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100" 
                            />
                        </div>
                        <input
                          type="text"
                          name="logo"
                          value={formInfo.logo || ''}
                          onChange={handleInfoChange}
                          placeholder="หรือใส่ URL โลโก้/ลิงก์ Google Drive"
                          className="w-full p-2 border rounded text-xs text-gray-600 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>
                </div>
                <button onClick={saveCompanyInfo} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors w-full sm:w-auto">
                    {isSaved ? 'บันทึกเรียบร้อย' : 'บันทึกข้อมูลร้านค้า'}
                </button>
            </div>
        </Card>

        <div className="space-y-6">
          <Card>
              <h2 className="text-lg font-semibold mb-4 text-gray-700">จัดการประเภทค่าใช้จ่าย</h2>
              <div className="space-y-2 mb-4">
                  {expenseTypes.map((type, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                          <span className="text-gray-700">{type}</span>
                          {type !== ExpenseType.REFILL ? (
                              <button onClick={() => removeExpenseType(type)} className="text-gray-400 hover:text-red-500">
                                  <TrashIcon className="h-4 w-4" />
                              </button>
                          ) : <span className="text-xs text-gray-400 italic">ค่าเริ่มต้น</span>}
                      </div>
                  ))}
              </div>
              <form onSubmit={handleAddExpenseType} className="flex gap-2">
                  <input 
                    type="text" 
                    value={newExpenseType} 
                    onChange={(e) => setNewExpenseType(e.target.value)} 
                    placeholder="เพิ่มประเภทใหม่..." 
                    className="flex-grow p-2 border rounded text-sm"
                  />
                  <button type="submit" className="bg-sky-500 text-white px-4 py-2 rounded text-sm hover:bg-sky-600 whitespace-nowrap">
                      เพิ่ม
                  </button>
              </form>
          </Card>

          {/* Backup Database Section */}
          <Card>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <span>💾</span> สำรองข้อมูลระบบ (Backup Data)
              </h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                พร้อมส่งออก
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              ดาวน์โหลดข้อมูลทุกตารางในระบบเป็นไฟล์ <strong>Excel (.xlsx)</strong> และ <strong>SQL Dump (.sql)</strong> สำหรับเก็บรักษาความปลอดภัยของข้อมูล
            </p>

            {/* Current Data Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="text-center bg-white p-2 rounded border border-slate-100 shadow-xs">
                <span className="block text-[11px] text-gray-500">👥 ลูกค้า</span>
                <span className="text-base font-bold text-sky-600">{customers.length}</span>
                <span className="text-[10px] text-gray-400 block">ราย</span>
              </div>
              <div className="text-center bg-white p-2 rounded border border-slate-100 shadow-xs">
                <span className="block text-[11px] text-gray-500">📦 สต็อก</span>
                <span className="text-base font-bold text-amber-600">{inventory.length}</span>
                <span className="text-[10px] text-gray-400 block">รายการ</span>
              </div>
              <div className="text-center bg-white p-2 rounded border border-slate-100 shadow-xs">
                <span className="block text-[11px] text-gray-500">🧾 การขาย</span>
                <span className="text-base font-bold text-emerald-600">{sales.length}</span>
                <span className="text-[10px] text-gray-400 block">บิล</span>
              </div>
              <div className="text-center bg-white p-2 rounded border border-slate-100 shadow-xs">
                <span className="block text-[11px] text-gray-500">💸 รายจ่าย</span>
                <span className="text-base font-bold text-rose-600">{expenses.length}</span>
                <span className="text-[10px] text-gray-400 block">รายการ</span>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <span>📊</span> ดาวน์โหลด Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handleExportSql}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <span>🗄️</span> ดาวน์โหลด SQL Dump (.sql)
                </button>
              </div>
              <button
                type="button"
                onClick={handleExportAll}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold rounded-lg transition-colors"
              >
                <span>⚡</span> สำรองข้อมูลทั้งสองไฟล์ (Excel + SQL) ในคลิกเดียว
              </button>
            </div>

            {/* Status Feedback */}
            {backupStatus && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircleIcon />
                <span>{backupStatus}</span>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-gray-700">วินิจฉัยและซ่อมแซมฐานข้อมูล</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">ตรวจสอบและซ่อมแซมคอลัมน์ใน Supabase เพื่อให้ระบบบันทึกรายการได้ 100%</p>
            <div className="space-y-3">
              <button 
                onClick={handleTestConnection} 
                disabled={testResult.status === 'testing'} 
                className="w-full px-4 py-2.5 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:bg-sky-300 shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {testResult.status === 'testing' ? 'กำลังทดสอบระบบ...' : '⚡ เริ่มการทดสอบระบบและตรวจจับ Schema'}
              </button>

              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-gray-700">คำสั่ง SQL อัปเกรดฐานข้อมูลทั้งหมด (Safe Migration)</span>
                  <button
                    type="button"
                    onClick={() => copySqlToClipboard(fullSqlScript)}
                    className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-white hover:bg-slate-900 shadow-sm transition-colors"
                  >
                    {copiedSql ? '✓ คัดลอกแล้ว' : '📋 คัดลอก SQL ทั้งหมด'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mb-2">สามารถนำโค้ดนี้ไปรันในเมนู SQL Editor บน Supabase ได้ตลอดเวลา ปลอดภัย ไม่ลบข้อมูลเดิม</p>
                <details className="text-xs bg-slate-50 p-2 rounded border border-slate-200 cursor-pointer">
                  <summary className="font-semibold text-slate-700">ดูคำสั่ง SQL อัปเกรดทั้งหมด</summary>
                  <pre className="mt-2 bg-slate-900 text-slate-100 p-2.5 rounded text-[11px] overflow-x-auto max-h-48 overflow-y-auto">
                    <code>{fullSqlScript}</code>
                  </pre>
                </details>
              </div>
            </div>
            {renderStatus()}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
