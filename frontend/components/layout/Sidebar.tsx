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

  const coreItems = [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'All Members', href: '/members', icon: '👥' },
    { label: 'Paid Members', href: '/paid', icon: '🟢' },
    { label: 'Expiring Soon (3d)', href: '/expiring-soon', icon: '🟡' },
    { label: 'Expired Members', href: '/expired', icon: '🔴' },
  ];

  const financialItems = [
    { label: 'Wallet & Revenue', href: '/wallet', icon: '💰' },
    { label: 'Payment Ledger', href: '/payments', icon: '🧾' },
    { label: 'Membership Plans', href: '/plans', icon: '🏷️' },
    { label: 'Reports', href: '/reports', icon: '📈' },
  ];

  const secondaryItems = [
    { label: 'Attendance (Optional)', href: '/attendance', icon: '⏱️' },
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
        {coreItems.map((item) => {
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

        <div className={styles.navSectionLabel}>Finance & Plans</div>
        {financialItems.map((item) => {
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

        <div className={styles.navSectionLabel}>Secondary & Tools</div>
        {secondaryItems.map((item) => {
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
        <div>System Version 1.1.0</div>
      </div>
    </aside>
  );
};
