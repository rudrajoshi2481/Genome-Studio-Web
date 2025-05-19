'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Canvas } from '@/components/canvas/canvas';
import { Notebook } from '@/components/notebook/components/Notebook';

export default function Home() {
  return (
    <MainLayout>
      <Canvas />
      {/* <Notebook /> */}
    </MainLayout>
  );
}
