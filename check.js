import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Fetching events...');
  const { data, error } = await supabase.from('events').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data?.length || 0} events.`);
  }

  const { data: types, error: tErr } = await supabase.from('event_types').select('*');
  if (tErr) {
    console.error('Types Error:', tErr);
  } else {
    console.log(`Found ${types?.length || 0} types.`);
  }
}

check();
