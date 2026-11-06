'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './layout.module.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'All Members', href: '/members', icon: '👥' },
    { label: 'Paid', href: '/paid', icon: '🟢' },
    { label: 'Expiring Soon', href: '/expiring-soon', icon: '🟡' },
    { label: 'Expired', href: '/expired', icon: '🔴' },
    { label: 'Membership Plans', href: '/plans', icon: '💳' },
    { label: 'Payments', href: '/payments', icon: '💰' },
    { label: 'Attendance', href: '/attendance', icon: '⏱️' },
    { label: 'Reports', href: '/reports', icon: '📈' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.sidebarBrand}>
        <span className={styles.brandIcon}>🏋️</span>
        <div>
          <div className={styles.brandTitle}>IronPulse Gym</div>
          <div className={styles.brandSub}>Coach Portal</div>
        </div>
      </div>

      <nav className={styles.sidebarNav}>
        <div className={styles.navSectionLabel}>Core Operations</div>
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href || (item.href === '/members' && pathname.startsWith('/members/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={onClose}
            >
              <span className={styles.navItemIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className={styles.navSectionLabel}>Management</div>
        {navItems.slice(5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={onClose}
            >
              <span className={styles.navItemIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <div>Timezone: Asia/Kolkata</div>
        <div>System Version 1.0.0</div>
      </div>
    </aside>
  );
};
