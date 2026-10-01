'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AnimatedGroup } from '../motion-primitives/animated-group';

const stages = [
  {
    id: 'question',
    label: 'Incoming question',
    title: 'Where can I find the right answer?',
    meta: 'Customer context',
    detail:
      'The planned inbox starts with the customer’s question and history in view.',
  },
  {
    id: 'knowledge',
    label: 'Relevant knowledge',
    title: 'Evidence stays attached.',
    meta: 'Source → answer',
    detail: 'Approved knowledge is designed to sit beside a proposed response.',
  },
  {
    id: 'human',
    label: 'Human decision',
    title: 'Someone owns the next step.',
    meta: 'Clear handoff',
    detail:
      'An agent reviews the context and decides what reaches the customer.',
  },
] as const;

export function WorkflowVisual() {
  const [active, setActive] =
    useState<(typeof stages)[number]['id']>('question');
  const reduceMotion = useReducedMotion();
  const marker =
    active === 'question' ? 90 : active === 'knowledge' ? 260 : 430;
  return (
    <div
      className="workflow-visual"
      aria-label="Interactive illustration of the planned customer support flow"
    >
      <div className="visual-topline">
        <span>SUPPORT FLOW / CONCEPT</span>
        <span>01 — 03</span>
      </div>
      <AnimatedGroup className="visual-track" preset="fade">
        {stages.map((stage) => (
          <button
            key={stage.id}
            type="button"
            className={`visual-node visual-${stage.id}`}
            aria-pressed={active === stage.id}
            onClick={() => setActive(stage.id)}
          >
            <span className="visual-node-label">{stage.label}</span>
            <strong>{stage.title}</strong>
            <span className="visual-node-meta">{stage.meta}</span>
          </button>
        ))}
      </AnimatedGroup>
      <svg
        className="visual-route"
        viewBox="0 0 520 80"
        fill="none"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <path
          d="M15 40H505"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="5 8"
        />
        <motion.circle
          cx={marker}
          cy="40"
          r="8"
          fill="currentColor"
          initial={false}
          animate={{ cx: marker }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 220, damping: 28 }
          }
        />
      </svg>
      <p className="visual-detail" aria-live="polite">
        {stages.find((stage) => stage.id === active)?.detail}
      </p>
      <p className="visual-caption">
        Illustrative product direction · no customer data shown
      </p>
    </div>
  );
}
