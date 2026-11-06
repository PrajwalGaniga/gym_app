'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Admin } from '@/lib/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
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
        <div className={styles.spinner} style={{ width: '32px', height: '32px', borderColor: '#2563eb' }} />
        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Verifying coach session...</span>
      </div>
    );
  }

  return (
    <div className={styles.layoutWrapper}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className={styles.mainContainer}>
        <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} admin={admin} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
