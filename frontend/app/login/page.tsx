'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import { api, ApiError } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('coach');
  const [password, setPassword] = useState('Coach@Gym2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      await api.login({ username: username.trim(), password });
      router.push('/dashboard');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to connect to the backend server. Please verify backend is running.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard}>
        <div className={styles.brandHeader}>
          <div className={styles.logoIcon}>🏋️</div>
          <h1 className={styles.title}>IronPulse Fitness</h1>
          <p className={styles.subtitle}>Coach & Management Portal</p>
        </div>

        {errorMessage && <div className={styles.errorBanner}>⚠️ {errorMessage}</div>}

        <form onSubmit={handleSubmit}>
          <Input
            label="Admin Username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. coach"
            autoComplete="username"
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="current-password"
          />

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className={styles.submitBtn}>
            Sign In to Dashboard
          </Button>
        </form>

        <div className={styles.defaultCredentialsNotice}>
          Default credentials seeded: <code>coach</code> / <code>Coach@Gym2026!</code>
        </div>
      </div>
    </div>
  );
}

