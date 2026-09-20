import type { AgentProfile, Creative, CreativeDimension } from '@sinkroo/core';

/**
 * GAIA prompts for the swarm.
 *
 * Building each agent's prompt separately is what makes GAIA different from a
 * heuristic: GAIA EMBODIES each persona and judges from that standpoint. The
 * prompt translates the agent profile (persona + priorities) into a concrete
 * evaluation task, asking for a reasoned vote per dimension.
 */

/** Short per-dimension rubric to guide the agent's judgment. */
const RUBRIC: Record<CreativeDimension, string> = {
  clarity:
    'Is the message understood on first read? No ambiguity or confusing jargon?',
  hook:
    'Do the first words stop the scroll? Do they spark curiosity or immediate desire?',
  credibility:
    'Does it sound credible and verifiable? Does it avoid exaggerated promises that breed distrust?',
  urgency:
    'Is there a real reason to act now rather than later? Without resorting to cheap pressure?',
  relevance:
    'Does it speak directly to the target audience and their pain/context?',
  differentiation:
    'Does it stand out from the competition? Has its own angle or is it generic?',
  emotion:
    'Does it trigger an emotional response (desire, relief, aspiration, safety)?',
  ctr: 'How likely is someone to click? Is the promise + call to action strong?',
};

/** Builds the system prompt for an agent. */
export function systemPrompt(agent: AgentProfile): string {
  const dims = agent.priorities.map((d) => `- ${d}: ${RUBRIC[d]}`).join('\n');
  return [
    `You are an ad evaluator embodying: "${agent.persona}".`,
    `Judge the piece solely from that standpoint, with NO corporate filters.`,
    ``,
    `You must evaluate ONLY these dimensions (the ones your profile prioritizes):`,
    dims,
    ``,
    `MANDATORY output: return strict JSON, no markdown or prose, in this shape:`,
    `{"votes":[{"dimension":"<name>","score":<0-100>,"rationale":"<1 sentence in English, why>"}]}`,
    `One vote PER priority dimension. Integer scores 0-100. Short, piece-specific rationale.`,
  ].join('\n');
}

/** Builds the user prompt (the piece to judge). */
export function userPrompt(creative: Creative): string {
  const parts = [`Ad copy:`, creative.copy || '(no copy)'];
  if (creative.audience) parts.push(`Target audience: ${creative.audience}`);
  if (creative.channel) parts.push(`Channel: ${creative.channel}`);
  if (creative.imageUrl) parts.push(`Image (URL): ${creative.imageUrl}`);
  return parts.join('\n');
}
