-- Supabase concede por defecto todos los permisos de las tablas nuevas a «authenticated».
-- Los correos enviados y los enlaces del portal solo los crea el servidor; desde la app solo se ven
-- (y los enlaces se pueden anular). Las ejecuciones de automatizaciones solo se añaden, nunca se cambian.
revoke insert, update, truncate, references, trigger on public.outgoing_emails from authenticated;
revoke delete on public.outgoing_emails from authenticated;
revoke insert, update, truncate, references, trigger on public.portal_tokens from authenticated;
revoke update, delete, truncate, references, trigger on public.automation_runs from authenticated;
revoke truncate, references, trigger on public.contracts, public.reports, public.automations from authenticated;
