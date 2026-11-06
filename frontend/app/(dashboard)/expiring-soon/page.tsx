'use client';

import React from 'react';
import { MemberTable } from '@/components/members/MemberTable';

export default function ExpiringSoonMembersPage() {
  return (
    <MemberTable
      initialCategory="expiring_soon"
      pageTitle="Expiring Soon (0–3 Days)"
      pageSubtitle="Members with 0, 1, 2, or 3 days remaining before expiration (including expiring today)."
    />
  );
}
