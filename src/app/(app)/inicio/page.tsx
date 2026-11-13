'use client';

import Link from 'next/link';
import { SECCIONES } from '@/lib/catalogos/nav';
import { fechaLarga, saludo } from '@/lib/reglas/textos';
import { useNebula } from '@/components/app/Nebula';
import { Cabecera } from '@/components/ui/Cabecera';
import { Icono } from '@/components/ui/Icono';

const FASES: [number, string, string][] = [
  [1, 'Núcleo CRM', 'Empresas, contactos, oportunidades, proyectos, tareas, calendario, notas, buscador y avisos.'],
  [2, 'Dinero', 'Presupuestos, facturas con numeración y PDF, gastos, igualas, renovaciones e informes.'],
  [3, 'Trabajo creativo', 'Briefing, entregables y rondas, horas y cronómetro, carga de trabajo, contenidos y colaboradores.'],
  [4, 'Cliente', 'Portal del cliente, contratos con firma, cobros online, formulario web, reservas y automatizaciones.'],
  [5, 'Integraciones y cierre', 'Gmail, Outlook, Google Calendar, protección de datos, modo sin conexión y Verifactu.'],
];

export default function Inicio() {
  const { perfil, modo } = useNebula();
  const ahora = new Date();
  const fechaTexto = fechaLarga(ahora);

  return (
    <>
      <Cabecera antetitulo={fechaTexto} titulo={`${saludo(ahora.getHours())}, ${perfil.name || 'hola'}`} className="hello">
        {modo === 'demo'
          ? 'Estás probando nebúla. Puedes tocarlo todo: tus cambios solo se guardan en este navegador.'
          : 'Esta es la base de nebúla. Las secciones se irán activando fase a fase.'}
      </Cabecera>

      <div className="grid g-home">
        <section className="card">
          <div className="card-h">
            <h2>
              <Icono n="layers" />
              Lo que llega a nebúla
            </h2>
          </div>
          <div className="list">
            {FASES.map(([n, t, d]) => (
              <div className="follow" key={n}>
                <span className={`tl-ic ${n === 1 ? 'peach' : 'mist'}`}>
                  <b className="num">{n}</b>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>
                    Fase {n} · {t}
                  </b>
                  <div className="chip" style={{ whiteSpace: 'normal' }}>
                    {d}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-h">
            <h2>
              <Icono n="spark" />
              Ya puedes
            </h2>
          </div>
          <div className="list">
            <Link href="/perfil" className="follow enlace-fila">
              <span className="tl-ic sage">
                <Icono n="user" />
              </span>
              <div style={{ flex: 1 }}>
                <b>Revisar tu perfil</b>
                <div className="chip">Tus datos, cómo facturas y tus preferencias</div>
              </div>
              <Icono n="right" />
            </Link>
            <div className="follow">
              <span className="tl-ic lilac">
                <Icono n="search" />
              </span>
              <div style={{ flex: 1 }}>
                <b>Moverte con el teclado</b>
                <div className="chip ajusta">
                  <kbd>⌘K</kbd> (en Windows <kbd>Ctrl K</kbd>) o <kbd>/</kbd> para ir a cualquier sección
                </div>
              </div>
            </div>
            <div className="follow">
              <span className="tl-ic butter">
                <Icono n="moon" />
              </span>
              <div style={{ flex: 1 }}>
                <b>Elegir modo claro u oscuro</b>
                <div className="chip">Con el botón de la luna o desde tu perfil</div>
              </div>
            </div>
            <div className="follow">
              <span className="tl-ic peach">
                <Icono n="folder" />
              </span>
              <div style={{ flex: 1 }}>
                <b>Ver qué hará cada sección</b>
                <div className="chip">{SECCIONES.length - 1} secciones preparadas en el menú</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
