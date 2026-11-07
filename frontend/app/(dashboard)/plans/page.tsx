'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/components/members/members.module.css';
import { api } from '@/lib/api';
import { Plan } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planName, setPlanName] = useState('');
  const [durationUnit, setDurationUnit] = useState<'month' | 'day'>('month');
  const [durationValue, setDurationValue] = useState<number>(1);
  const [price, setPrice] = useState<number>(1500);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.getPlans();
      setPlans(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load membership plans.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setPlanName('');
    setDurationUnit('month');
    setDurationValue(1);
    setPrice(1500);
    setDescription('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Plan) => {
    setEditingPlan(p);
    setPlanName(p.name);
    setDurationUnit(p.duration_unit);
    setDurationValue(p.duration_value);
    setPrice(p.price);
    setDescription(p.description || '');
    setIsActive(p.is_active);
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) return;

    try {
      setIsSubmitting(true);
      if (editingPlan) {
        await api.updatePlan(editingPlan.id, {
          name: planName.trim(),
          duration_unit: durationUnit,
          duration_value: Number(durationValue),
          price: Number(price),
          description: description.trim() || undefined,
          is_active: isActive,
        });
      } else {
        await api.createPlan({
          name: planName.trim(),
          duration_unit: durationUnit,
          duration_value: Number(durationValue),
          price: Number(price),
          currency: 'INR',
          description: description.trim() || undefined,
          is_active: isActive,
        });
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to save plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Membership Plans</h1>
          <p className={styles.subtitle}>Configure gym durations, pricing, and active subscription packages.</p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          ➕ Create New Plan
        </Button>
      </div>

      <div className={styles.noticeBox}>
        ℹ️ <strong>Calendar Month Arithmetic:</strong> Month-based packages compute dates according to the calendar
        month (clamping to month ends e.g. Jan 31 + 1 month = Feb 28/29) rather than arbitrary 30-day approximations.
      </div>

      <div className={styles.card}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading plans...</div>
        ) : error ? (
          <EmptyState icon="⚠️" title="Error" description={error} />
        ) : plans.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No Plans Found"
            description="No membership plans configured yet."
            action={
              <Button variant="primary" onClick={openCreateModal}>
                Create Plan
              </Button>
            }
          />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Plan Name</th>
                <th>Duration</th>
                <th>Price (INR)</th>
                <th>Description</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong style={{ fontSize: '0.9375rem' }}>{p.name}</strong>
                  </td>
                  <td>
                    {p.duration_value} {p.duration_unit}
                    {p.duration_value > 1 ? 's' : ''}
                  </td>
                  <td style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(p.price, p.currency)}</td>
                  <td>{p.description || '—'}</td>
                  <td>
                    {p.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Button variant="secondary" size="sm" onClick={() => openEditModal(p)}>
                      Edit Plan
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create New Membership Plan'}
        >
          <form onSubmit={handleSavePlan}>
            <Input
              label="Plan Name"
              required
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. 1 Month Standard, 3 Months Quarterly"
            />

            <div className={styles.formGrid}>
              <Input
                label="Duration Value"
                type="number"
                min={1}
                required
                value={durationValue}
                onChange={(e) => setDurationValue(Number(e.target.value))}
              />
              <Select
                label="Duration Unit"
                required
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as any)}
                options={[
                  { value: 'month', label: 'Calendar Month(s)' },
                  { value: 'day', label: 'Day(s)' },
                ]}
              />
            </div>

            <Input
              label="Price (INR ₹)"
              type="number"
              min={0}
              required
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />

            <Input
              label="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Full gym floor access + locker facility"
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', marginTop: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>Plan is Active (available for registration and renewals)</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting}>
                Save Plan
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

