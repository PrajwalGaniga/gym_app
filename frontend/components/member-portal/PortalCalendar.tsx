'use client';

import React, { useState } from 'react';
import styles from './portal.module.css';
import { PortalCheckInResponse } from '@/lib/types';
import { formatDate } from '@/lib/formatters';

interface PortalCalendarProps {
  data: PortalCheckInResponse;
}

export const PortalCalendar: React.FC<PortalCalendarProps> = ({ data }) => {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedIso(null);
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedIso(null);
  };

  // Calendar calculations (Monday -> Sunday alignment)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // In JS, getDay() returns 0 for Sunday, 1 for Monday...
  // For Monday-based grid (Mon=0, Tue=1, ... Sun=6):
  const firstDaySundayBased = new Date(year, month, 1).getDay();
  const firstDayMondayBased = (firstDaySundayBased + 6) % 7;

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className={styles.calendarCard}>
      {/* Month Navigation Header */}
      <div className={styles.calendarNavHeader}>
        <button
          type="button"
          onClick={handlePrevMonth}
          className={styles.calNavBtn}
          aria-label="Previous Month"
        >
          ❮
        </button>
        <h2 className={styles.calendarMonthTitle}>
          {monthNames[month]} {year}
        </h2>
        <button
          type="button"
          onClick={handleNextMonth}
          className={styles.calNavBtn}
          aria-label="Next Month"
        >
          ❯
        </button>
      </div>

      {/* Weekday Labels Mon-Sun */}
      <div className={styles.calendarWeekDaysHeader}>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
        <span>Sun</span>
      </div>

      {/* Grid Days */}
      <div className={styles.calendarGrid}>
        {/* Empty padding before day 1 */}
        {Array.from({ length: firstDayMondayBased }).map((_, i) => (
          <div key={`empty-${i}`} className={`${styles.calCell} ${styles.calCellEmpty}`} />
        ))}

        {/* Real Month Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const currentCellDate = new Date(year, month, dayNum);
          const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isSun = currentCellDate.getDay() === 0;
          const isTodayCell = isoDate === todayIso;

          const isAttended =
            data.attendance_dates.includes(isoDate) ||
            (isTodayCell && data.already_checked_in_today);

          const isPaidDate = data.membership.paid_date === isoDate;
          const isExpiryDate = data.membership.expiry_date === isoDate;
          const isSelected = selectedIso === isoDate;

          return (
            <div
              key={dayNum}
              onClick={() => setSelectedIso(isoDate)}
              className={`
                ${styles.calCell}
                ${isAttended ? styles.calCellAttended : ''}
                ${isSun && !isAttended ? styles.calCellRest : ''}
                ${isPaidDate ? styles.calCellPaid : ''}
                ${isExpiryDate ? styles.calCellExpiry : ''}
                ${isTodayCell ? styles.calCellToday : ''}
              `}
              style={isSelected ? { outline: '2.5px solid #facc15', zIndex: 2 } : undefined}
            >
              <span>{dayNum}</span>
              {isAttended && <span style={{ fontSize: '0.65rem', lineHeight: 1 }}>✓</span>}
              {isSun && !isAttended && <span style={{ fontSize: '0.65rem', lineHeight: 1 }}>1</span>}
            </div>
          );
        })}
      </div>

      {/* Selected Day Detail Popover */}
      {selectedIso && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'var(--card-elevated)',
            border: 'var(--card-border)',
            boxShadow: 'var(--pixel-shadow)',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '4px',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{formatDate(selectedIso)}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
              {data.attendance_dates.includes(selectedIso) || (selectedIso === todayIso && data.already_checked_in_today)
                ? '🟢 Attended Workout Session'
                : new Date(selectedIso).getDay() === 0
                ? '🏖️ Sunday Official Rest Day'
                : '⚪ No check-in recorded'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIso(null)}
            style={{ color: 'var(--text-subtle)', fontSize: '0.9rem', padding: '4px' }}
          >
            ✕
          </button>
        </div>
      )}

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
          <span
            style={{
              border: '1.5px solid #3b82f6',
              borderRadius: '3px',
              width: '8px',
              height: '8px',
              display: 'inline-block',
            }}
          />
          <span>Plan Start</span>
        </div>
        <div className={styles.legendItem}>
          <span
            style={{
              border: '1.5px solid #ef4444',
              borderRadius: '3px',
              width: '8px',
              height: '8px',
              display: 'inline-block',
            }}
          />
          <span>Due Date</span>
        </div>
        <div className={styles.legendItem}>
          <span
            style={{
              border: '1.5px solid #38bdf8',
              borderRadius: '50%',
              width: '8px',
              height: '8px',
              display: 'inline-block',
            }}
          />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
};

