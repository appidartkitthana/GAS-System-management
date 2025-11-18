import React, { useState } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { supabaseClient } from '../lib/supabaseClient';
import CheckCircleIcon from '../components/icons/CheckCircleIcon';
import XCircleIcon from '../components/icons/XCircleIcon';
import { Brand, Size, ExpenseType, PaymentMethod, InvoiceType } from '../types';

type Status = 'idle' | 'testing' | 'success' | 'error';
type ErrorType = 'schema' | 'rls' | 'connection' | 'unknown';

interface TestResult {
  status: Status;
  messages: string[];
  errorType: ErrorType | null;
  schemaFixes: { table: string, fix: string }[];
}

// Defines the expected structure of the database.
const EXPECTED_SCHEMA = {
  customers: ['id', 'created_at', 'name', 'branch', 'price', 'tank_brand', 'tank_size', 'borrowed_tanks_quantity', 'address', 'tax_id'],
  sales: ['id', 'created_at', 'customer_id', 'date', 'quantity', 'unit_price', 'total_amount', 'tank_brand', 'tank_size', 'payment_method', 'invoice_type', 'invoice_number', 'gas_return_kg'],
  expenses: ['id', 'created_at', 'date', 'type', 'description', 'amount', 'payment_method', 'refill_tank_brand', 'refill_tank_size', 'refill_quantity'],
  inventory: ['id', 'created_at', 'tank_brand', 'tank_size', 'total', 'full', 'on_loan'],
};


