'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Flow } from '@/components/flow/Flow';
import { Notebook } from '@/components/notebook/components/Notebook';

export default function Home() {
  return (
    <MainLayout>
      <Flow />
      {/* <Notebook /> */}
    </MainLayout>
  );
}
