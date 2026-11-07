'use client';

import React from 'react';
import { MemberCardGrid } from '@/components/members/MemberCardGrid';

export default function ExpiredMembersPage() {
  return (
    <MemberCardGrid
      initialCategory="expired"
      pageTitle="🔴 Expired Members"
      pageSubtitle="Members whose monthly membership validity ended and have not paid next month's fee (red border)."
    />
  );
}

