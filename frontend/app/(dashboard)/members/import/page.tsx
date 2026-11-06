'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/components/members/members.module.css';
import { api } from '@/lib/api';
import { LegacyImportPreview } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function BulkImportPage() {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<LegacyImportPreview | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ imported_count: number; skipped_count: number; errors: string[] } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDownloadTemplate = async () => {
    try {
      const csvStr = await api.downloadImportTemplate();
      const blob = new Blob([csvStr], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'legacy_members_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download CSV template.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMessage('');
      setCommitResult(null);

      try {
        setIsPreviewing(true);
        const preview = await api.previewImportCsv(file);
        setPreviewData(preview);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to parse CSV file.');
      } finally {
        setIsPreviewing(false);
      }
    }
  };

  const handleCommit = async () => {
    if (!previewData || previewData.valid_rows === 0) return;

    // Filter only valid rows for commit
    const validRows = previewData.rows
      .filter((r) => r.is_valid)
      .map((r) => ({
        member_code: r.member_code,
        full_name: r.full_name,
        phone: r.phone,
        joining_date: r.joining_date || undefined,
        expiry_date: r.expiry_date || undefined,
        payment_amount: r.payment_amount !== null ? r.payment_amount : undefined,
        payment_date: r.payment_date || undefined,
        payment_method: r.payment_method || undefined,
        notes: r.notes || undefined,
      }));

    try {
      setIsCommitting(true);
      setErrorMessage('');
      const result = await api.commitImportCsv(validRows);
      setCommitResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to commit import.');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Bulk Legacy Member Import</h1>
          <p className={styles.subtitle}>
            Import existing gym members from spreadsheet or CSV records with complete validation and duplicate protection.
          </p>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleDownloadTemplate}>
            📄 Download CSV Template
          </Button>
          <Link href="/members">
            <Button variant="secondary">← Back to Members</Button>
          </Link>
        </div>
      </div>

      <div className={styles.formCard} style={{ maxWidth: '950px' }}>
        {errorMessage && <div className={styles.warningBox}>⚠️ {errorMessage}</div>}

        {commitResult ? (
          <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            <span style={{ fontSize: '3rem' }}>🎉</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '16px 0 8px 0' }}>
              Import Completed Successfully!
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9375rem', marginBottom: '24px' }}>
              Successfully imported <strong>{commitResult.imported_count}</strong> members into MongoDB Atlas.{' '}
              {commitResult.skipped_count > 0 && <span>({commitResult.skipped_count} skipped due to existing IDs).</span>}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <Link href="/members">
                <Button variant="primary" size="lg">
                  View Members Directory
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setCommitResult(null);
                  setPreviewData(null);
                  setSelectedFile(null);
                }}
              >
                Import Another File
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* File Upload Box */}
            <div style={{ padding: '24px', border: '2px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '2rem' }}>📁</span>
              <div style={{ fontWeight: 600, margin: '8px 0 4px 0' }}>Select Legacy CSV File to Import</div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '16px' }}>
                Files exported from Excel, Google Sheets, or previous gym software.
              </div>
              <input type="file" accept=".csv" onChange={handleFileChange} />
              {isPreviewing && <p style={{ marginTop: '12px', color: '#2563eb' }}>Validating CSV contents...</p>}
            </div>

            {/* Preview Summary */}
            {previewData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Total Rows</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{previewData.total_rows}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#dcfce7', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#166534', textTransform: 'uppercase' }}>Valid Rows</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534' }}>{previewData.valid_rows}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#991b1b', textTransform: 'uppercase' }}>Invalid Rows</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991b1b' }}>{previewData.invalid_rows}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#92400e', textTransform: 'uppercase' }}>Duplicates</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#92400e' }}>{previewData.duplicate_codes.length}</div>
                  </div>
                </div>

                {/* Rows Table */}
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Member ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Expiry Date</th>
                        <th>Payment</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((r) => (
                        <tr key={r.row_number} style={{ backgroundColor: r.is_valid ? 'inherit' : '#fff5f5' }}>
                          <td>#{r.row_number}</td>
                          <td>
                            <strong>{r.member_code}</strong>
                          </td>
                          <td>{r.full_name}</td>
                          <td>{r.phone}</td>
                          <td>{r.expiry_date || '—'}</td>
                          <td>{r.payment_amount ? `₹${r.payment_amount} (${r.payment_method})` : '—'}</td>
                          <td>
                            {r.is_valid ? (
                              <Badge variant="success">Valid</Badge>
                            ) : (
                              <div>
                                <Badge variant="danger">Invalid</Badge>
                                <ul style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px', paddingLeft: '16px' }}>
                                  {r.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={previewData.valid_rows === 0}
                    isLoading={isCommitting}
                    onClick={handleCommit}
                  >
                    Commit {previewData.valid_rows} Valid Members
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
