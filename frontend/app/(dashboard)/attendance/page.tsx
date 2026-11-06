'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/components/members/members.module.css';
import { api, ApiError } from '@/lib/api';
import { Attendance, PaginatedAttendance, Member } from '@/lib/types';
import { formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AttendancePage() {
  const [todayData, setTodayData] = useState<PaginatedAttendance | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Check-in
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const fetchTodayAttendance = async () => {
    try {
      setIsLoading(true);
      const res = await api.getTodayAttendance(page, 15);
      setTodayData(res);
    } catch (err: any) {
      console.error('Error fetching today attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
  }, [page]);

  // Search members on typing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.searchMembers(searchQuery.trim(), 5);
        setSearchResults(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePerformCheckIn = async (member: Member, override: boolean = false) => {
    try {
      setIsCheckingIn(true);
      setCheckInMessage(null);
      const res = await api.checkIn(member.id, override);

      if (res.is_expired_warning) {
        setCheckInMessage({
          text: `⚠️ Check-in logged for ${member.full_name}, but membership is EXPIRED! Please remind member to renew.`,
          type: 'warning',
        });
      } else {
        setCheckInMessage({
          text: `✓ Success! Check-in recorded for ${member.full_name} (${member.member_code}) at ${res.check_in_local_time}.`,
          type: 'success',
        });
      }

      setSelectedMember(null);
      setSearchQuery('');
      setSearchResults([]);
      fetchTodayAttendance();
    } catch (err: any) {
      setCheckInMessage({
        text: err.message || 'Check-in failed.',
        type: 'error',
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Attendance Desk</h1>
          <p className={styles.subtitle}>
            Fast check-in kiosk for member entry, duplicate protection, and expired membership alerts.
          </p>
        </div>
      </div>

      {/* Check-In Action Kiosk Box */}
      <div className={styles.formCard} style={{ maxWidth: '750px', margin: '0' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '12px' }}>Member Check-In</h2>

        {checkInMessage && (
          <div
            className={checkInMessage.type === 'success' ? styles.noticeBox : styles.warningBox}
            style={{
              backgroundColor: checkInMessage.type === 'success' ? '#dcfce7' : checkInMessage.type === 'warning' ? '#fef3c7' : '#fee2e2',
              borderColor: checkInMessage.type === 'success' ? '#86efac' : checkInMessage.type === 'warning' ? '#fcd34d' : '#fca5a5',
              color: checkInMessage.type === 'success' ? '#166534' : checkInMessage.type === 'warning' ? '#92400e' : '#991b1b',
              marginBottom: '16px',
            }}
          >
            {checkInMessage.text}
          </div>
        )}

        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <div className={styles.searchBox} style={{ maxWidth: '100%', padding: '10px 14px' }}>
            <span style={{ fontSize: '1.2rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Search Member ID, Full Name, or Phone Number to check in..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '1rem' }}
            />
            {isSearching && <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Searching...</span>}
          </div>

          {/* Instant Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                zIndex: 50,
                overflow: 'hidden',
              }}
            >
              {searchResults.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedMember(m);
                    setSearchResults([]);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar src={m.photo?.thumbnail_url || m.photo?.url} name={m.full_name} size="sm" />
                    <div>
                      <div style={{ fontWeight: 600 }}>{m.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        ID: <strong>{m.member_code}</strong> • {m.phone}
                      </div>
                    </div>
                  </div>
                  <Badge variant={m.status === 'paid' ? 'success' : m.status === 'expiring_soon' ? 'warning' : 'danger'}>
                    {m.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Member Staging Box */}
        {selectedMember && (
          <div
            style={{
              padding: '16px',
              backgroundColor: selectedMember.status === 'expired' ? '#fee2e2' : '#f8fafc',
              border: `1px solid ${selectedMember.status === 'expired' ? '#fca5a5' : '#cbd5e1'}`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Avatar src={selectedMember.photo?.thumbnail_url || selectedMember.photo?.url} name={selectedMember.full_name} size="md" />
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{selectedMember.full_name}</div>
                <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                  ID: <strong>{selectedMember.member_code}</strong> • Status:{' '}
                  <strong style={{ color: selectedMember.status === 'expired' ? '#dc2626' : '#16a34a' }}>
                    {selectedMember.status.toUpperCase()}
                  </strong>
                  {selectedMember.status === 'expired' && ' (MEMBERSHIP EXPIRED)'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" size="md" onClick={() => setSelectedMember(null)}>
                Clear
              </Button>

              {selectedMember.status === 'expired' ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link href={`/members/${selectedMember.id}?action=renew`}>
                    <Button variant="secondary" size="md">
                      Renew Member
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="md"
                    isLoading={isCheckingIn}
                    onClick={() => handlePerformCheckIn(selectedMember, true)}
                  >
                    Check In Anyway (Warn)
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  isLoading={isCheckingIn}
                  onClick={() => handlePerformCheckIn(selectedMember, false)}
                >
                  ✓ Confirm Check-In
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Today's Attendance Feed */}
      <div className={styles.card}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>
            Today's Check-Ins ({todayData ? todayData.total : 0})
          </h2>
          <Button variant="secondary" size="sm" onClick={fetchTodayAttendance}>
            ↻ Refresh
          </Button>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading check-in logs...</div>
        ) : !todayData || todayData.items.length === 0 ? (
          <EmptyState
            icon="⏱️"
            title="No Check-Ins Today"
            description="Use the search bar above to record member check-ins for today."
          />
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Check-In Time</th>
                  <th>Member</th>
                  <th>Member ID</th>
                  <th>Status at Entry</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {todayData.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ fontSize: '0.9375rem' }}>{item.check_in_local_time}</strong>
                    </td>
                    <td>
                      <Link href={`/members/${item.member_id}`} style={{ fontWeight: 600, color: '#0f172a' }}>
                        {item.member_name_snapshot}
                      </Link>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>
                        {item.member_code_snapshot}
                      </span>
                    </td>
                    <td>
                      {item.is_expired_warning ? (
                        <Badge variant="danger">Expired Entry</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
                    <td style={{ color: '#64748b' }}>{item.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              page={todayData.page}
              totalPages={todayData.total_pages}
              totalItems={todayData.total}
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </div>
    </div>
  );
}
