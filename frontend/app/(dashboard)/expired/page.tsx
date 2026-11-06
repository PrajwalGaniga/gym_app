'use client';

import React from 'react';
import { MemberTable } from '@/components/members/MemberTable';

export default function ExpiredMembersPage() {
  return (
    <MemberTable
      initialCategory="expired"
      pageTitle="Expired Members"
      pageSubtitle="Members whose membership validity ended prior to today in the gym's configured timezone."
    />
  );
}
