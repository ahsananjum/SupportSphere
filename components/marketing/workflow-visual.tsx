'use client';

import { AnimatedGroup } from '../motion-primitives/animated-group';

export function WorkflowVisual() {
  return (
    <div
      className="workflow-visual"
      role="img"
      aria-label="Illustrative flow from a customer question to knowledge-backed guidance and a human decision"
    >
      <div className="visual-topline">
        <span>SUPPORT FLOW / CONCEPT</span>
        <span>01 — 03</span>
      </div>
      <AnimatedGroup className="visual-track" preset="fade">
        <div className="visual-node visual-question">
          <span className="visual-node-label">Incoming question</span>
          <strong>Where can I find the right answer?</strong>
          <span className="visual-node-meta">Customer context</span>
        </div>
        <div className="visual-node visual-knowledge">
          <span className="visual-node-label">Relevant knowledge</span>
          <strong>Evidence stays attached.</strong>
          <span className="visual-node-meta">Source → answer</span>
        </div>
        <div className="visual-node visual-human">
          <span className="visual-node-label">Human decision</span>
          <strong>Someone owns the next step.</strong>
          <span className="visual-node-meta">Clear handoff</span>
        </div>
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
        <circle cx="260" cy="40" r="8" fill="currentColor" />
      </svg>
      <p className="visual-caption">
        Illustrative product direction · no customer data shown
      </p>
    </div>
  );
}
