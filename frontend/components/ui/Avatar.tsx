import React from 'react';
import styles from './ui.module.css';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md' }) => {
  const sizeClass = {
    sm: styles.avatarSm,
    md: styles.avatarMd,
    lg: styles.avatarLg,
  }[size];

  // Helper to get initials
  const initials = name
    ? name
        .trim()
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  // If local static path without host, prepend backend URL if needed or show relative
  const finalSrc = src?.startsWith('/static') ? `http://localhost:8000${src}` : src;

  return (
    <div className={`${styles.avatar} ${sizeClass}`} title={name}>
      {finalSrc ? (
        <img
          src={finalSrc}
          alt={name}
          className={styles.avatarImg}
          onError={(e) => {
            // Hide image and fallback to initials on load failure
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};
