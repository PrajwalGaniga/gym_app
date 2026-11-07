'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './card_grid.module.css';
import tableStyles from './members.module.css';
import { api } from '@/lib/api';
import { Member, PaginatedMembers } from '@/lib/types';
import { formatDate, getStatusBadgeDetails } from '@/lib/formatters';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Pagination } from '../ui/Pagination';
import { EmptyState } from '../ui/EmptyState';
import { MemberCardDetailModal } from './MemberCardDetailModal';

interface MemberCardGridProps {
  initialCategory?: 'paid' | 'expiring_soon' | 'expired';
  pageTitle: string;
  pageSubtitle: string;
}

export const MemberCardGrid: React.FC<MemberCardGridProps> = ({
  initialCategory,
  pageTitle,
  pageSubtitle,
}) => {
  const [category, setCategory] = useState<string | undefined>(initialCategory);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedMembers | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await api.getMembers({
        category,
        search: search.trim() || undefined,
        archived: showArchived,
        page,
        page_size: viewMode === 'cards' ? 12 : 15,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch members.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [category, page, showArchived, viewMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMembers();
  };

  return (
    <div className={styles.container}>
      {/* Member Details Pop-up Modal */}
      <MemberCardDetailModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onRenewed={() => fetchMembers()}
      />

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{pageTitle}</h1>
          <p className={styles.subtitle}>{pageSubtitle}</p>
        </div>

        <div className={styles.actionButtons}>
          <Link href="/members/import">
            <Button variant="secondary" size="md">
              📥 Bulk CSV Import
            </Button>
          </Link>
          <Link href="/members/legacy">
            <Button variant="secondary" size="md">
              ➕ Add Existing Member
            </Button>
          </Link>
          <Link href="/members/new">
            <Button variant="primary" size="md">
              ➕ Register New Member
            </Button>
          </Link>
        </div>
      </div>

      {/* Category Filter Tabs - Smooth horizontal scrolling on phone */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tab} ${category === undefined ? styles.tabActive : ''}`}
          onClick={() => {
            setCategory(undefined);
            setPage(1);
          }}
        >
          All Members
        </button>
        <button
          className={`${styles.tab} ${category === 'paid' ? styles.tabActive : ''}`}
          onClick={() => {
            setCategory('paid');
            setPage(1);
          }}
        >
          🟢 Paid
        </button>
        <button
          className={`${styles.tab} ${category === 'expiring_soon' ? styles.tabActive : ''}`}
          onClick={() => {
            setCategory('expiring_soon');
            setPage(1);
          }}
        >
          🟡 Expiring (3 Days)
        </button>
        <button
          className={`${styles.tab} ${category === 'expired' ? styles.tabActive : ''}`}
          onClick={() => {
            setCategory('expired');
            setPage(1);
          }}
        >
          🔴 Expired
        </button>
      </div>

      {/* Search and View Controls */}
      <div className={styles.filterBar}>
        <form onSubmit={handleSearchSubmit} className={styles.searchBox}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search by ID, Name, or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="ghost" size="sm">
            Search
          </Button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', cursor: 'pointer', color: '#475569' }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                setPage(1);
              }}
            />
            <span>Show Archived</span>
          </label>

          {/* View Toggle */}
          <div className={styles.viewToggle}>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'cards' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('cards')}
            >
              🎴 Cards View
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'table' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('table')}
            >
              📄 Table View
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          Loading gym members...
        </div>
      ) : error ? (
        <EmptyState icon="⚠️" title="Error" description={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No Members Found"
          description={
            search
              ? `No members match search "${search}".`
              : category
              ? `No members currently categorized as "${category}".`
              : 'No gym members registered yet.'
          }
          action={
            <Link href="/members/new">
              <Button variant="primary">Register First Member</Button>
            </Link>
          }
        />
      ) : viewMode === 'cards' ? (
        /* Cards Grid View */
        <>
          <div className={styles.cardsGrid}>
            {data.items.map((member) => {
              const avatarUrl = member.photo?.thumbnail_url || member.photo?.url;
              const initials = member.full_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              // Status Border Class
              const cardBorderClass =
                member.status === 'paid'
                  ? styles.cardPaid
                  : member.status === 'expiring_soon'
                  ? styles.cardExpiringSoon
                  : styles.cardExpired;

              // Countdown Pill Class
              const countdownClass =
                member.status === 'paid'
                  ? styles.countdownPaid
                  : member.status === 'expiring_soon'
                  ? styles.countdownExpiringSoon
                  : styles.countdownExpired;

              const countdownText =
                member.remaining_days > 0
                  ? `${member.remaining_days} days left`
                  : member.remaining_days === 0
                  ? 'Expires Today'
                  : `Expired ${Math.abs(member.remaining_days)}d ago`;

              return (
                <div
                  key={member.id}
                  className={`${styles.memberCard} ${cardBorderClass}`}
                  onClick={() => setSelectedMember(member)}
                  title="Click to view history & financial summary"
                >
                  {/* Top Row: Code & Countdown Status */}
                  <div className={styles.cardTopRow}>
                    <span className={styles.memberCodeBadge}>{member.member_code}</span>
                    <span className={`${styles.statusCountdown} ${countdownClass}`}>
                      {member.status === 'paid'
                        ? '🟢 '
                        : member.status === 'expiring_soon'
                        ? '🟡 '
                        : '🔴 '}
                      {countdownText}
                    </span>
                  </div>

                  {/* Middle Row: Photo, Name, Contact */}
                  <div className={styles.cardProfileRow}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={member.full_name} className={styles.cardAvatar} />
                    ) : (
                      <div className={styles.cardAvatarPlaceholder}>{initials}</div>
                    )}
                    <div className={styles.cardMemberInfo}>
                      <h3 className={styles.cardMemberName}>{member.full_name}</h3>
                      <a
                        href={`tel:${member.phone}`}
                        className={styles.cardPhone}
                        onClick={(e) => e.stopPropagation()}
                      >
                        📞 {member.phone}
                      </a>
                      {member.gender && <span className={styles.cardGender}>{member.gender}</span>}
                    </div>
                  </div>

                  {/* Bottom Row: Plan preview & Click hint */}
                  <div className={styles.cardBottomRow}>
                    <span className={styles.cardPlanName}>
                      {member.current_membership?.plan_name || 'No Plan'}
                    </span>
                    <span className={styles.clickHint}>Click to open ↗</span>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={data.page}
            totalPages={data.total_pages}
            totalItems={data.total}
            onPageChange={(p) => setPage(p)}
          />
        </>
      ) : (
        /* Fallback Table View */
        <div className={tableStyles.card}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Contact</th>
                <th>Current Plan</th>
                <th>Expiry Date</th>
                <th>Remaining</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((member) => {
                const badge = getStatusBadgeDetails(member.status);
                const expiryDate = member.current_membership?.expiry_date;
                const planName = member.current_membership?.plan_name || 'No Active Plan';

                return (
                  <tr key={member.id} onClick={() => setSelectedMember(member)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className={tableStyles.memberCell}>
                        <div className={styles.cardAvatarPlaceholder} style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                          {member.full_name[0]}
                        </div>
                        <div className={tableStyles.memberMeta}>
                          <span className={tableStyles.memberName}>{member.full_name}</span>
                          <span className={tableStyles.memberCode}>{member.member_code}</span>
                        </div>
                      </div>
                    </td>
                    <td>📞 {member.phone}</td>
                    <td>{planName}</td>
                    <td>{formatDate(expiryDate)}</td>
                    <td>
                      {expiryDate ? (
                        <span style={{ fontWeight: 600 }}>
                          {member.remaining_days > 0
                            ? `${member.remaining_days} days`
                            : member.remaining_days === 0
                            ? 'Expires Today'
                            : `${Math.abs(member.remaining_days)}d expired`}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <Badge variant={badge.variant as any}>{badge.label}</Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMember(member);
                        }}
                      >
                        Open Card ↗
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Pagination
            page={data.page}
            totalPages={data.total_pages}
            totalItems={data.total}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
};

