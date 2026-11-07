'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Admin } from '@/lib/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickActionSheet } from '@/components/layout/QuickActionSheet';
import styles from '@/components/layout/layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api
      .getMe()
      .then((data) => {
        if (isMounted) {
          setAdmin(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          router.push('/login');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Verifying coach session...</span>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={styles.layoutWrapper}>
      {/* Desktop Sidebar (hidden on mobile in CSS) */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className={styles.mainContainer}>
        {/* Top App Bar with Settings icon & mobile search */}
        <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} admin={admin} />

        {/* Scrollable Main Content */}
        <main className={styles.content}>{children}</main>

        {/* Docked Mobile Bottom Navigation Bar */}
        <BottomNav onOpenQuickAction={() => setIsQuickActionOpen(true)} />

        {/* Slide-Up Quick Action Bottom Sheet */}
        <QuickActionSheet
          isOpen={isQuickActionOpen}
          onClose={() => setIsQuickActionOpen(false)}
        />
      </div>
    </div>
  );
}
