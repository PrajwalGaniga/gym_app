'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import { api, ApiError } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const TOTAL_WAKEUP_SECONDS = 90;

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

  // Friendly Server Wake-up Modal State
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_WAKEUP_SECONDS);
  const [wakeUpStatus, setWakeUpStatus] = useState('Connecting to cloud server...');
  const [isSuccessRedirecting, setIsSuccessRedirecting] = useState(false);

  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeUpTriggerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRetryingRef = useRef(false);
  const isCancelledRef = useRef(false);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  const clearAllTimers = () => {
    if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (wakeUpTriggerTimerRef.current) clearTimeout(wakeUpTriggerTimerRef.current);
  };

  const cancelWakeUp = () => {
    isCancelledRef.current = true;
    clearAllTimers();
    setIsWakingUp(false);
    setIsLoading(false);
    setErrorMessage('Login cancelled. You can try again whenever you are ready.');
  };

  // Helper to attempt login
  const tryLogin = async (creds: { phone?: string; pin?: string; username?: string; password?: string }): Promise<'success' | 'auth_error' | 'wake_up_error'> => {
    try {
      await api.login(creds);
      return 'success';
    } catch (err: any) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 401)) {
        setErrorMessage(err.message || 'Invalid phone number or 4-digit PIN.');
        return 'auth_error';
      }
      // Any network error, timeout, 502, 503, or 504 -> backend is cold starting
      return 'wake_up_error';
    }
  };

  const startWakeUpProcess = (creds: { phone?: string; pin?: string; username?: string; password?: string }) => {
    isCancelledRef.current = false;
    setIsWakingUp(true);
    setSecondsLeft(TOTAL_WAKEUP_SECONDS);
    setWakeUpStatus('Waking up server from power-saving mode...');

    clearAllTimers();

    // 1. Countdown tick every 1s
    countdownIntervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setWakeUpStatus('Almost ready, finalizing connection...');
          return 0;
        }
        const updated = prev - 1;
        if (updated > 60) {
          setWakeUpStatus('Waking up cloud server...');
        } else if (updated > 30) {
          setWakeUpStatus('Starting backend services and database...');
        } else if (updated > 5) {
          setWakeUpStatus('Connecting to server, almost ready...');
        }
        return updated;
      });
    }, 1000);

    // 2. Poll login automatically every 3.5s
    retryIntervalRef.current = setInterval(async () => {
      if (isRetryingRef.current || isCancelledRef.current) return;
      isRetryingRef.current = true;

      const result = await tryLogin(creds);
      if (isCancelledRef.current) return;

      if (result === 'success') {
        clearAllTimers();
        setIsSuccessRedirecting(true);
        setWakeUpStatus('✅ Server online! Taking you to dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 700);
      } else if (result === 'auth_error') {
        clearAllTimers();
        setIsWakingUp(false);
        setIsLoading(false);
      } else {
        // Still waking up, continue retrying
        isRetryingRef.current = false;
      }
    }, 3500);
  };

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

    const creds = loginMode === 'pin'
      ? { phone: phone.trim(), pin: pin.trim() }
      : { username: username.trim(), password };

    setIsLoading(true);
    setErrorMessage('');
    isCancelledRef.current = false;

    // If server takes longer than 2.2s to respond, show the friendly waking-up popup
    wakeUpTriggerTimerRef.current = setTimeout(() => {
      startWakeUpProcess(creds);
    }, 2200);

    const initialResult = await tryLogin(creds);
    if (wakeUpTriggerTimerRef.current) {
      clearTimeout(wakeUpTriggerTimerRef.current);
    }

    if (isCancelledRef.current) return;

    if (initialResult === 'success') {
      clearAllTimers();
      if (isWakingUp) {
        setIsSuccessRedirecting(true);
        setWakeUpStatus('✅ Server online! Taking you to dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      } else {
        router.push('/dashboard');
      }
    } else if (initialResult === 'auth_error') {
      clearAllTimers();
      setIsWakingUp(false);
      setIsLoading(false);
    } else {
      // Immediate network/502 error -> trigger wake-up popup
      if (!isWakingUp) {
        startWakeUpProcess(creds);
      }
    }
  };

  const formatTimer = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    }
    return `${seconds}s`;
  };

  const progressPercent = Math.min(
    100,
    Math.max(5, Math.round(((TOTAL_WAKEUP_SECONDS - secondsLeft) / TOTAL_WAKEUP_SECONDS) * 100))
  );

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
      </div>

      {/* Friendly Server Wake-Up Modal */}
      {isWakingUp && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalIconWrapper}>
              {isSuccessRedirecting ? '🚀' : '⚡'}
            </div>

            <h2 className={styles.modalTitle}>
              {isSuccessRedirecting ? 'Welcome Back!' : 'Starting up Gym Portal...'}
            </h2>

            <p className={styles.modalDesc}>
              {isSuccessRedirecting
                ? 'Connecting your account now...'
                : 'Our secure cloud server was resting to save power. It is waking up now and will be ready shortly.'}
            </p>

            <div className={styles.timerContainer}>
              <div className={styles.timerLabel}>Estimated Wait Time</div>
              <div className={styles.timerValue}>{formatTimer(secondsLeft)}</div>

              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${isSuccessRedirecting ? 100 : progressPercent}%` }}
                />
              </div>

              <div className={styles.statusMessage}>
                <span>{wakeUpStatus}</span>
              </div>
            </div>

            <div className={styles.autoNotice}>
              <span>✨</span>
              <span>No need to click anything — you will be logged in automatically!</span>
            </div>

            {!isSuccessRedirecting && (
              <button type="button" onClick={cancelWakeUp} className={styles.cancelBtn}>
                Cancel & Return to Login
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
