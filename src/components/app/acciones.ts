'use client';

import { useRouter } from 'next/navigation';
import { FASES_OPORTUNIDAD, FASES_PROYECTO } from '@/lib/catalogos/crm';
import { PLANTILLAS, esPlantilla } from '@/lib/catalogos/plantillas';
import type { FaseOportunidad, FaseProyecto, Oportunidad, Proyecto, Tarea } from '@/lib/datos/entidades';
import type { Destino } from '@/lib/reglas/avisos';
import { aplicarPlantilla, cambiosDeFase, moverOportunidad } from '@/lib/reglas/proyectos';
import { useToast } from '@/components/ui/Toasts';
import { ahoraISO, nuevoId, useDatos } from './Datos';
import { useNebula } from './Nebula';
import { useFormularios } from './formularios/Formulario';

/** Tarea nueva con los valores por defecto (importante, 2 h, para mí). */
export function tareaNueva(o: Partial<Tarea> & Pick<Tarea, 'title'>): Tarea {
  return {
    id: nuevoId(),
    due: null,
    urgent: false,
    important: true,
    done: false,
    projectId: null,
    contactId: null,
    assigneeId: null,
    estimate: 2,
    repeat: '',
    blockedBy: null,
    nextCreated: false,
    phase: null,
    createdAt: ahoraISO(),
    ...o,
  };
}

/** Lleva a donde apunta un aviso o un resultado del buscador. */
export function useIrA() {
  const router = useRouter();
  const abrir = useFormularios();
  return (d: Destino) => {
    if ('ruta' in d) router.push(d.ruta);
    else abrir(d.formulario, { id: d.id });
  };
}

/** Acciones del CRM que tocan varias cosas a la vez (ganar una oportunidad, aplicar una plantilla…). */
export function useAccionesCrm() {
  const { c, hoy, crear, crearVarios, actualizar } = useDatos();
  const { ajustes } = useNebula();
  const toast = useToast();
  const router = useRouter();
  const abrir = useFormularios();

  /** Crea las tareas y entregables de una plantilla en un proyecto que ya existe. */
  const ponerPlantilla = async (p: Proyecto, clave: string) => {
    if (!esPlantilla(clave)) return false;
    const { tasks, deliverables } = aplicarPlantilla(p, clave, hoy, nuevoId, ahoraISO());
    return (await crearVarios('tasks', tasks)) && (await crearVarios('deliverables', deliverables));
  };

  /**
   * Mueve una oportunidad de fase. Si se gana y no tiene proyecto, lo crea con la plantilla de su disciplina.
   * `desdeFormulario`: la oportunidad ya está guardada con su nueva fase; solo falta lo que provoca.
   */
  /** Devuelve el proyecto de la oportunidad (el nuevo, si se acaba de crear). `callado`: sin avisos (lo avisa quien llama). */
  const mover = async (d: Oportunidad, fase: FaseOportunidad, desdeFormulario = false, callado = false): Promise<string | null> => {
    if (!desdeFormulario && d.stage === fase) return d.projectId;
    const r = moverOportunidad(d, fase, { c, hoy, tarifa: ajustes.rate, nuevoId, ahora: ahoraISO(), desdeFormulario });
    // Ganar la oportunidad acepta sus presupuestos pendientes.
    if (fase === 'ganado')
      for (const q of c.invoices.filter((f) => f.kind === 'presupuesto' && f.dealId === d.id && f.status !== 'aceptado' && f.status !== 'rechazado'))
        await actualizar('invoices', q.id, { status: 'aceptado' });
    if (r.proyecto) {
      const { project, tasks, deliverables, plantilla } = r.proyecto;
      if (!(await crear('projects', project))) return null;
      await crearVarios('tasks', tasks);
      await crearVarios('deliverables', deliverables);
      await actualizar('deals', d.id, r.cambios);
      if (!callado)
        toast(`¡Ganada! Proyecto creado${plantilla ? ` con la plantilla «${plantilla}»` : ''}`, {
          label: 'Ver proyecto',
          fn: () => router.push(`/proyectos?p=${project.id}`),
        });
      return project.id;
    }
    if (!desdeFormulario && !(await actualizar('deals', d.id, r.cambios))) return d.projectId;
    if (callado) return d.projectId;
    if (fase === 'perdido' && !d.lostReason) toast('Oportunidad perdida', { label: 'Apuntar motivo', fn: () => abrir('deal', { id: d.id }) });
    else if (fase === 'ganado') toast('Oportunidad ganada');
    else if (!desdeFormulario) toast(`Movida a «${FASES_OPORTUNIDAD[fase].label}»`);
    return d.projectId;
  };

  /** Cambia la fase de un proyecto (o lo pausa / reanuda). */
  const cambiarFase = async (p: Proyecto, fase: FaseProyecto) => {
    const cambios = cambiosDeFase(p, fase);
    if (!Object.keys(cambios).length) return;
    if (await actualizar('projects', p.id, cambios)) toast(fase === 'pausa' ? 'Proyecto en pausa' : `Fase: ${FASES_PROYECTO[fase].label}`);
  };

  return { ponerPlantilla, mover, cambiarFase, plantillas: PLANTILLAS };
}
