'use client';

import React from 'react';
import styles from './portal.module.css';
import { PortalCheckInResponse } from '@/lib/types';
import { formatDate } from '@/lib/formatters';

interface PortalProfileProps {
  data: PortalCheckInResponse;
  onSwitchMember: () => void;
  onSignOut: () => void;
}

export const PortalProfile: React.FC<PortalProfileProps> = ({
  data,
  onSwitchMember,
  onSignOut,
}) => {
  return (
    <div className={styles.profileScreenFlow}>
      {/* 1. Profile Avatar & Identity */}
      <div className={styles.profileAvatarHero}>
        <div className={styles.largeAvatarRing}>
          {data.photo_url ? (
            <img src={data.photo_url} alt={data.full_name} className={styles.avatarImg} />
          ) : (
            <img src="/assets/avatar-default.png" alt={data.full_name} className={styles.avatarImg} />
          )}
          {/* Edit Badge Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: '#38bdf8',
              border: '2px solid #0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              color: '#0f172a',
              fontWeight: 800,
            }}
          >
            ✏️
          </div>
        </div>

        <h2 className={styles.profileName}>{data.full_name}</h2>
        <div className={styles.profileSub}>
          <span>#{data.member_code}</span>
          <span>•</span>
          <span>{data.gender || 'Male'}</span>
        </div>
      </div>

      {/* 2. Plan Details Card */}
      <div className={styles.membershipCard} style={{ width: '100%' }}>
        <div className={styles.membershipTitleRow}>
          <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
            Plan Details
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

        <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
          {data.membership.plan_name}
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {data.membership.days_remaining > 0 ? (
            <span>
              {data.membership.days_remaining} days remaining (Valid till {formatDate(data.membership.expiry_date)})
            </span>
          ) : data.membership.days_remaining === 0 ? (
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>Expires today!</span>
          ) : (
            <span style={{ color: '#ef4444', fontWeight: 700 }}>
              Expired {Math.abs(data.membership.days_remaining)} days ago
            </span>
          )}
        </div>
      </div>

      {/* 3. Last Payment Ledger Card */}
      {data.last_payment && (
        <div className={styles.membershipCard} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>💳</span>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Last Payment
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                ₹{data.last_payment.amount.toLocaleString()} • {data.last_payment.payment_method || 'UPI'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '2px' }}>
                {formatDate(data.last_payment.payment_date)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Action Buttons */}
      <div className={styles.profileActionsGroup}>
        <button type="button" onClick={onSwitchMember} className={styles.switchMemberBtn}>
          <span>👥</span>
          <span>Switch Member</span>
        </button>

        <button type="button" onClick={onSignOut} className={styles.signOutBtn}>
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>

      {/* Decorative Pixel Dumbbell at bottom */}
      <div style={{ marginTop: '8px', opacity: 0.8 }}>
        <img
          src="/assets/dumbbell-sticker.png"
          alt="Dumbbell"
          style={{ height: '24px', objectFit: 'contain', imageRendering: 'pixelated' }}
        />
      </div>
    </div>
  );
};

