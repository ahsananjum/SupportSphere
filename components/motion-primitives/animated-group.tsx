'use client';

import type { ReactNode } from 'react';
import { motion } from 'motion/react';

type AnimatedGroupProps = {
  children: ReactNode;
  className?: string;
  preset?: 'fade' | 'slide';
};

export function AnimatedGroup({
  children,
  className,
  preset = 'fade',
}: AnimatedGroupProps) {
  const item =
    preset === 'slide'
      ? { hidden: { opacity: 1, y: 14 }, visible: { opacity: 1, y: 0 } }
      : { hidden: { opacity: 1, y: 8 }, visible: { opacity: 1, y: 0 } };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.11 } } }}
    >
      {Array.isArray(children) ? (
        children.map((child, index) => (
          <motion.div
            key={index}
            variants={item}
            transition={{ duration: 0.38 }}
          >
            {child}
          </motion.div>
        ))
      ) : (
        <motion.div variants={item}>{children}</motion.div>
      )}
    </motion.div>
  );
}
