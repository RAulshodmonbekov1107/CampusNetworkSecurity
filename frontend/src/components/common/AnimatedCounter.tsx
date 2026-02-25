import React, { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  format = (n) => n.toLocaleString(),
  duration = 1.2,
  className,
  style,
}) => {
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (latest) => format(Math.round(latest)));
  const [text, setText] = useState(format(0));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => setText(v));
    return unsubscribe;
  }, [display]);

  return (
    <motion.span ref={ref} className={className} style={style}>
      {text}
    </motion.span>
  );
};

export default AnimatedCounter;
