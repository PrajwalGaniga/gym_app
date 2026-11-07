'use client';

import React from 'react';
import { MemberCardGrid } from '@/components/members/MemberCardGrid';

export default function PaidMembersPage() {
  return (
    <MemberCardGrid
      initialCategory="paid"
      pageTitle="🟢 Paid Members"
      pageSubtitle="Active gym members within the 30-day membership countdown (solid green border)."
    />
  );
}

