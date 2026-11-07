import React from 'react';
import styles from './ui.module.css';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'neutral';
  showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  showDot = true,
}) => {
  const variantClass = {
    success: styles.badgeSuccess,
    warning: styles.badgeWarning,
    danger: styles.badgeDanger,
    neutral: styles.badgeNeutral,
  }[variant];

  return (
    <span className={`${styles.badge} ${variantClass}`}>
      {showDot && <span className={styles.badgeDot} />}
      {children}
    </span>
  );
};

