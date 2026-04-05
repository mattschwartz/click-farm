// Post zone — the click-to-post button (UX §8).
//
// Click feedback: button press (scale 0.97, 60ms down / 120ms up), a
// floating +N number rising from the button (500ms), and the engagement
// counter tick itself (handled upstream in TopBar). Rapid clicks stack by
// offsetting floaters horizontally so they don't overlap.
//
// Per purchase-feedback-and-rate-visibility.md §4.1:
// - Confirmation flash: on release, the button's background briefly brightens
//   (10% lightness bump) then fades out over 150ms.

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
const CONFIRM_FLASH_MS = 150;

export function PostZone({ onClick, perClick, contextLabel }: Props) {
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const nextId = useRef(0);
  const [confirmFlash, setConfirmFlash] = useState(false);

  const handleClick = useCallback(() => {
    onClick();

    // Confirm flash — brightens then fades (§4.1).
    setConfirmFlash(true);
    window.setTimeout(() => setConfirmFlash(false), CONFIRM_FLASH_MS);

    // Floating delta number.
    const id = nextId.current++;
    const offsetX = (Math.random() - 0.5) * STACK_OFFSET_MAX_PX;
    setFloats((prev) => [...prev, { id, value: perClick, offsetX }]);
    window.setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, FLOAT_TTL_MS);
  }, [onClick, perClick]);

  return (
    <section className="post-zone">
      <button
        className={`post-button${confirmFlash ? ' post-confirm-flash' : ''}`}
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
