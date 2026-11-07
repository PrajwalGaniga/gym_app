'use client';

import React from 'react';
import Link from 'next/link';
import styles from './layout.module.css';

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.actionSheetOverlay} onClick={onClose}>
      <div className={styles.actionSheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.actionSheetHandle} />
        <div className={styles.actionSheetHeader}>
          <h3 className={styles.actionSheetTitle}>Quick Actions</h3>
          <p className={styles.actionSheetSubtitle}>Select an action to perform</p>
        </div>

        <div className={styles.actionSheetGrid}>
          <Link href="/members/new" className={styles.actionSheetItem} onClick={onClose}>
            <div className={`${styles.actionSheetIcon} ${styles.actionIconPrimary}`}>
              📸
            </div>
            <div className={styles.actionSheetContent}>
              <div className={styles.actionSheetLabel}>Register New Member</div>
              <div className={styles.actionSheetDesc}>₹600 initial fee (₹500 fee + ₹100 reg) with camera capture</div>
            </div>
            <span className={styles.actionSheetArrow}>→</span>
          </Link>

          <Link href="/members/legacy" className={styles.actionSheetItem} onClick={onClose}>
            <div className={`${styles.actionSheetIcon} ${styles.actionIconSecondary}`}>
              📋
            </div>
            <div className={styles.actionSheetContent}>
              <div className={styles.actionSheetLabel}>Add Existing / Legacy Member</div>
              <div className={styles.actionSheetDesc}>Preserve member ID, join date & migrate expiry</div>
            </div>
            <span className={styles.actionSheetArrow}>→</span>
          </Link>

          <Link href="/members/import" className={styles.actionSheetItem} onClick={onClose}>
            <div className={`${styles.actionSheetIcon} ${styles.actionIconAccent}`}>
              📥
            </div>
            <div className={styles.actionSheetContent}>
              <div className={styles.actionSheetLabel}>Bulk CSV Import</div>
              <div className={styles.actionSheetDesc}>Upload gym roster from spreadsheet</div>
            </div>
            <span className={styles.actionSheetArrow}>→</span>
          </Link>
        </div>

        <button type="button" className={styles.actionSheetCancelBtn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};

