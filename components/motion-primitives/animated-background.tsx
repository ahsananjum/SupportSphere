'use client';

import { Children, cloneElement, useId, useState } from 'react';
import type { HTMLAttributes, ReactElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { usePrefersReducedMotion } from './reduced-motion';

type Item = ReactElement<
  HTMLAttributes<HTMLElement> & { 'data-id': string; 'data-checked'?: string }
>;

export function AnimatedBackground({
  children,
  defaultValue,
  className,
}: {
  children: Item | Item[];
  defaultValue?: string;
  className?: string;
}) {
  const [clickedId, setClickedId] = useState<string | null>(null);
  const selectedId = defaultValue ?? clickedId;
  const uniqueId = useId();
  const reduceMotion = usePrefersReducedMotion();

  return Children.map(children, (child) => {
    const id = child.props['data-id'];
    return cloneElement(
      child,
      {
        className: ['relative inline-flex', child.props.className]
          .filter(Boolean)
          .join(' '),
        'data-checked': selectedId === id ? 'true' : 'false',
        onClick: () => setClickedId(id),
      },
      <>
        <AnimatePresence initial={false}>
          {selectedId === id && (
            <motion.span
              aria-hidden="true"
              layoutId={`background-${uniqueId}`}
              className={`absolute inset-0 ${className ?? ''}`}
              transition={{ duration: reduceMotion ? 0 : 0.22 }}
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
        <span className="relative z-10">{child.props.children}</span>
      </>,
    );
  });
}
