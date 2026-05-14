import { useReducedMotion } from 'framer-motion';

export function useMotionSafe() {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? false : undefined,
    transition: reduce ? { duration: 0 } : undefined,
  };
}

export function safeMotionProps(reduce, props) {
  if (reduce) return { initial: false, animate: props.animate, transition: { duration: 0 } };
  return props;
}