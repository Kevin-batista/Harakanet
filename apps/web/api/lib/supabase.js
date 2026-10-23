import { createClient } from '@supabase/supabase-js';

// CONNECT: service-role client. Server only, never import this in React code.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);