const Settings: React.FC = () => {
  const [testResult, setTestResult] = useState<TestResult>({
    status: 'idle',
    messages: [],
    errorType: null,
    schemaFixes: []
  });

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
      for (const [tableName, columns] of Object.entries(EXPECTED_SCHEMA)) {
        addMessage(`- ตรวจสอบตาราง '${tableName}'`);
        const { error } = await supabaseClient.from(tableName).select(columns.join(',')).limit(1);

        if (error) {
          if (error.code === '42P01') { // undefined_table
            schemaErrors.push(`❌ ไม่พบตารางที่ชื่อว่า '${tableName}'`);
            // Note: Cannot suggest a fix for a missing table easily, as types are unknown.
          } else if (error.message.includes('column') && error.message.includes('does not exist')) {
            const missingColumnMatch = error.message.match(/column "([^"]+)" does not exist/);
            const missingColumn = missingColumnMatch ? missingColumnMatch[1] : 'ไม่ทราบชื่อ';
            schemaErrors.push(`❌ ตาราง '${tableName}' ขาดคอลัมน์: '${missingColumn}'`);
            schemaFixes.push({ table: tableName, fix: `ALTER TABLE public.${tableName} ADD COLUMN ${missingColumn} text; -- หมายเหตุ: โปรดเปลี่ยน 'text' เป็นชนิดข้อมูลที่ถูกต้อง` });
          } else {
            // Re-throw other errors to be caught by the main catch block
            throw { stage: `Schema Check (${tableName})`, originalError: error };
          }
        }
      }

      if (schemaErrors.length > 0) {
        throw { isSchemaError: true, messages: schemaErrors, fixes: schemaFixes };
      }
      addMessage('✅ โครงสร้างฐานข้อมูลถูกต้อง');

      // --- Stage 2: CRUD Permissions Test ---
      addMessage('2. กำลังทดสอบสิทธิ์การใช้งาน (Permissions)...');
      
      // Test Customers
      addMessage('- ทดสอบตาราง `customers` (INSERT, DELETE)');
      const { data: cData, error: cInsertErr } = await supabaseClient.from('customers').insert({ name: testId, branch: 'test', price: 0, tank_brand: Brand.OTHER, tank_size: Size.OTHER, borrowed_tanks_quantity: 0 }).select('id').single();
      if (cInsertErr) throw { stage: 'INSERT', table: 'customers', originalError: cInsertErr };
      customerId = cData.id;

      // Test Inventory
      addMessage('- ทดสอบตาราง `inventory` (INSERT, DELETE)');
      const { data: iData, error: iInsertErr } = await supabaseClient.from('inventory').insert({ tank_brand: Brand.OTHER, tank_size: Size.OTHER, total: 1, full: 1, on_loan: 0 }).select('id').single();
      if (iInsertErr) throw { stage: 'INSERT', table: 'inventory', originalError: iInsertErr };
      inventoryId = iData.id;
      
      // Test Expenses
      addMessage('- ทดสอบตาราง `expenses` (INSERT, DELETE)');
      const { data: eData, error: eInsertErr } = await supabaseClient.from('expenses').insert({ date: new Date().toISOString(), type: ExpenseType.OTHER, description: testId, amount: 0, payment_method: PaymentMethod.CASH }).select('id').single();
      if (eInsertErr) throw { stage: 'INSERT', table: 'expenses', originalError: eInsertErr };
      expenseId = eData.id;

      // Test Sales (depends on customer)
      addMessage('- ทดสอบตาราง `sales` (INSERT, DELETE)');
      const { data: sData, error: sInsertErr } = await supabaseClient.from('sales').insert({ customer_id: customerId, date: new Date().toISOString(), quantity: 1, unit_price: 0, total_amount: 0, tank_brand: Brand.OTHER, tank_size: Size.OTHER, payment_method: PaymentMethod.CASH, invoice_type: InvoiceType.CASH, invoice_number: testId }).select('id').single();
      if (sInsertErr) throw { stage: 'INSERT', table: 'sales', originalError: sInsertErr };
      saleId = sData.id;

      // Cleanup successful inserts
      addMessage('- กำลังลบข้อมูลทดสอบ...');
      await supabaseClient.from('sales').delete().eq('id', saleId);
      await supabaseClient.from('customers').delete().eq('id', customerId);
      await supabaseClient.from('inventory').delete().eq('id', inventoryId);
      await supabaseClient.from('expenses').delete().eq('id', expenseId);

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
        let errorMessages: string[] = [`การทดสอบล้มเหลวที่ขั้นตอน '${stage}' ของตาราง '${table}'`];
        let errorType: ErrorType = 'unknown';

        if (originalError.message.includes('violates row-level security policy')) {
            errorMessages.push(`สาเหตุ: ไม่ได้รับอนุญาตจากนโยบายความปลอดภัย (RLS)`);
            errorType = 'rls';
        } else if (originalError.message.includes('fetch')) {
            errorMessages.push(`สาเหตุ: ไม่สามารถเชื่อมต่อกับ Supabase URL ได้`);
            errorType = 'connection';
        } else {
             errorMessages.push(`ข้อผิดพลาด: ${originalError.message}`);
        }

        setTestResult(prev => ({ ...prev, status: 'error', messages: errorMessages, errorType }));
        console.error('Database connection test failed:', originalError);
    } finally {
        // Final cleanup in case of failure during deletion phase
        if (saleId) await supabaseClient.from('sales').delete().eq('id', saleId).catch(console.error);
        if (customerId) await supabaseClient.from('customers').delete().eq('id', customerId).catch(console.error);
        if (inventoryId) await supabaseClient.from('inventory').delete().eq('id', inventoryId).catch(console.error);
        if (expenseId) await supabaseClient.from('expenses').delete().eq('id', expenseId).catch(console.error);
    }
  };

  const renderStatus = () => {
    const { status, messages, errorType, schemaFixes } = testResult;

    if (status === 'idle') return null;

    if (status === 'testing') {
        return (
            <div className="mt-4 p-4 rounded-lg bg-blue-100 text-blue-800">
                <div className="flex items-center font-semibold mb-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800 mr-2"></div>
                    กำลังทดสอบ...
                </div>
                <ul className="list-disc list-inside text-sm space-y-1">
                    {messages.map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
            </div>
        );
    }

    if (status === 'success') {
      return (
        <div className="mt-4 p-4 rounded-lg bg-green-100 text-green-800 flex items-center space-x-2">
          <CheckCircleIcon />
          <p className="font-semibold">{messages[0]}</p>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="mt-4 p-4 rounded-lg bg-red-100 text-red-800">
          <div className="flex items-center space-x-2 font-bold">
            <XCircleIcon />
            <p>พบข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล</p>
          </div>
          <div className="mt-2 pl-8 text-sm space-y-1">
            {messages.map((msg, i) => <p key={i}>{msg}</p>)}
          </div>
          
          {errorType === 'schema' && schemaFixes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-red-200 text-xs text-gray-700">
              <p className="font-bold mb-2">วิธีแก้ไข (Schema):</p>
              <p className="mb-2">คัดลอกและรันโค้ด SQL ข้างล่างนี้ใน SQL Editor ของ Supabase เพื่อแก้ไขคอลัมน์ที่ขาดหายไป:</p>
              <pre className="bg-gray-800 text-white p-2 rounded-md text-xs overflow-x-auto">
                <code>{schemaFixes.map(fix => fix.fix).join('\n')}</code>
              </pre>
            </div>
          )}

          {errorType === 'rls' && (
             <div className="mt-3 pt-3 border-t border-red-200 text-xs text-gray-700">
                <p className="font-bold mb-2">วิธีแก้ไข (RLS):</p>
                <p className="mb-2">ไปที่ <b>SQL Editor</b> ในโปรเจกต์ Supabase ของคุณ และรันโค้ดข้างล่างนี้เพื่อเปิดสิทธิ์การใช้งาน:</p>
                <pre className="bg-gray-800 text-white p-2 rounded-md text-xs overflow-x-auto">
                    <code>
{`-- Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon access" ON public.customers;
CREATE POLICY "Allow anon access" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- Sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon access" ON public.sales;
CREATE POLICY "Allow anon access" ON public.sales FOR ALL USING (true) WITH CHECK (true);

-- Expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon access" ON public.expenses;
CREATE POLICY "Allow anon access" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- Inventory
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon access" ON public.inventory;
CREATE POLICY "Allow anon access" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
`}
                    </code>
                </pre>
             </div>
          )}

          {errorType === 'connection' && (
              <p className="mt-3 pt-3 border-t border-red-200 text-sm text-gray-700">
                  <b>คำแนะนำ:</b> โปรดตรวจสอบว่า Supabase URL และ Key ในไฟล์ <code>lib/supabaseClient.ts</code> ถูกต้อง และคอมพิวเตอร์ของคุณสามารถเข้าถึงอินเทอร์เน็ตได้
              </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <Header title="ตั้งค่า" />
      <Card>
        <h2 className="text-lg font-semibold mb-2 text-gray-700">วินิจฉัยระบบฐานข้อมูล</h2>
        <p className="text-sm text-gray-500 mb-4">
          เครื่องมือนี้จะตรวจสอบการเชื่อมต่อ, โครงสร้าง (Schema), และสิทธิ์การใช้งาน (RLS) ของฐานข้อมูล Supabase ทั้งหมด เพื่อให้แน่ใจว่าแอปพลิเคชันสามารถทำงานได้อย่างถูกต้อง
        </p>
        <button
          onClick={handleTestConnection}
          disabled={testResult.status === 'testing'}
          className="w-full px-4 py-2 bg-sky-500 text-white font-semibold rounded-lg hover:bg-sky-600 disabled:bg-sky-300 disabled:cursor-wait transition-colors"
        >
          {testResult.status === 'testing' ? 'กำลังทดสอบ...' : 'เริ่มการทดสอบระบบ'}
        </button>
        {renderStatus()}
      </Card>
    </div>
  );
};

export default Settings;