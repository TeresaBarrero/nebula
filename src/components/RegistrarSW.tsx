'use client';

import { useEffect } from 'react';

/** Registra el service worker para que el móvil ofrezca «Instalar» / «Añadir a pantalla de inicio». */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }, []);
  return null;
}
