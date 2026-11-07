'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './layout.module.css';

interface BottomNavProps {
  onOpenQuickAction: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenQuickAction }) => {
  const pathname = usePathname();

  const isHome = pathname === '/dashboard';
  const isMembers = pathname === '/members' || pathname.startsWith('/members/');
  const isStatus = pathname === '/paid' || pathname === '/expiring-soon' || pathname === '/expired';
  const isWallet = pathname === '/wallet';

  return (
    <nav className={styles.bottomNav} aria-label="Mobile Navigation">
      <div className={styles.bottomNavContainer}>
        {/* 1. Dashboard / Home */}
        <Link
          href="/dashboard"
          className={`${styles.bottomNavItem} ${isHome ? styles.bottomNavItemActive : ''}`}
        >
          <span className={styles.bottomNavIcon}>🏠</span>
          <span className={styles.bottomNavLabel}>Home</span>
        </Link>

        {/* 2. Members */}
        <Link
          href="/members"
          className={`${styles.bottomNavItem} ${isMembers ? styles.bottomNavItemActive : ''}`}
        >
          <span className={styles.bottomNavIcon}>👥</span>
          <span className={styles.bottomNavLabel}>Members</span>
        </Link>

        {/* 3. Center Elevated Action (+) Button */}
        <button
          type="button"
          className={styles.bottomNavCenterBtn}
          onClick={onOpenQuickAction}
          aria-label="Add Member or Quick Action"
          title="Quick Actions"
        >
          <span className={styles.centerBtnIcon}>+</span>
        </button>

        {/* 4. Status / Cards */}
        <Link
          href="/paid"
          className={`${styles.bottomNavItem} ${isStatus ? styles.bottomNavItemActive : ''}`}
        >
          <span className={styles.bottomNavIcon}>💳</span>
          <span className={styles.bottomNavLabel}>Status</span>
        </Link>

        {/* 5. Wallet */}
        <Link
          href="/wallet"
          className={`${styles.bottomNavItem} ${isWallet ? styles.bottomNavItemActive : ''}`}
        >
          <span className={styles.bottomNavIcon}>💰</span>
          <span className={styles.bottomNavLabel}>Wallet</span>
        </Link>
      </div>
    </nav>
  );
};

