import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// Instancia única compartida por todos los módulos del panel administrativo.
// Evita múltiples GoTrueClient usando la misma clave de sesión.
export const db = createClient(SUPABASE_URL, SUPABASE_KEY);
