'use client';

import { useState } from 'react';
import type { Ajustes, Perfil } from '@/lib/datos/tipos';
import { supabaseNavegador } from '@/lib/supabase/navegador';
import { Ayuda } from '@/components/ui/Ayuda';
import { Icono } from '@/components/ui/Icono';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toasts';
import { useNebula } from './Nebula';

const num = (v: FormDataEntryValue | null, def: number, min = 0, max = 1e6) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : def;
};
const txt = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max);

/** Editar perfil (como el prototipo): tus datos a la vista; lo fiscal y los cálculos en «Más opciones». */
export function EditarPerfil({ alCerrar }: { alCerrar: () => void }) {
  const { modo, perfil, ajustes, guardarPerfil, guardarAjustes } = useNebula();
  const toast = useToast();
  const [guardando, setGuardando] = useState(false);

  const enviar = async (f: FormData) => {
    setGuardando(true);
    const p: Partial<Omit<Perfil, 'email'>> = {
      fullName: txt(f.get('fullName'), 120) || perfil.fullName,
      name: txt(f.get('name'), 60) || perfil.name,
      role: txt(f.get('role'), 120),
      phone: txt(f.get('phone'), 40),
    };
    const a: Partial<Ajustes> = {
      business: txt(f.get('business'), 120),
      legalName: txt(f.get('legalName'), 160),
      nif: txt(f.get('nif'), 20),
      address: txt(f.get('address'), 300),
      iban: txt(f.get('iban'), 40),
      iva: num(f.get('iva'), ajustes.iva, 0, 100),
      irpf: num(f.get('irpf'), ajustes.irpf, 0, 100),
      payDays: Math.round(num(f.get('payDays'), ajustes.payDays, 0, 365)),
      rate: num(f.get('rate'), ajustes.rate),
      extraRound: num(f.get('extraRound'), ajustes.extraRound),
    };
    const clave = txt(f.get('password'), 200);
    if (clave && clave.length < 8) {
      setGuardando(false);
      toast('La contraseña nueva tiene que tener al menos 8 caracteres');
      return;
    }
    const ok = (await guardarPerfil(p)) && (await guardarAjustes(a));
    if (ok && clave && modo === 'nube') {
      const { error } = await supabaseNavegador().auth.updateUser({ password: clave });
      if (error) {
        setGuardando(false);
        toast('Tus datos se han guardado, pero no hemos podido cambiar la contraseña');
        return;
      }
    }
    setGuardando(false);
    if (ok) {
      alCerrar();
      toast('Perfil actualizado');
    }
  };

  const campo = (k: string, label: string, valor: string, extra: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {}) => (
    <label className={`field ${k === 'address' ? 'full' : ''}`}>
      <span>{label}</span>
      <input className="input" name={k} defaultValue={valor} {...extra} />
    </label>
  );

  return (
    <Modal
      titulo="Editar perfil"
      alCerrar={alCerrar}
      comoFormulario={enviar}
      pie={
        <>
          <button type="button" className="btn ghost" onClick={alCerrar}>
            Cancelar
          </button>
          <button className="btn primary" type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="modal-b">
        <div className="f-section">Tus datos</div>
        {campo('fullName', 'Nombre y apellidos', perfil.fullName, { maxLength: 120, autoComplete: 'name' })}
        {campo('name', '¿Cómo te saludamos?', perfil.name, { maxLength: 60 })}
        {campo('business', 'Estudio o marca', ajustes.business, { maxLength: 120, autoComplete: 'organization' })}
        {campo('role', 'A qué te dedicas', perfil.role, { maxLength: 120 })}
        <label className="field">
          <span>Correo electrónico</span>
          <input className="input" value={perfil.email} readOnly aria-describedby="nota-email" />
          <small id="nota-email" className="muted">
            {modo === 'demo' ? 'En la demo no se puede cambiar.' : 'Es tu correo de acceso. Cambiarlo llega más adelante.'}
          </small>
        </label>
        {campo('phone', 'Teléfono', perfil.phone, { maxLength: 40, type: 'tel', autoComplete: 'tel' })}
        {modo === 'nube' && (
          <label className="field">
            <span>Contraseña nueva</span>
            <input className="input" name="password" type="password" placeholder="Déjalo vacío para no cambiarla" autoComplete="new-password" minLength={8} />
          </label>
        )}

        <details className="more field full">
          <summary className="btn ghost sm">
            <Icono n="right" />
            Más opciones: datos para tus facturas y tus cálculos
          </summary>
          <div className="modal-b sin-relleno">
            <div className="f-section">Para tus facturas</div>
            {campo('legalName', 'Nombre fiscal', ajustes.legalName, { maxLength: 160 })}
            {campo('nif', 'NIF', ajustes.nif, { maxLength: 20 })}
            {campo('address', 'Dirección fiscal', ajustes.address, { maxLength: 300, autoComplete: 'street-address' })}
            {campo('iban', 'Cuenta para cobrar (IBAN)', ajustes.iban, { maxLength: 40 })}
            <label className="field">
              <span>
                IVA <Ayuda k="iva" />
              </span>
              <select className="input" name="iva" defaultValue={String(ajustes.iva)}>
                {[21, 10, 4, 0].map((v) => (
                  <option key={v} value={v}>
                    {v} %
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                Retención <Ayuda k="irpf" />
              </span>
              <select className="input" name="irpf" defaultValue={String(ajustes.irpf)}>
                {[15, 7, 0].map((v) => (
                  <option key={v} value={v}>
                    {v === 0 ? 'Sin retención' : `${v} %`}
                  </option>
                ))}
              </select>
            </label>
            {campo('payDays', 'Días para pagar las facturas', String(ajustes.payDays), { type: 'number', min: 0, max: 365 })}
            <div className="f-section">Para tus cálculos</div>
            {campo('rate', 'Tu tarifa por hora (€)', String(ajustes.rate), { type: 'number', min: 0, step: '0.01' })}
            {campo('extraRound', 'Precio de una ronda de cambios extra (€)', String(ajustes.extraRound), { type: 'number', min: 0, step: '0.01' })}
          </div>
        </details>
      </div>
    </Modal>
  );
}
