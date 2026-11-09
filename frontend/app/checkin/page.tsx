'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './checkin.module.css';
import { api, ApiError } from '@/lib/api';
import { PortalCheckInResponse, PortalGymInfo } from '@/lib/types';
import { formatDate } from '@/lib/formatters';

export default function MemberCheckInPage() {
  const [gymInfo, setGymInfo] = useState<PortalGymInfo | null>(null);
  const [memberCode, setMemberCode] = useState('');
  const [phoneLast2, setPhoneLast2] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<PortalCheckInResponse | null>(null);
  const [countdown, setCountdown] = useState(30);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Fetch gym identity header
    api
      .getPortalGymInfo()
      .then((info) => setGymInfo(info))
      .catch((err) => console.error('Failed to load gym info:', err));
  }, []);

  // Auto-reset countdown timer when result is shown
  useEffect(() => {
    if (result) {
      setCountdown(30);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleReset();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [result]);

  const handleReset = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setResult(null);
    setMemberCode('');
    setPhoneLast2('');
    setErrorMessage('');
  };

  const executeCheckIn = async (latitude?: number | null, longitude?: number | null) => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const res = await api.portalCheckIn({
        member_code: memberCode.trim(),
        phone_last_2: phoneLast2.trim(),
        latitude,
        longitude,
      });

      // Haptic feedback vibration on mobile devices
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([80, 40, 80]);
        } catch {
          // ignore vibration errors
        }
      }

      setResult(res);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(err.message || 'Verification failed. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!memberCode.trim()) {
      setErrorMessage('Please enter your Gym Member ID.');
      return;
    }
    if (!phoneLast2.trim() || phoneLast2.trim().length !== 2) {
      setErrorMessage('Please enter the exact last 2 digits of your phone number.');
      return;
    }

    // Capture location for geofence check
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          executeCheckIn(pos.coords.latitude, pos.coords.longitude);
        },
        (geoErr) => {
          console.warn('Geolocation error / permission denied:', geoErr);
          // If geofence is active on gym, warn them location is required
          if (gymInfo?.geofence_enabled) {
            setIsLoading(false);
            setErrorMessage(
              '📍 Location permission is required to verify you are at IronPulse Fitness. Please enable location on your phone and try again.'
            );
          } else {
            // Attempt checkin without coordinates if geofence not enforced
            executeCheckIn(null, null);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      executeCheckIn(null, null);
    }
  };

  const initials = result?.full_name
    ? result.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'M';

  return (
    <div className={styles.checkinContainer}>
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />

      <div className={styles.checkinCard}>
        {/* =========================================================================
            1. Brand Header
            ========================================================================= */}
        <div className={styles.brandHeader}>
          <div className={styles.logoBadge}>🏋️</div>
          <h1 className={styles.gymTitle}>{gymInfo?.gym_name || 'IronPulse Fitness'}</h1>
          <p className={styles.gymSubtitle}>Fast Express Check-In & Streak</p>
        </div>

        {/* Error message */}
        {errorMessage && <div className={styles.errorBanner}>⚠️ {errorMessage}</div>}

        {/* =========================================================================
            2. Form View (When not checked in yet)
            ========================================================================= */}
        {!result ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className={styles.formGroup}>
              <label htmlFor="memberId" className={styles.formLabel}>
                <span>Gym Member ID</span>
                <span style={{ color: '#38bdf8', fontSize: '0.75rem' }}>e.g. 488</span>
              </label>
              <input
                id="memberId"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                required
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                placeholder="Enter your ID (e.g. 488)"
                className={styles.formInput}
              />
              <span className={styles.formHelper}>Your registered member number given by coach</span>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phoneLast2" className={styles.formLabel}>
                <span>Last 2 Digits of Phone</span>
                <span style={{ color: '#38bdf8', fontSize: '0.75rem' }}>Security PIN</span>
              </label>
              <input
                id="phoneLast2"
                type="tel"
                inputMode="numeric"
                maxLength={2}
                required
                value={phoneLast2}
                onChange={(e) => setPhoneLast2(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="••"
                className={styles.formInput}
                style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '4px' }}
              />
              <span className={styles.formHelper}>Last 2 digits of your registered mobile number</span>
            </div>

            <button type="submit" disabled={isLoading} className={styles.checkinBtn}>
              {isLoading ? (
                <span>⏳ Verifying Location & Attendance...</span>
              ) : (
                <>
                  <span>💪</span>
                  <span>Verify & Check In</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* =========================================================================
              3. Result View (Animated Celebration, Streak & Dues)
              ========================================================================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Gym Bicep / Flame Animation */}
            <div className={styles.animationContainer}>
              <div className={styles.gymIconWrapper}>
                <div className={styles.flamePulseRing} />
                <span>🔥</span>
              </div>
              <h2 className={styles.streakHeroTitle}>
                {result.streak.current_streak}-Day Workout Streak!
              </h2>

              {result.streak.grace_period_applied && (
                <div className={styles.graceWarningBadge}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <div>
                    <div>Streak Saved by 48h Grace Period!</div>
                    <div style={{ fontSize: '0.72rem', color: '#fde68a', fontWeight: 500 }}>
                      You missed your previous workout (&gt;24h), but checked in within the 48-hour grace window. Keep the momentum going!
                    </div>
                  </div>
                </div>
              )}

              {result.streak.sunday_exempt_applied && (
                <div className={styles.sundayRestBadge}>
                  <span>🏖️</span>
                  <span>Sunday rest day kept your streak safe!</span>
                </div>
              )}
            </div>

            {/* Member Profile Snapshot */}
            <div className={styles.memberHeaderRow}>
              {result.photo_url ? (
                <img src={result.photo_url} alt={result.full_name} className={styles.memberAvatar} />
              ) : (
                <div className={styles.memberInitials}>{initials}</div>
              )}
              <div className={styles.memberMeta}>
                <h3 className={styles.memberName}>{result.full_name}</h3>
                <div className={styles.memberCodeBadge}>
                  ID: <strong>{result.member_code}</strong> •{' '}
                  {result.already_checked_in_today ? (
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>
                      ✅ Checked In Today at {result.check_in_time}
                    </span>
                  ) : (
                    <span style={{ color: '#60a5fa', fontWeight: 700 }}>
                      🎉 Checked In at {result.check_in_time}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Streak & Best Record */}
            <div className={styles.resultGrid}>
              <div className={`${styles.resultCard} ${styles.resultCardHighlight}`}>
                <div className={styles.resultLabel}>
                  <span>🔥</span>
                  <span>Current Streak</span>
                </div>
                <div className={`${styles.resultValue} ${styles.resultValueGreen}`}>
                  {result.streak.current_streak} {result.streak.current_streak === 1 ? 'Day' : 'Days'}
                </div>
              </div>

              <div className={styles.resultCard}>
                <div className={styles.resultLabel}>
                  <span>🏆</span>
                  <span>Best Streak</span>
                </div>
                <div className={styles.resultValue}>
                  {result.streak.best_streak} {result.streak.best_streak === 1 ? 'Day' : 'Days'}
                </div>
              </div>
            </div>

            {/* Membership Validity Box */}
            <div className={styles.membershipBox}>
              <div className={styles.membershipTitleRow}>
                <span>🏆 {result.membership.plan_name}</span>
                <span
                  className={
                    result.membership.status === 'paid'
                      ? styles.badgePaid
                      : result.membership.status === 'expiring_soon'
                      ? styles.badgeWarning
                      : styles.badgeDanger
                  }
                >
                  {result.membership.status === 'paid'
                    ? 'Active'
                    : result.membership.status === 'expiring_soon'
                    ? 'Expiring Soon'
                    : 'Expired'}
                </span>
              </div>

              <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                {result.membership.days_remaining > 0 ? (
                  <div>
                    ⏳ <strong>{result.membership.days_remaining} days remaining</strong> (Valid till{' '}
                    {formatDate(result.membership.expiry_date)})
                  </div>
                ) : result.membership.days_remaining === 0 ? (
                  <div style={{ color: '#facc15', fontWeight: 700 }}>
                    ⚠️ Your membership expires today!
                  </div>
                ) : (
                  <div style={{ color: '#f87171', fontWeight: 700 }}>
                    🔴 Membership expired {Math.abs(result.membership.days_remaining)} days ago!
                  </div>
                )}
              </div>

              {result.membership.status !== 'paid' && (
                <div style={{ fontSize: '0.78rem', color: '#fca5a5', marginTop: '2px' }}>
                  Please speak with Coach to renew your membership fee.
                </div>
              )}
            </div>

            {/* Last Payment Summary */}
            {result.last_payment && (
              <div className={styles.resultCard} style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
                <div className={styles.resultLabel}>
                  <span>💳</span>
                  <span>Last Payment Record</span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#f1f5f9', fontWeight: 600 }}>
                  ₹{result.last_payment.amount.toLocaleString()} via {result.last_payment.payment_method || 'Cash'}{' '}
                  on {formatDate(result.last_payment.payment_date)}
                </div>
              </div>
            )}

            {/* Reset for next person */}
            <button type="button" onClick={handleReset} className={styles.resetBtn}>
              Check In Another Member ({countdown}s)
            </button>
          </div>
        )}

        <div className={styles.footerNote}>
          ⚡ IronPulse Fast Attendance System • 📍 GPS Verified
        </div>
      </div>
    </div>
  );
}

