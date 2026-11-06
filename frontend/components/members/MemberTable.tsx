'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './members.module.css';
import { api } from '@/lib/api';
import { Member, PaginatedMembers } from '@/lib/types';
import { formatDate, getStatusBadgeDetails } from '@/lib/formatters';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Pagination } from '../ui/Pagination';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';

interface MemberTableProps {
  initialCategory?: 'paid' | 'expiring_soon' | 'expired';
  pageTitle: string;
  pageSubtitle: string;
}

export const MemberTable: React.FC<MemberTableProps> = ({
  initialCategory,
  pageTitle,
  pageSubtitle,
}) => {
  const [category, setCategory] = useState<string | undefined>(initialCategory);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedMembers | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Archive modal confirmation
  const [archiveTarget, setArchiveTarget] = useState<Member | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await api.getMembers({
        category,
        search: search.trim() || undefined,
        archived: showArchived,
        page,
        page_size: 15,
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
  }, [category, page, showArchived]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMembers();
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      setIsArchiving(true);
      if (archiveTarget.is_archived) {
        await api.restoreMember(archiveTarget.id);
      } else {
        await api.archiveMember(archiveTarget.id);
      }
      setArchiveTarget(null);
      fetchMembers();
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{pageTitle}</h1>
          <p className={styles.subtitle}>{pageSubtitle}</p>
        </div>

        <div className={styles.actions}>
          <Link href="/members/import">
            <Button variant="secondary" size="md">
              📥 Bulk CSV Import
            </Button>
          </Link>
          <Link href="/members/legacy">
            <Button variant="secondary" size="md">
              ➕ Add Legacy Member
            </Button>
          </Link>
          <Link href="/members/new">
            <Button variant="primary" size="md">
              ➕ Register New Member
            </Button>
          </Link>
        </div>
      </div>

      {/* Category Tabs if viewing from /members */}
      {!initialCategory && (
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
            🟡 Expiring Soon
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
      )}

      {/* Filter and Search Bar */}
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

        <div className={styles.filterControls}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                setPage(1);
              }}
            />
            <span>Show Archived Members</span>
          </label>
        </div>
      </div>

      {/* Table Card */}
      <div className={styles.card}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading member directory...
          </div>
        ) : error ? (
          <EmptyState icon="⚠️" title="Error" description={error} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No Members Found"
            description={
              search
                ? `No members match search query "${search}".`
                : category
                ? `There are currently no members in category "${category}".`
                : 'No members registered yet in the database.'
            }
            action={
              <Link href="/members/new">
                <Button variant="primary">Register First Member</Button>
              </Link>
            }
          />
        ) : (
          <>
            <table className={styles.table}>
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
                    <tr key={member.id}>
                      <td>
                        <div className={styles.memberCell}>
                          <Avatar
                            src={member.photo?.thumbnail_url || member.photo?.url}
                            name={member.full_name}
                            size="md"
                          />
                          <div className={styles.memberMeta}>
                            <Link href={`/members/${member.id}`} className={styles.memberName}>
                              {member.full_name}
                            </Link>
                            <span className={styles.memberCode}>{member.member_code}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <a href={`tel:${member.phone}`} className={styles.phoneLink}>
                          📞 {member.phone}
                        </a>
                      </td>
                      <td>{planName}</td>
                      <td>{formatDate(expiryDate)}</td>
                      <td>
                        {expiryDate ? (
                          <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
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
                      <td>
                        <div className={styles.actionCell}>
                          <Link href={`/members/${member.id}`}>
                            <Button variant="secondary" size="sm">
                              View
                            </Button>
                          </Link>
                          <Link href={`/members/${member.id}?action=renew`}>
                            <Button variant="primary" size="sm">
                              Renew
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setArchiveTarget(member)}
                            title={member.is_archived ? 'Restore Member' : 'Archive Member'}
                          >
                            {member.is_archived ? 'Restore' : 'Archive'}
                          </Button>
                        </div>
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
              onPageChange={(newPage) => setPage(newPage)}
            />
          </>
        )}
      </div>

      {/* Confirmation Modal for Archive / Restore */}
      {archiveTarget && (
        <Modal
          isOpen={true}
          onClose={() => setArchiveTarget(null)}
          title={archiveTarget.is_archived ? 'Restore Member' : 'Archive Member'}
          footer={
            <>
              <Button variant="secondary" onClick={() => setArchiveTarget(null)}>
                Cancel
              </Button>
              <Button
                variant={archiveTarget.is_archived ? 'primary' : 'danger'}
                isLoading={isArchiving}
                onClick={handleArchiveConfirm}
              >
                {archiveTarget.is_archived ? 'Confirm Restore' : 'Confirm Archive'}
              </Button>
            </>
          }
        >
          <p style={{ fontSize: '0.875rem', lineHeight: 1.5, color: '#334155' }}>
            {archiveTarget.is_archived ? (
              <>
                Are you sure you want to restore <strong>{archiveTarget.full_name}</strong> ({archiveTarget.member_code}) back to active member directories?
              </>
            ) : (
              <>
                Are you sure you want to archive <strong>{archiveTarget.full_name}</strong> ({archiveTarget.member_code})?
                <br /><br />
                Archived members are hidden from normal operational lists but all historical financial records, payments, and attendance logs are permanently retained.
              </>
            )}
          </p>
        </Modal>
      )}
    </div>
  );
};
