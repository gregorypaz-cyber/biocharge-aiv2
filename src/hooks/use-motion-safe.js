import { useReducedMotion } from 'framer-motion';
import { duration, easing } from '@/lib/motion-tokens';

export function useMotionSafe() {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? false : undefined,
    transition: reduce
      ? { duration: 0 }
      : { duration: duration.base / 1000, ease: easing.out },
  };
}

export function safeMotionProps(reduce, props) {
  if (reduce) return { initial: false, animate: props.animate, transition: { duration: 0 } };
  return props;
}