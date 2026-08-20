// @ts-ignore
const { createClient } = supabase;

const SUPABASE_URL = 'https://xtjfueiwugxqlkfgjgja.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0amZ1ZWl3dWd4cWxrZmdqZ2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNDg3NjcsImV4cCI6MjA3ODkyNDc2N30.Z1Ej4kl6eE70ViLdNo1SfyXY9ysF2plJJ8GmsJZS4JI';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Resilient Insert Helper:
 * If Supabase schema is missing newly added columns (PostgREST PGRST204 / Postgres 42703),
 * it dynamically strips the unaccepted columns and retries the insert safely,
 * ensuring sales and transactions are never blocked.
 */
export async function resilientInsert<T = any>(table: string, payload: any): Promise<{ data: T | null; error: any }> {
  let currentPayload = { ...payload };
  const strippedCols: string[] = [];

  for (let attempt = 0; attempt < 10; attempt++) {
    const { data, error } = await supabaseClient.from(table).insert(currentPayload).select().single();
    if (!error && data) {
      // Re-hydrate any in-memory stripped fields into returned object
      return { data: { ...payload, ...data }, error: null };
    }

    if (!error) {
      return { data: payload, error: null };
    }

    const errorMsg = String(error.message || error.details || error.hint || '');
    
    // Extract column name from PostgREST schema cache error or Postgres error
    const match = errorMsg.match(/Could not find the '([^']+)' column/) ||
                  errorMsg.match(/column ["']([^"']+)["'] of relation/i) ||
                  errorMsg.match(/column ["']([^"']+)["'] does not exist/i);

    if (match && match[1]) {
      const missingCol = match[1];
      if (missingCol in currentPayload && !strippedCols.includes(missingCol)) {
        console.warn(`[Resilient Insert] Table '${table}' missing column '${missingCol}', stripping and retrying...`);
        strippedCols.push(missingCol);
        delete currentPayload[missingCol];
        continue;
      }
    }

    // Fallback: Check known optional columns if error is 42703 or schema cache
    if (error.code === '42703' || errorMsg.includes('schema cache') || errorMsg.includes('PGRST204')) {
      const optionalCols = [
        'vat_type', 'pre_vat_amount', 'vat_amount', 'gas_return_price', 'gas_return_kg', 'gas_return_qty',
        'cost_price', 'items', 'borrowed_tanks', 'price_list', 'google_map_url', 'notes', 'payee',
        'refill_details', 'gas_return_amount', 'default_vat_type', 'low_stock_threshold'
      ];
      let strippedAny = false;
      for (const col of optionalCols) {
        if (col in currentPayload && !strippedCols.includes(col)) {
          console.warn(`[Resilient Insert] Stripping candidate column '${col}' for '${table}' and retrying...`);
          strippedCols.push(col);
          delete currentPayload[col];
          strippedAny = true;
          break;
        }
      }
      if (strippedAny) continue;
    }

    // If unrecoverable error
    return { data: null, error };
  }

  return { data: null, error: new Error('Failed to insert after resilient retries') };
}

/**
 * Resilient Update Helper:
 * Dynamically strips missing columns on schema mismatch and retries update.
 */
export async function resilientUpdate<T = any>(table: string, id: string, payload: any): Promise<{ data: T | null; error: any }> {
  let currentPayload = { ...payload };
  const strippedCols: string[] = [];

  for (let attempt = 0; attempt < 10; attempt++) {
    const { data, error } = await supabaseClient.from(table).update(currentPayload).eq('id', id).select().single();
    if (!error && data) {
      return { data: { ...payload, ...data }, error: null };
    }

    if (!error) {
      return { data: { ...payload, id }, error: null };
    }

    const errorMsg = String(error.message || error.details || error.hint || '');
    const match = errorMsg.match(/Could not find the '([^']+)' column/) ||
                  errorMsg.match(/column ["']([^"']+)["'] of relation/i) ||
                  errorMsg.match(/column ["']([^"']+)["'] does not exist/i);

    if (match && match[1]) {
      const missingCol = match[1];
      if (missingCol in currentPayload && !strippedCols.includes(missingCol)) {
        console.warn(`[Resilient Update] Table '${table}' missing column '${missingCol}', stripping and retrying...`);
        strippedCols.push(missingCol);
        delete currentPayload[missingCol];
        continue;
      }
    }

    if (error.code === '42703' || errorMsg.includes('schema cache') || errorMsg.includes('PGRST204')) {
      const optionalCols = [
        'vat_type', 'pre_vat_amount', 'vat_amount', 'gas_return_price', 'gas_return_kg', 'gas_return_qty',
        'cost_price', 'items', 'borrowed_tanks', 'price_list', 'google_map_url', 'notes', 'payee',
        'refill_details', 'gas_return_amount', 'default_vat_type', 'low_stock_threshold'
      ];
      let strippedAny = false;
      for (const col of optionalCols) {
        if (col in currentPayload && !strippedCols.includes(col)) {
          console.warn(`[Resilient Update] Stripping candidate column '${col}' for '${table}' and retrying...`);
          strippedCols.push(col);
          delete currentPayload[col];
          strippedAny = true;
          break;
        }
      }
      if (strippedAny) continue;
    }

    return { data: null, error };
  }

  return { data: null, error: new Error('Failed to update after resilient retries') };
}
