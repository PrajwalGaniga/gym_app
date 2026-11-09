'use client';

import React, { useState } from 'react';
import styles from './portal.module.css';
import { PortalTheme } from './types';

interface PortalLoginProps {
  theme: PortalTheme;
  onLogin: (memberCode: string, phoneLast2: string, rememberMe: boolean) => Promise<void>;
  isLoading: boolean;
  errorMessage: string;
  initialMemberCode?: string;
  initialPhoneLast2?: string;
}

export const PortalLogin: React.FC<PortalLoginProps> = ({
  theme,
  onLogin,
  isLoading,
  errorMessage,
  initialMemberCode = '',
  initialPhoneLast2 = '',
}) => {
  const [memberCode, setMemberCode] = useState(initialMemberCode);
  const [phoneLast2, setPhoneLast2] = useState(initialPhoneLast2);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberCode.trim() || phoneLast2.trim().length !== 2) return;
    onLogin(memberCode.trim(), phoneLast2.trim(), rememberMe);
  };

  const heroImageSrc =
    theme === 'dark' ? '/assets/hero-full-dark.png' : '/assets/hero-full-light.png';

  return (
    <div className={styles.loginWrapper}>
      {/* Hero Mascot & 3D Logo Card */}
      <div className={styles.heroArtCard}>
        <img
          src={heroImageSrc}
          alt="Muscle Hunt - Track. Train. Grow."
          className={styles.heroArtImage}
        />
      </div>

      {/* Login Card */}
      <div className={styles.loginCard}>
        <h2 className={styles.loginTitle}>Enter Gym Portal</h2>

        {errorMessage && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1.5px solid #ef4444',
              color: '#f87171',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Member ID Input */}
          <div className={styles.inputGroup}>
            <label htmlFor="loginMemberId" className={styles.inputLabel}>
              <span>Gym Member ID</span>
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>👤</span>
              <input
                id="loginMemberId"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                required
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                placeholder="(e.g. 488 or MH-102)"
                className={styles.pixelInput}
              />
            </div>
          </div>

          {/* Phone Last 2 Digits Input */}
          <div className={styles.inputGroup}>
            <label htmlFor="loginPhoneLast2" className={styles.inputLabel}>
              <span>Last 2 Digits of Phone</span>
            </label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>📱</span>
              <input
                id="loginPhoneLast2"
                type="tel"
                inputMode="numeric"
                maxLength={2}
                required
                value={phoneLast2}
                onChange={(e) => setPhoneLast2(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="(e.g. 72)"
                className={styles.pixelInput}
              />
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <label className={styles.rememberMeRow}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className={styles.pixelCheckbox}
            />
            <span>Remember Me</span>
          </label>

          {/* Primary Submit Button */}
          <button type="submit" disabled={isLoading} className={styles.loginCtaBtn}>
            {isLoading ? (
              <span>⏳ Accessing Portal...</span>
            ) : (
              <>
                <span>⚡</span>
                <span>Enter Gym Portal</span>
              </>
            )}
          </button>
        </form>

        <p className={styles.loginHelperText}>
          Location is checked only when you tap check-in at the gym. View your streak & calendar anytime!
        </p>

        <div style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
          Powered by Muscle Hunt 💪
        </div>
      </div>
    </div>
  );
};

