'use client';

import React from 'react';
import { MemberCardGrid } from '@/components/members/MemberCardGrid';

export default function AllMembersPage() {
  return (
    <MemberCardGrid
      pageTitle="Members Directory"
      pageSubtitle="Interactive athlete cards with live payment statuses, history, and revenue tracking."
    />
  );
}

