// Top bar — Algorithm state label + Engagement (P0) + Followers (P1).
// Per UX spec §2 and §5. The algorithm label plays a 1.2s slide-out /
// slide-in transition when current_state_index advances (§4.4).

import { useEffect, useRef, useState } from 'react';
import type { AlgorithmState } from '../types.ts';
import { ALGORITHM_MOOD } from './display.ts';
import { fmtCompact, fmtCompactInt, fmtRate } from './format.ts';

interface Props {
  algorithm: AlgorithmState;
  engagement: number;
  engagementRate: number;
  totalFollowers: number;
}

type TransitionPhase = 'idle' | 'exiting' | 'entering';

export function TopBar({
  algorithm,
  engagement,
  engagementRate,
  totalFollowers,
}: Props) {
  // Track algorithm state transitions — when current_state_index changes,
  // we slide the old label out and the new one in (UX §4.4, 1.2s total).
  const [displayedStateId, setDisplayedStateId] = useState(
    algorithm.current_state_id,
  );
  const [phase, setPhase] = useState<TransitionPhase>('idle');
  const prevIndex = useRef(algorithm.current_state_index);

  useEffect(() => {
    if (algorithm.current_state_index === prevIndex.current) return;
    prevIndex.current = algorithm.current_state_index;
    const newId = algorithm.current_state_id;
    setPhase('exiting');
    const t1 = window.setTimeout(() => {
      setDisplayedStateId(newId);
      setPhase('entering');
    }, 200);
    const t2 = window.setTimeout(() => {
      setPhase('idle');
    }, 600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [algorithm.current_state_index, algorithm.current_state_id]);

  // Track follower decreases for a brief red flash (UX §5.2).
  const [decreased, setDecreased] = useState(false);
  const prevFollowers = useRef(totalFollowers);
  useEffect(() => {
    if (totalFollowers < prevFollowers.current) {
      setDecreased(true);
      const t = window.setTimeout(() => setDecreased(false), 200);
      prevFollowers.current = totalFollowers;
      return () => window.clearTimeout(t);
    }
    prevFollowers.current = totalFollowers;
  }, [totalFollowers]);

  const mood = ALGORITHM_MOOD[displayedStateId];

  return (
    <header className="top-bar">
      <div className="algo-label">
        <div className="name-slot">
          <span className={`name ${phase === 'exiting' ? 'exiting' : phase === 'entering' ? 'entering' : ''}`}>
            {mood?.name ?? displayedStateId}
          </span>
        </div>
        <div className="tagline">{mood?.tagline ?? ''}</div>
      </div>

      <div className="engagement-slot">
        <div className="engagement-value">{fmtCompact(engagement)}</div>
        <div className="engagement-rate">{fmtRate(engagementRate)}</div>
      </div>

      <div className="followers-slot">
        <div className="followers-label">followers</div>
        <div className={`followers-value${decreased ? ' decreased' : ''}`}>
          {fmtCompactInt(totalFollowers)}
        </div>
      </div>
    </header>
  );
}
