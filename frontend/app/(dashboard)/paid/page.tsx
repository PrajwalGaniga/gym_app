'use client';

import React from 'react';
import { MemberTable } from '@/components/members/MemberTable';

export default function PaidMembersPage() {
  return (
    <MemberTable
      initialCategory="paid"
      pageTitle="Paid Members"
      pageSubtitle="Members with active memberships and more than 3 calendar days of validity remaining."
    />
  );
}
