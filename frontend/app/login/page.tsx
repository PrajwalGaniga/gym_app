'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import { api, ApiError } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [loginMode, setLoginMode] = useState<'pin' | 'password'>('pin');

  // Phone + PIN login state
  const [phone, setPhone] = useState('9110687983');
  const [pin, setPin] = useState('0608');

  // Username + Password fallback state
  const [username, setUsername] = useState('coach');
  const [password, setPassword] = useState('Coach@Gym2026!');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginMode === 'pin') {
      if (!phone.trim() || !pin.trim()) {
        setErrorMessage('Please enter both your phone number and 4-digit PIN.');
        return;
      }
      if (pin.trim().length < 4) {
        setErrorMessage('PIN must be 4 digits.');
        return;
      }
    } else {
      if (!username.trim() || !password) {
        setErrorMessage('Please enter both username and password.');
        return;
      }
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      if (loginMode === 'pin') {
        await api.login({ phone: phone.trim(), pin: pin.trim() });
      } else {
        await api.login({ username: username.trim(), password });
      }

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
          <h1 className={styles.title}>Muscle Hunt</h1>
          <p className={styles.subtitle}>Coach & Management Portal</p>
        </div>

        {errorMessage && <div className={styles.errorBanner}>⚠️ {errorMessage}</div>}

        <form onSubmit={handleSubmit}>
          {loginMode === 'pin' ? (
            <>
              <Input
                label="Coach Phone Number"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9110687983"
                autoComplete="tel"
                helperText="10-digit registered coach or master admin phone"
              />

              <Input
                label="4-Digit PIN"
                type="password"
                required
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                autoComplete="current-password"
                helperText="Security PIN set in gym settings"
              />
            </>
          ) : (
            <>
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
            </>
          )}

          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className={styles.submitBtn}>
            {loginMode === 'pin' ? 'Sign In as Coach' : 'Sign In to Dashboard'}
          </Button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setErrorMessage('');
              setLoginMode(loginMode === 'pin' ? 'password' : 'pin');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '4px 8px',
            }}
          >
            {loginMode === 'pin' ? 'Switch to Username & Password Login' : 'Switch to Phone Number & PIN Login'}
          </button>
        </div>

        <div className={styles.defaultCredentialsNotice}>
          Master Admin Login: <code>9110687983</code> | PIN <code>0608</code>
          <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#94a3b8' }}>
            Permanent fallback login for emergency gym access.
          </div>
        </div>
      </div>
    </div>
  );
}
