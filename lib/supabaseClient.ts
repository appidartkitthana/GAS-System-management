// @ts-ignore
const { createClient } = supabase;

const SUPABASE_URL = 'https://xtjfueiwugxqlkfgjgja.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0amZ1ZWl3dWd4cWxrZmdqZ2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNDg3NjcsImV4cCI6MjA3ODkyNDc2N30.Z1Ej4kl6eE70ViLdNo1SfyXY9ysF2plJJ8GmsJZS4JI';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
