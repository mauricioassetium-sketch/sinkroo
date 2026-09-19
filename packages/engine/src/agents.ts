import type { AgentProfile } from '@sinkroo/core';

/**
 * Enjambre por defecto: un conjunto de personas que cubren los ángulos
 * relevantes al juzgar una pieza creativa de marketing.
 *
 * Cada agente tiene prioridades distintas; el motor agrega sus votos.
 * Se pueden inyectar enjambres custom vía SwarmEngine({ agents }).
 */
export const DEFAULT_AGENTS: AgentProfile[] = [
  {
    id: 'comprador_impulsivo',
    persona: 'Comprador impulsivo',
    priorities: ['gancho', 'emocion', 'urgencia'],
  },
  {
    id: 'cm_esceptico',
    persona: 'Community manager escéptico',
    priorities: ['credibilidad', 'claridad'],
  },
  {
    id: 'analista_datos',
    persona: 'Analista de performance',
    priorities: ['ccr', 'relevancia', 'diferenciacion'],
  },
  {
    id: 'marca_guardian',
    persona: 'Guardián de marca',
    priorities: ['credibilidad', 'claridad', 'diferenciacion'],
  },
  {
    id: 'copywriter_senior',
    persona: 'Copywriter senior',
    priorities: ['gancho', 'claridad', 'diferenciacion'],
  },
];
