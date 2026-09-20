import type { AgentProfile } from '@sinkroo/core';

/**
 * Default swarm: a set of personas covering the relevant angles when judging
 * a marketing creative piece.
 *
 * Each agent has distinct priorities; the engine aggregates their votes.
 * Custom swarms can be injected via SwarmEngine({ agents }).
 */
export const DEFAULT_AGENTS: AgentProfile[] = [
  {
    id: 'impulsive_buyer',
    persona: 'Impulsive buyer',
    priorities: ['hook', 'emotion', 'urgency'],
  },
  {
    id: 'skeptical_cm',
    persona: 'Skeptical community manager',
    priorities: ['credibility', 'clarity'],
  },
  {
    id: 'data_analyst',
    persona: 'Performance analyst',
    priorities: ['ctr', 'relevance', 'differentiation'],
  },
  {
    id: 'brand_guardian',
    persona: 'Brand guardian',
    priorities: ['credibility', 'clarity', 'differentiation'],
  },
  {
    id: 'senior_copywriter',
    persona: 'Senior copywriter',
    priorities: ['hook', 'clarity', 'differentiation'],
  },
];
