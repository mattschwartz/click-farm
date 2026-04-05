// Post zone — the click-to-post button (UX §8).
//
// Click feedback: button press (scale 0.97, 60ms down / 120ms up), a
// floating +N number rising from the button (500ms), and the engagement
// counter tick itself (handled upstream in TopBar). Rapid clicks stack by
// offsetting floaters horizontally so they don't overlap.

import { useCallback, useRef, useState } from 'react';
import { fmtCompact } from './format.ts';

interface FloatItem {
  id: number;
  value: number;
  offsetX: number;
}

interface Props {
  onClick: () => void;
  /** Engagement per click at the current state. Used for the float label. */
  perClick: number;
  /** Context sub-label — e.g. "Selfie → Chirper" or "+ auto". */
  contextLabel: string;
}

const FLOAT_TTL_MS = 500;
const STACK_OFFSET_MAX_PX = 40;

export function PostZone({ onClick, perClick, contextLabel }: Props) {
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const nextId = useRef(0);

  const handleClick = useCallback(() => {
    onClick();
    const id = nextId.current++;
    // Stack by offsetting each new float a bit horizontally when spammed.
    const offsetX = (Math.random() - 0.5) * STACK_OFFSET_MAX_PX;
    setFloats((prev) => [...prev, { id, value: perClick, offsetX }]);
    window.setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, FLOAT_TTL_MS);
  }, [onClick, perClick]);

  return (
    <section className="post-zone">
      <button
        className="post-button"
        onClick={handleClick}
        aria-label="Post content"
      >
        <span className="primary">Post</span>
        <span className="context">{contextLabel}</span>
      </button>
      <div className="post-rate">Per click: +{fmtCompact(perClick)}</div>

      {floats.map((f) => (
        <span
          key={f.id}
          className="float-number"
          style={{
            left: `calc(50% + ${f.offsetX}px)`,
            top: '40%',
          }}
        >
          +{fmtCompact(f.value)}
        </span>
      ))}
    </section>
  );
}
