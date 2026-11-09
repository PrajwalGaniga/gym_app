'use client';

import React from 'react';
import styles from './portal.module.css';
import { PortalCheckInResponse } from '@/lib/types';
import { getLevelInfo } from './types';
import { formatDate } from '@/lib/formatters';

interface PortalDashboardProps {
  data: PortalCheckInResponse;
  onCheckIn: () => void;
  isCheckingIn: boolean;
  checkInError: string;
}

export const PortalDashboard: React.FC<PortalDashboardProps> = ({
  data,
  onCheckIn,
  isCheckingIn,
  checkInError,
}) => {
  const level = getLevelInfo(data.streak.current_streak);

  // Health/Validity HP Bar calculation (assume 30-day baseline or max days)
  const daysTotal = 30;
  const daysRemaining = Math.max(0, data.membership.days_remaining);
  const hpPercent = Math.min(100, Math.round((daysRemaining / daysTotal) * 100));

  // Compute weekly days (Monday to Sunday)
  const getWeekDays = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);

    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const week = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isSun = d.getDay() === 0;
      const isToday = d.toDateString() === today.toDateString();
      const isPast = d < today && !isToday;
      const isAttended =
        data.attendance_dates.includes(iso) || (isToday && data.already_checked_in_today);

      week.push({
        label: labels[i],
        iso,
        isSunday: isSun,
        isToday,
        isPast,
        isAttended,
      });
    }

    return week;
  };

  const weekDays = getWeekDays();

  // Name initials fallback
  const initials = data.full_name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={styles.dashboardFlow}>
      {/* 1. Member Identity Card */}
      <div className={styles.identityCard}>
        <div className={styles.avatarRing}>
          {data.photo_url ? (
            <img src={data.photo_url} alt={data.full_name} className={styles.avatarImg} />
          ) : (
            <img src="/assets/avatar-default.png" alt={data.full_name} className={styles.avatarImg} />
          )}
        </div>
        <div className={styles.identityInfo}>
          <div className={styles.identityName}>{data.full_name}</div>
          <div className={styles.identitySub}>
            <span>#{data.member_code}</span>
            <span>•</span>
            <span>{data.gender || 'Member'}</span>
          </div>
          <div className={styles.coachTag}>Coach: Prajwal</div>
        </div>
      </div>

      {/* 2. Streak Stats Grid */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span>🔥</span>
            <span>Current Streak</span>
          </div>
          <div className={`${styles.statValue} ${styles.statValueFlame}`}>
            {data.streak.current_streak} {data.streak.current_streak === 1 ? 'Day' : 'Days'}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <span>🏆</span>
            <span>Best Streak</span>
          </div>
          <div className={styles.statValue}>
            {data.streak.best_streak} {data.streak.best_streak === 1 ? 'Day' : 'Days'}
          </div>
        </div>
      </div>

      {/* 3. Level RPG Card */}
      <div className={styles.levelCard}>
        <div className={styles.levelHeader}>
          <div className={styles.levelInfoGroup}>
            <span className={styles.levelIconBadge}>{level.icon}</span>
            <div>
              <div className={styles.levelTitle}>{level.name}</div>
              <div className={styles.levelMotto}>{level.motto}</div>
            </div>
          </div>
        </div>
        <div className={styles.levelProgressBar}>
          <div className={styles.levelProgressFill} style={{ width: `${level.progressPercent}%` }} />
        </div>
      </div>

      {/* 4. Membership Plan Card */}
      <div className={styles.membershipCard}>
        <div className={styles.membershipTitleRow}>
          <div className={styles.membershipName}>
            <span>❤️</span>
            <span>{data.membership.plan_name}</span>
          </div>
          <span
            className={`${styles.statusPill} ${
              data.membership.status === 'paid'
                ? styles.statusActive
                : data.membership.status === 'expiring_soon'
                ? styles.statusWarning
                : styles.statusExpired
            }`}
          >
            {data.membership.status === 'paid'
              ? 'Active'
              : data.membership.status === 'expiring_soon'
              ? 'Expiring Soon'
              : 'Expired'}
          </span>
        </div>

        <div className={styles.membershipDaysRemaining}>
          {data.membership.days_remaining > 0 ? (
            <span>
              ⏳ <strong>{data.membership.days_remaining} days remaining</strong> (Valid till{' '}
              {formatDate(data.membership.expiry_date)})
            </span>
          ) : data.membership.days_remaining === 0 ? (
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>⚠️ Your membership expires today!</span>
          ) : (
            <span style={{ color: '#ef4444', fontWeight: 700 }}>
              🔴 Membership expired {Math.abs(data.membership.days_remaining)} days ago!
            </span>
          )}
        </div>

        {/* HP Bar */}
        <div className={styles.hpBarTrack}>
          <div
            className={styles.hpBarFill}
            style={{
              width: `${hpPercent}%`,
              background:
                data.membership.status === 'paid'
                  ? '#22c55e'
                  : data.membership.status === 'expiring_soon'
                  ? '#f59e0b'
                  : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* 5. Primary Check-In CTA Card */}
      <div className={styles.checkInHeroCard}>
        {checkInError && (
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
            ⚠️ {checkInError}
          </div>
        )}

        {!data.already_checked_in_today ? (
          <>
            <button
              type="button"
              onClick={onCheckIn}
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
            <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', textAlign: 'center' }}>
              Location is checked only when you tap check-in. Valid within 100m of Muscle Hunt.
            </div>
          </>
        ) : (
          <div className={styles.checkedInHeroBanner}>
            <span style={{ fontSize: '1.4rem' }}>✓</span>
            <div>
              <div className={styles.checkedInTitle}>Checked In Today at {data.check_in_time}</div>
              <div className={styles.checkedInSub}>Today&apos;s streak is secure! Keep grinding! 🔥</div>
            </div>
          </div>
        )}
      </div>

      {/* Grace or Sunday Notices */}
      {data.streak.grace_period_applied && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1.5px solid #f59e0b',
            color: '#fbbf24',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          ⚠️ <strong>Streak Saved by 48h Grace:</strong> You checked in within the grace window! Streak preserved!
        </div>
      )}

      {/* 6. Weekly Habit Strip */}
      <div className={styles.weeklyCard}>
        <div className={styles.weeklyTitle}>Weekly Habit</div>
        <div className={styles.weekDaysRow}>
          {weekDays.map((day, idx) => (
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
                {day.isAttended ? '✓' : day.isSunday ? '1' : day.isPast ? '–' : '·'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

