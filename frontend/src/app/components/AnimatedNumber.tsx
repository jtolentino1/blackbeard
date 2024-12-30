'use client';

import React, { useEffect, useRef, useState } from 'react';
import numeral from 'numeral';

interface AnimatedNumberProps {
  value: number;
  decimals?: number; // Number of decimal places
  prefix?: string;   // Text before the number
  suffix?: string;   // Text after the number
  className?: string; // CSS classes for styling
  duration?: number; // Animation duration in milliseconds
  format?: string;   // Optional numeral.js format string
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 2, 
  prefix = '',
  suffix = '',  
  className = '',
  duration = 1000,
  format,          
}) => {
  const [prevValue, setPrevValue] = useState<number>(0);
  const [displayedValue, setDisplayedValue] = useState<string>(() => {
    // Format initial value
    return numeral(value).format(format || `0,0.${'0'.repeat(decimals)}`);
  });

  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // No animation needed if value hasn’t changed
    if (value === prevValue) {
      setDisplayedValue(numeral(value).format(format || `0,0.${'0'.repeat(decimals)}`));
      return;
    }

    let isCancelled = false;
    startTimeRef.current = null;

    const startVal = prevValue;
    const endVal = value;

    const animate = (timestamp: number) => {
      if (isCancelled) return;

      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      let t = Math.min(elapsed / duration, 1);

      // Ease-out cubic animation
      const easedT = 1 - Math.pow(1 - t, 3);

      const current = startVal + (endVal - startVal) * easedT;
      setDisplayedValue(numeral(current).format(format || `0,0.${'0'.repeat(decimals)}`));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        setPrevValue(value);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      isCancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, prevValue, decimals, duration, format]);

  return (
    <div className={className}>
      {prefix}
      {displayedValue}
      {suffix}
    </div>
  );
};
