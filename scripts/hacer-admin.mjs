// Convierte una cuenta en administradora de nebúla y la aprueba.
// Uso:  npm run hacer-admin -- tu@email.com
// Necesita en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY.
import { createClient } from '@supabase/supabase-js';

const email = (process.argv[2] || '').trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secreta = process.env.SUPABASE_SECRET_KEY;

if (!email) {
  console.error('Falta el email. Ejemplo: npm run hacer-admin -- tu@email.com');
  process.exit(1);
}
if (!url || !secreta) {
  console.error('Faltan claves en .env.local (NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY).');
  process.exit(1);
}

const sb = createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } });

let usuario = null;
for (let page = 1; !usuario; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  usuario = data.users.find((u) => (u.email || '').toLowerCase() === email) || null;
  if (data.users.length < 200) break;
}
if (!usuario) {
  console.error(`No hay ninguna cuenta con el email ${email}. Primero regístrate en la app con «Crear usuario».`);
  process.exit(1);
}

const { error: e1 } = await sb.from('app_admins').upsert({ user_id: usuario.id });
if (e1) throw e1;
const { error: e2 } = await sb.rpc('admin_set_status', { target: usuario.id, new_status: 'aprobado' });
if (e2) throw e2;

console.log(`✓ ${email} ya es administradora y su cuenta está aprobada.`);
if (!usuario.email_confirmed_at) console.log('  Ojo: todavía no ha confirmado su email. Busca el mensaje de confirmación en tu correo.');
