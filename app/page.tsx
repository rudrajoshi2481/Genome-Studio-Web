'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Canvas } from '@/components/canvas/canvas';

export default function Home() {
  return (
    <MainLayout>
      <Canvas />
    </MainLayout>
  );
}
