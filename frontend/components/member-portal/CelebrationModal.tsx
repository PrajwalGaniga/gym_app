'use client';

import React from 'react';
import styles from './portal.module.css';
import { PortalTheme } from './types';

interface CelebrationModalProps {
  theme: PortalTheme;
  streakCount: number;
  fullName: string;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  theme,
  streakCount,
  fullName,
  onClose,
}) => {
  const heroSrc =
    theme === 'dark'
      ? '/assets/celebration-hero-dark.png'
      : '/assets/celebration-hero-light.png';

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.celebrationCard} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className={styles.modalCloseBtn}
          aria-label="Close celebration modal"
        >
          ✕
        </button>

        {/* Big Flame + Workout Recorded Banner Art */}
        <img
          src={heroSrc}
          alt="Workout Recorded!"
          className={styles.flameHeroImg}
        />

        {/* Streak Bump Pill */}
        <div className={styles.streakBumpPill}>
          <span>Streak +1</span>
          <span>⬆</span>
        </div>

        {/* Motivational Line */}
        <p className={styles.quoteText}>
          &ldquo;Stronger than yesterday!&rdquo; 💪
        </p>

        {/* Current Streak Stat */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--card-elevated)',
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'var(--card-border)',
            boxShadow: 'var(--pixel-shadow)',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>🔥</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Current Streak:
          </span>
          <span style={{ fontFamily: 'var(--font-silkscreen, monospace)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
            {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
          </span>
        </div>

        {/* Primary CTA */}
        <button type="button" onClick={onClose} className={styles.celebrateDoneBtn}>
          Great Workout! 💪
        </button>

        {/* Decorative Pixel Dumbbell */}
        <div style={{ marginTop: '2px', opacity: 0.85 }}>
          <img
            src="/assets/dumbbell-sticker.png"
            alt="Dumbbell"
            style={{ height: '24px', objectFit: 'contain', imageRendering: 'pixelated' }}
          />
        </div>
      </div>
    </div>
  );
};

