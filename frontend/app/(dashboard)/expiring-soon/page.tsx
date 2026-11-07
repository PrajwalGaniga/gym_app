'use client';

import React from 'react';
import { MemberCardGrid } from '@/components/members/MemberCardGrid';

export default function ExpiringSoonMembersPage() {
  return (
    <MemberCardGrid
      initialCategory="expiring_soon"
      pageTitle="🟡 Expiring Soon (3 Days Left)"
      pageSubtitle="Members with 0 to 3 days remaining before their monthly cycle ends (amber alert border)."
    />
  );
}

