'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import { api, ApiError, getApiBaseUrl } from '@/lib/api';
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

  // Diagnostic & Debug State
  const [debugInfo, setDebugInfo] = useState<{
    urlCalled?: string;
    status?: number | string;
    errorText?: string;
    time?: string;
  } | null>(null);
  const [pingStatus, setPingStatus] = useState<string>('');
  const [isPinging, setIsPinging] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const testPing = async () => {
    setIsPinging(true);
    setPingStatus('Testing connection...');
    const baseUrl = getApiBaseUrl();
    const pingUrl = `${baseUrl}/ping`;
    try {
      const t0 = Date.now();
      const res = await fetch(pingUrl, { method: 'GET' });
      const elapsed = Date.now() - t0;
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setPingStatus(`✅ Connected! HTTP ${res.status} (${elapsed}ms) - ${JSON.stringify(data)}`);
      } else {
        setPingStatus(`⚠️ Reachable but returned HTTP ${res.status} at ${pingUrl}`);
      }
    } catch (e: any) {
      setPingStatus(`❌ Connection failed: ${e.message}. Backend is sleeping, starting up, or blocked by CORS.`);
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    // Auto-ping on mount to detect backend readiness
    testPing();
  }, []);

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
      const baseUrl = getApiBaseUrl();
      const calledUrl = err instanceof ApiError && err.url ? err.url : `${baseUrl}/auth/login`;
      const status = err instanceof ApiError ? err.status : 'Network / CORS Failure';
      const detail = err instanceof ApiError ? err.message : (err.message || 'Failed to fetch (Backend offline or waking up)');

      setDebugInfo({
        urlCalled: calledUrl,
        status: status,
        errorText: detail,
        time: new Date().toLocaleTimeString(),
      });
      setShowDebug(true);

      if (err instanceof ApiError) {
        setErrorMessage(`[HTTP ${err.status}] ${err.message}`);
      } else {
        setErrorMessage(`Failed to connect to backend server: ${err.message || 'Network error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard}>
        <div className={styles.brandHeader}>
          <img
            src="/assets/hero-full-dark.png"
            alt="Muscle Hunt"
            style={{ width: '80px', height: '80px', objectFit: 'cover', imageRendering: 'pixelated', borderRadius: '16px', border: '2.5px solid #38bdf8', marginBottom: '8px', boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)' }}
          />
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

        {/* Live Diagnostics & Debugger */}
        <div style={{
          marginTop: '20px',
          padding: '12px 14px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid #334155',
          borderRadius: '10px',
          fontSize: '0.78rem',
          color: '#cbd5e1',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, color: '#38bdf8' }}>🛠️ Live Connection Diagnostics</span>
            <button
              type="button"
              onClick={testPing}
              disabled={isPinging}
              style={{
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '0.72rem',
                cursor: isPinging ? 'not-allowed' : 'pointer',
              }}
            >
              {isPinging ? 'Testing...' : 'Test Backend Ping'}
            </button>
          </div>

          <div style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
            <strong style={{ color: '#94a3b8' }}>Target Backend: </strong>
            <span style={{ color: '#a5f3fc' }}>{getApiBaseUrl()}</span>
          </div>

          <div style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
            <strong style={{ color: '#94a3b8' }}>Ping Status: </strong>
            <span>{pingStatus || 'Not tested yet'}</span>
          </div>

          {debugInfo && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px'
            }}>
              <div style={{ color: '#f87171', fontWeight: 600, marginBottom: '4px' }}>
                Latest Login Error ({debugInfo.time}):
              </div>
              <div style={{ wordBreak: 'break-all' }}><strong>Status:</strong> {debugInfo.status}</div>
              <div style={{ wordBreak: 'break-all' }}><strong>URL:</strong> {debugInfo.urlCalled}</div>
              <div style={{ wordBreak: 'break-all' }}><strong>Detail:</strong> {debugInfo.errorText}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
