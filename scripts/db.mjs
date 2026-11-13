// Sube las migraciones a Supabase o regenera los tipos, usando la contraseña de .env.local.
// Uso: npm run db:subir   ·   npm run db:tipos
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const pw = env.SUPABASE_DB_PASSWORD;
if (!pw) {
  console.error('Falta SUPABASE_DB_PASSWORD en .env.local');
  process.exit(1);
}
// El proyecto está en Irlanda (eu-west-1).
const url = `postgresql://postgres.${ref}:${encodeURIComponent(pw)}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;

if (process.argv[2] === 'push') {
  execSync(`npx supabase db push --yes --db-url "${url}"`, { stdio: 'inherit' });
} else if (process.argv[2] === 'tipos') {
  const tipos = execSync(`npx supabase gen types typescript --schema public --db-url "${url}"`, { encoding: 'utf8' });
  fs.writeFileSync(
    'src/lib/supabase/tipos-bd.ts',
    '// Tipos generados automáticamente desde la base de datos de Supabase. NO editar a mano.\n// Para regenerarlos: npm run db:tipos\n\n' + tipos,
  );
  console.log('✓ Tipos actualizados en src/lib/supabase/tipos-bd.ts');
}
