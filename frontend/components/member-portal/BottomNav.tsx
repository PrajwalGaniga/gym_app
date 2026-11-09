'use client';

import React from 'react';
import styles from './portal.module.css';
import { PortalTab } from './types';

interface BottomNavProps {
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className={styles.bottomNav} aria-label="Member Navigation">
      <button
        type="button"
        onClick={() => onTabChange('home')}
        className={`${styles.navItem} ${activeTab === 'home' ? styles.navItemActive : ''}`}
      >
        <span className={styles.navIcon}>🏠</span>
        <span>Home</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('calendar')}
        className={`${styles.navItem} ${activeTab === 'calendar' ? styles.navItemActive : ''}`}
      >
        <span className={styles.navIcon}>📅</span>
        <span>Calendar</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('profile')}
        className={`${styles.navItem} ${activeTab === 'profile' ? styles.navItemActive : ''}`}
      >
        <span className={styles.navIcon}>👤</span>
        <span>Profile</span>
      </button>
    </nav>
  );
};

