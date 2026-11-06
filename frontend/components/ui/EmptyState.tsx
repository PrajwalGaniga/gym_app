import React from 'react';
import styles from './ui.module.css';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📋',
  title,
  description,
  action,
}) => {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon}</div>
      <h4 className={styles.emptyTitle}>{title}</h4>
      <p className={styles.emptyDescription}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
