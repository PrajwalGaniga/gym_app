'use client';

import React from 'react';
import { MemberTable } from '@/components/members/MemberTable';

export default function AllMembersPage() {
  return (
    <MemberTable
      pageTitle="Members Directory"
      pageSubtitle="Complete roster of registered gym athletes, statuses, and profiles."
    />
  );
}
