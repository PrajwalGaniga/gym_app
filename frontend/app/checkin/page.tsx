'use client';

import React, { useState, useEffect } from 'react';
import styles from './checkin.module.css';
import { api, ApiError } from '@/lib/api';
import { PortalCheckInResponse, PortalGymInfo } from '@/lib/types';
import { formatDate } from '@/lib/formatters';

export default function MemberPortalPage() {
  const [gymInfo, setGymInfo] = useState<PortalGymInfo | null>(null);
  const [memberCode, setMemberCode] = useState('');
  const [phoneLast2, setPhoneLast2] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [portalData, setPortalData] = useState<PortalCheckInResponse | null>(null);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);

  // Month navigation for interactive calendar
  const [viewDate, setViewDate] = useState(() => new Date());

  useEffect(() => {
    // Auto-fill from localStorage for convenience on personal phone
    if (typeof window !== 'undefined') {
      const savedCode = localStorage.getItem('gym_member_code');
      const savedPhone = localStorage.getItem('gym_phone_last_2');
      if (savedCode) setMemberCode(savedCode);
      if (savedPhone) setPhoneLast2(savedPhone);
    }

    api
      .getPortalGymInfo()
      .then((info) => setGymInfo(info))
      .catch((err) => console.error('Failed to load gym info:', err));
  }, []);

  // Step 1: "Enter Gym" Login (Accessible from anywhere, NO GPS required)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!memberCode.trim()) {
      setErrorMessage('Please enter your Gym Member ID.');
      return;
    }
    if (!phoneLast2.trim() || phoneLast2.trim().length !== 2) {
      setErrorMessage('Please enter the last 2 digits of your registered phone number.');
      return;
    }

    try {
      setIsLoggingIn(true);
      setErrorMessage('');

      const res = await api.portalLogin({
        member_code: memberCode.trim(),
        phone_last_2: phoneLast2.trim(),
      });

      // Save to localStorage so member doesn't have to re-type next time
      if (typeof window !== 'undefined') {
        localStorage.setItem('gym_member_code', memberCode.trim());
        localStorage.setItem('gym_phone_last_2', phoneLast2.trim());
      }

      setPortalData(res);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(err.message || 'Verification failed. Please check your connection.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Step 2: "Check In Today" (GPS-verified action inside the gym)
  const handleCheckInToday = () => {
    if (!portalData) return;

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setIsCheckingIn(true);
      setErrorMessage('');

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await api.portalCheckIn({
              member_code: memberCode.trim(),
              phone_last_2: phoneLast2.trim(),
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });

            // Haptic vibration
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate([80, 40, 80]);
              } catch {}
            }

            setPortalData(res);
            setShowCelebrationModal(true);
          } catch (err: any) {
            setErrorMessage(err.message || 'Check-in failed. Please verify location.');
          } finally {
            setIsCheckingIn(false);
          }
        },
        (geoErr) => {
          setIsCheckingIn(false);
          console.warn('Geolocation error:', geoErr);
          setErrorMessage(
            '📍 Location permission is required to verify you are inside Muscle Hunt. Please enable GPS on your phone.'
          );
        },
        { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
      );
    } else {
      setErrorMessage('Geolocation is not supported by your mobile browser.');
    }
  };

  const handleLogout = () => {
    setPortalData(null);
    setErrorMessage('');
    setShowCelebrationModal(false);
  };

  // =========================================================================
  // Weekly Bar Calculations (Monday -> Sunday of current week)
  // =========================================================================
  const getWeekDays = () => {
    const today = new Date();
    // Monday = 1, Sunday = 0 in JS getDay()
    const currentDay = today.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);

    const week = [];
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isToday = iso === today.toISOString().split('T')[0];
      const isSunday = d.getDay() === 0;

      const isAttended =
        portalData?.attendance_dates.includes(iso) ||
        (isToday && portalData?.already_checked_in_today);

      week.push({
        label: dayLabels[i],
        iso,
        isPast,
        isToday,
        isSunday,
        isAttended,
      });
    }
    return week;
  };

  // =========================================================================
  // Month Calendar Calculations
  // =========================================================================
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const initials = portalData?.full_name
    ? portalData.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'M';

  const todayIso = new Date().toISOString().split('T')[0];

  return (
    <div className={styles.portalWrapper}>
      <div className={styles.glowTop} />
      <div className={styles.glowBottom} />

      <div className={styles.portalContainer}>
        {/* =========================================================================
            STATE 1: "Enter Gym" Login (Access from anywhere)
            ========================================================================= */}
        {!portalData ? (
          <div className={styles.loginCard}>
            <div className={styles.brandHeader}>
              <div className={styles.logoBadge}>🏋️</div>
              <h1 className={styles.gymTitle}>{gymInfo?.gym_name || 'Muscle Hunt'}</h1>
              <p className={styles.gymSubtitle}>Member Portal & Express Check-In</p>
            </div>

            {errorMessage && <div className={styles.errorBanner}>⚠️ {errorMessage}</div>}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  placeholder="Enter Member ID (e.g. 488)"
                  className={styles.formInput}
                />
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
              </div>

              <button type="submit" disabled={isLoggingIn} className={styles.enterGymBtn}>
                {isLoggingIn ? (
                  <span>⏳ Accessing Portal...</span>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Enter Gym Portal</span>
                  </>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              View your workout streak, attendance calendar, and fee status anytime from anywhere!
            </div>
          </div>
        ) : (
          /* =========================================================================
              STATE 2: Member Portal Dashboard (Reference Mockup Style!)
              ========================================================================= */
          <>
            {/* Top User Bar */}
            <div className={styles.userNavBar}>
              <div className={styles.userInfoGroup}>
                {portalData.photo_url ? (
                  <img src={portalData.photo_url} alt={portalData.full_name} className={styles.userAvatar} />
                ) : (
                  <div className={styles.userInitials}>{initials}</div>
                )}
                <div>
                  <h2 className={styles.userName}>{portalData.full_name}</h2>
                  <div className={styles.userIdBadge}>ID: #{portalData.member_code}</div>
                </div>
              </div>

              <button type="button" onClick={handleLogout} className={styles.switchMemberBtn} title="Sign Out">
                Switch Member ✕
              </button>
            </div>

            {errorMessage && <div className={styles.errorBanner}>⚠️ {errorMessage}</div>}

            {/* Weekly Progress Bar (From Reference Mockup!) */}
            <div className={styles.weeklyBarCard}>
              <div className={styles.weeklyHeader}>
                <span className={styles.weeklyTitle}>This Week&apos;s Attendance</span>
                <div className={styles.weeklyFlamePill}>
                  <span>🔥</span>
                  <span>{portalData.streak.current_streak} Day Streak</span>
                </div>
              </div>

              <div className={styles.weekDaysRow}>
                {getWeekDays().map((day, idx) => (
                  <div key={idx} className={styles.dayColumn}>
                    <span className={styles.dayLabel}>{day.label}</span>
                    <div
                      className={`
                        ${styles.dayCircle}
                        ${day.isAttended ? styles.dayCircleAttended : ''}
                        ${day.isSunday && !day.isAttended ? styles.dayCircleRest : ''}
                        ${day.isToday && !day.isAttended ? styles.dayCircleTodayPending : ''}
                      `}
                    >
                      {day.isAttended ? '✓' : day.isSunday ? '🏖️' : day.isPast ? '–' : '·'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Check-In CTA Hero */}
            {!portalData.already_checked_in_today ? (
              <div className={styles.checkInHeroCard}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>
                    Are you at the gym now?
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600 }}>📍 GPS Protected</span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckInToday}
                  disabled={isCheckingIn}
                  className={styles.checkInHeroBtn}
                >
                  {isCheckingIn ? (
                    <span>⏳ Verifying Gym Location...</span>
                  ) : (
                    <>
                      <span>📍</span>
                      <span>Check In Today at Gym</span>
                    </>
                  )}
                </button>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>
                  Tap when inside the gym to verify location and advance your streak (+1)!
                </div>
              </div>
            ) : (
              <div className={styles.checkedInBanner}>
                <span style={{ fontSize: '1.4rem' }}>🎉</span>
                <div>
                  <div>You are Checked In Today!</div>
                  <div style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 500 }}>
                    Recorded at {portalData.check_in_time} • Today&apos;s streak is secure! 🔥
                  </div>
                </div>
              </div>
            )}

            {/* Streak Metrics Grid */}
            <div className={styles.streakGrid}>
              <div className={`${styles.streakCard} ${styles.streakCardCurrent}`}>
                <div className={styles.streakCardLabel}>
                  <span>🔥</span>
                  <span>Current Streak</span>
                </div>
                <div className={`${styles.streakCardValue} ${styles.streakCardValueFlame}`}>
                  {portalData.streak.current_streak} {portalData.streak.current_streak === 1 ? 'Day' : 'Days'}
                </div>
              </div>

              <div className={styles.streakCard}>
                <div className={styles.streakCardLabel}>
                  <span>🏆</span>
                  <span>Best Streak</span>
                </div>
                <div className={styles.streakCardValue}>
                  {portalData.streak.best_streak} {portalData.streak.best_streak === 1 ? 'Day' : 'Days'}
                </div>
              </div>
            </div>

            {/* 48h Grace Notice or Sunday Rest Notice */}
            {portalData.streak.grace_period_applied && (
              <div className={styles.graceNotice}>
                <strong>⚠️ Streak Saved by 48h Grace:</strong> You missed your previous workout, but checked in within the 48-hour grace window!
              </div>
            )}

            {portalData.streak.sunday_exempt_applied && !portalData.streak.grace_period_applied && (
              <div className={styles.graceNotice} style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#bfdbfe' }}>
                🏖️ <strong>Sunday Rest Day:</strong> Your Sunday rest was automatically excluded so your streak stayed safe!
              </div>
            )}

            {/* =========================================================================
                Interactive Attendance & Membership Calendar
                ========================================================================= */}
            <div className={styles.calendarCard}>
              <div className={styles.calendarNavHeader}>
                <h3 className={styles.calendarMonthTitle}>
                  {monthNames[month]} {year}
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={handlePrevMonth} className={styles.calNavBtn} title="Previous Month">
                    ❮
                  </button>
                  <button type="button" onClick={handleNextMonth} className={styles.calNavBtn} title="Next Month">
                    ❯
                  </button>
                </div>
              </div>

              <div className={styles.calendarDayNames}>
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              <div className={styles.calendarGrid}>
                {/* Empty padding cells before first day */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className={`${styles.calCell} ${styles.calCellEmpty}`} />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const currentCellDate = new Date(year, month, dayNum);
                  const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isSun = currentCellDate.getDay() === 0;
                  const isTodayCell = isoDate === todayIso;

                  const isAttended =
                    portalData.attendance_dates.includes(isoDate) ||
                    (isTodayCell && portalData.already_checked_in_today);

                  const isPaidDate = portalData.membership.paid_date === isoDate;
                  const isExpiryDate = portalData.membership.expiry_date === isoDate;

                  return (
                    <div
                      key={dayNum}
                      className={`
                        ${styles.calCell}
                        ${isAttended ? styles.calCellAttended : ''}
                        ${isSun && !isAttended ? styles.calCellRest : ''}
                        ${isPaidDate ? styles.calCellPaid : ''}
                        ${isExpiryDate ? styles.calCellExpiry : ''}
                        ${isTodayCell ? styles.calCellToday : ''}
                      `}
                      title={`${isoDate}: ${isAttended ? 'Attended' : isSun ? 'Sunday Rest Day' : 'Not Attended'}`}
                    >
                      <span>{dayNum}</span>
                      {isAttended && <span className={styles.cellDotAttended} />}
                      {isSun && !isAttended && <span className={styles.cellDotRest} />}
                    </div>
                  );
                })}
              </div>

              {/* Calendar Legend */}
              <div className={styles.calendarLegend}>
                <div className={styles.legendItem}>
                  <span style={{ color: '#22c55e', fontSize: '0.9rem' }}>●</span>
                  <span>Attended</span>
                </div>
                <div className={styles.legendItem}>
                  <span style={{ color: '#f59e0b', fontSize: '0.9rem' }}>●</span>
                  <span>Rest Day</span>
                </div>
                <div className={styles.legendItem}>
                  <span style={{ border: '1.5px solid #3b82f6', borderRadius: '3px', width: '8px', height: '8px', display: 'inline-block' }} />
                  <span>Paid Date</span>
                </div>
                <div className={styles.legendItem}>
                  <span style={{ border: '1.5px solid #ef4444', borderRadius: '3px', width: '8px', height: '8px', display: 'inline-block' }} />
                  <span>Due Date</span>
                </div>
              </div>
            </div>

            {/* Membership Details Card */}
            <div className={styles.membershipCard}>
              <div className={styles.membershipTitleRow}>
                <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#ffffff' }}>
                  🏆 {portalData.membership.plan_name}
                </span>
                <span
                  className={
                    portalData.membership.status === 'paid'
                      ? styles.badgePaid
                      : portalData.membership.status === 'expiring_soon'
                      ? styles.badgeWarning
                      : styles.badgeDanger
                  }
                >
                  {portalData.membership.status === 'paid'
                    ? 'Active'
                    : portalData.membership.status === 'expiring_soon'
                    ? 'Expiring Soon'
                    : 'Expired'}
                </span>
              </div>

              <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                {portalData.membership.days_remaining > 0 ? (
                  <div>
                    ⏳ <strong>{portalData.membership.days_remaining} days remaining</strong> (Valid till{' '}
                    {formatDate(portalData.membership.expiry_date)})
                  </div>
                ) : portalData.membership.days_remaining === 0 ? (
                  <div style={{ color: '#facc15', fontWeight: 700 }}>
                    ⚠️ Your membership expires today!
                  </div>
                ) : (
                  <div style={{ color: '#f87171', fontWeight: 700 }}>
                    🔴 Membership expired {Math.abs(portalData.membership.days_remaining)} days ago!
                  </div>
                )}
              </div>

              {portalData.membership.paid_date && (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Membership Started: {formatDate(portalData.membership.paid_date)}
                </div>
              )}
            </div>

            {/* Payment Summary */}
            {portalData.last_payment && (
              <div className={styles.paymentSummaryCard}>
                <div style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  💳 Last Payment Summary
                </div>
                <div style={{ fontSize: '0.9375rem', color: '#ffffff', fontWeight: 700, marginTop: '2px' }}>
                  ₹{portalData.last_payment.amount.toLocaleString()} via {portalData.last_payment.payment_method || 'Cash'}{' '}
                  on {formatDate(portalData.last_payment.payment_date)}
                </div>
              </div>
            )}

            {/* Footer Clean Buttons (NO TIMER!) */}
            <div className={styles.footerActions}>
              <button type="button" onClick={handleLogout} className={styles.checkInAnotherBtn}>
                Check In Another Member
              </button>
            </div>
          </>
        )}
      </div>

      {/* =========================================================================
          Celebration Modal (Directly Matching Left Mockup Screen!)
          ========================================================================= */}
      {showCelebrationModal && portalData && (
        <div className={styles.modalOverlay} onClick={() => setShowCelebrationModal(false)}>
          <div className={styles.celebrationCard} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setShowCelebrationModal(false)}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Big Flame + Floating Stars */}
            <div className={styles.bigFlameWrapper}>
              <span className={styles.floatingStar} style={{ top: '-10px', left: '-15px' }}>⭐</span>
              <span className={styles.floatingStar} style={{ top: '-8px', right: '-12px', animationDelay: '1s' }}>✨</span>
              <span>🔥</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div className={styles.bigStreakNumber}>{portalData.streak.current_streak}</div>
              <h3 className={styles.streakSubtitle}>Daily Streak</h3>
            </div>

            <p className={styles.streakMotto}>
              Awesome workout, {portalData.full_name}! Consistency builds champions. Come back tomorrow!
            </p>

            {/* Weekly Progress Bar in Modal */}
            <div className={styles.weekDaysRow} style={{ width: '100%', padding: '10px 0' }}>
              {getWeekDays().map((day, idx) => (
                <div key={idx} className={styles.dayColumn}>
                  <span className={styles.dayLabel} style={{ color: '#64748b' }}>{day.label}</span>
                  <div
                    className={`
                      ${styles.dayCircle}
                      ${day.isAttended ? styles.dayCircleAttended : ''}
                      ${day.isSunday && !day.isAttended ? styles.dayCircleRest : ''}
                    `}
                    style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}
                  >
                    {day.isAttended ? '✓' : day.isSunday ? '🏖️' : '·'}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={styles.celebrateDoneBtn}
              onClick={() => setShowCelebrationModal(false)}
            >
              Done / Great Workout! 💪
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
