
import React, { useState } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { supabaseClient } from '../lib/supabaseClient';
import CheckCircleIcon from '../components/icons/CheckCircleIcon';
import XCircleIcon from '../components/icons/XCircleIcon';
import { Brand, Size, ExpenseType, PaymentMethod, InvoiceType, InventoryCategory } from '../types';
import { formatSupabaseError } from '../lib/utils';

type Status = 'idle' | 'testing' | 'success' | 'error';
type ErrorType = 'schema' | 'rls' | 'connection' | 'unknown';

interface TestResult {
  status: Status;
  messages: string[];
  errorType: ErrorType | null;
  schemaFixes: { table: string, fix: string }[];
}

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
      
      // Define Columns to check
      const checks = [
          { table: 'customers', column: 'borrowed_tanks', type: 'jsonb', fix: 'ALTER TABLE public.customers ADD COLUMN borrowed_tanks jsonb;' },
          { table: 'customers', column: 'price_list', type: 'jsonb', fix: 'ALTER TABLE public.customers ADD COLUMN price_list jsonb;' },
          { table: 'customers', column: 'notes', type: 'text', fix: 'ALTER TABLE public.customers ADD COLUMN notes text;' },
          { table: 'inventory', column: 'category', type: 'text', fix: 'ALTER TABLE public.inventory ADD COLUMN category text;' },
          { table: 'inventory', column: 'name', type: 'text', fix: 'ALTER TABLE public.inventory ADD COLUMN name text;' },
          { table: 'inventory', column: 'cost_price', type: 'numeric', fix: 'ALTER TABLE public.inventory ADD COLUMN cost_price numeric;' },
          { table: 'inventory', column: 'notes', type: 'text', fix: 'ALTER TABLE public.inventory ADD COLUMN notes text;' },
          { table: 'expenses', column: 'refill_details', type: 'jsonb', fix: 'ALTER TABLE public.expenses ADD COLUMN refill_details jsonb;' },
          { table: 'expenses', column: 'payee', type: 'text', fix: 'ALTER TABLE public.expenses ADD COLUMN payee text;' },
          { table: 'expenses', column: 'gas_return_kg', type: 'numeric', fix: 'ALTER TABLE public.expenses ADD COLUMN gas_return_kg numeric;' },
          { table: 'expenses', column: 'gas_return_amount', type: 'numeric', fix: 'ALTER TABLE public.expenses ADD COLUMN gas_return_amount numeric;' },
          { table: 'sales', column: 'cost_price', type: 'numeric', fix: 'ALTER TABLE public.sales ADD COLUMN cost_price numeric;' },
          { table: 'sales', column: 'items', type: 'jsonb', fix: 'ALTER TABLE public.sales ADD COLUMN items jsonb;' },
          { table: 'sales', column: 'gas_return_price', type: 'numeric', fix: 'ALTER TABLE public.sales ADD COLUMN gas_return_price numeric;' },
      ];

      for (const check of checks) {
          addMessage(`- ตรวจสอบตาราง '${check.table}' คอลัมน์ '${check.column}'`);
          const { error } = await supabaseClient.from(check.table).select(check.column).limit(1);
          if (error) {
             // If column doesn't exist, Supabase returns error 42703 or similar
             schemaErrors.push(`❌ ตาราง '${check.table}' ขาดคอลัมน์: '${check.column}'`);
             schemaFixes.push(check);
          }
      }

      // Special Check: Verify 'expense.type' allows arbitrary text (not strict enum)
      addMessage('- ตรวจสอบประเภทคอลัมน์ expenses.type...');
      const { error: customTypeError } = await supabaseClient.from('expenses').insert({
          date: new Date().toISOString(),
          type: 'TEST_CUSTOM_TYPE_XYZ', // Try inserting a non-enum value
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
          } else {
              // Other error, log it but maybe not schema related directly
              console.warn("Expense Type Check Warning:", customTypeError);
          }
      } else {
          // Success, cleanup immediately
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
          tank_brand: null, // Should be allowed
          tank_size: null,   // Should be allowed
          // Note: We intentionally DO NOT include 'notes' here. 
          // If the 'notes' column is missing, the check above catches it. 
          // Including it here would cause this INSERT to fail with "column not found" 
          // before we can report the missing column error from the loop above.
      }).select().single();

      if (accError) {
           if (accError.message?.includes('null value') || accError.details?.includes('failing row contains')) {
               schemaErrors.push(`❌ ตาราง 'inventory' ยังไม่รองรับสินค้าที่ไม่มีแบรนด์ (อุปกรณ์)`);
               schemaFixes.push({ table: 'inventory', fix: 'ALTER TABLE public.inventory ALTER COLUMN tank_brand DROP NOT NULL;' });
               schemaFixes.push({ table: 'inventory', fix: 'ALTER TABLE public.inventory ALTER COLUMN tank_size DROP NOT NULL;' });
           } else {
               // Ignore unique constraint error if it clashes with existing test data
               if (accError.code !== '23505') {
                   throw { stage: 'INSERT Accessory', table: 'inventory', originalError: accError };
               }
           }
      } else {
           // Clean up immediately by name
           await supabaseClient.from('inventory').delete().eq('name', 'Test Accessory');
      }

      if (schemaErrors.length > 0) {
        throw { isSchemaError: true, messages: schemaErrors, fixes: schemaFixes };
      }
      addMessage('✅ โครงสร้างฐานข้อมูลถูกต้อง');

      // --- Stage 2: CRUD Permissions Test ---
      addMessage('2. กำลังทดสอบสิทธิ์การใช้งาน (Permissions)...');
      
      // Test Customers
      addMessage('- ทดสอบตาราง `customers` (INSERT, DELETE)');
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

      // Test Inventory (Gas)
      addMessage('- ทดสอบตาราง `inventory` (INSERT, DELETE)');
      const { data: iData, error: iInsertErr } = await supabaseClient.from('inventory').insert({ 
          total: 1, 
          full: 1, 
          on_loan: 0, 
          tank_brand: Brand.OTHER, 
          tank_size: Size.OTHER, 
          category: InventoryCategory.GAS,
          cost_price: 0,
          notes: 'Test' 
      }).select('id').single();
      if (iInsertErr) throw { stage: 'INSERT', table: 'inventory', originalError: iInsertErr };
      inventoryId = iData.id;
      
      // Test Expenses (Strict Mode: Include all new fields)
      addMessage('- ทดสอบตาราง `expenses` (INSERT, DELETE)');
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

      // Test Sales (Strict Mode: Include all new fields)
      addMessage('- ทดสอบตาราง `sales` (INSERT, DELETE)');
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

      // Cleanup
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
        console.error('Database connection test failed:', originalError);
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
              <p className="font-bold mb-2">วิธีแก้ไข (อัปเกรดฐานข้อมูล):</p>
              <p className="mb-2">คัดลอกโค้ด SQL นี้ไปรันใน Supabase SQL Editor:</p>
              <pre className="bg-gray-800 text-white p-2 rounded-md text-xs overflow-x-auto">
                <code>{schemaFixes.map(fix => fix.fix).join('\n')}</code>
              </pre>
            </div>
          )}
          
           {errorType === 'rls' && (
            <div className="mt-3 pt-3 border-t border-red-200 text-xs text-gray-700">
              <p className="font-bold mb-2">วิธีแก้ไข (เปิดสิทธิ์การใช้งาน):</p>
              <p className="mb-2">คัดลอกโค้ด SQL นี้ไปรันใน Supabase SQL Editor:</p>
              <pre className="bg-gray-800 text-white p-2 rounded-md text-xs overflow-x-auto">
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
      <Card>
        <h2 className="text-lg font-semibold mb-2 text-gray-700">วินิจฉัยระบบฐานข้อมูล</h2>
        <button onClick={handleTestConnection} disabled={testResult.status === 'testing'} className="w-full px-4 py-2 bg-sky-500 text-white font-semibold rounded-lg hover:bg-sky-600 disabled:bg-sky-300 transition-colors">
          {testResult.status === 'testing' ? 'กำลังทดสอบ...' : 'เริ่มการทดสอบระบบ'}
        </button>
        {renderStatus()}
      </Card>
    </div>
  );
};

export default Settings;
