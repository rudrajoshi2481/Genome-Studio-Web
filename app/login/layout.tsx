'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import auth store provider with no SSR
const AuthStoreProvider = dynamic(
  () => import('@/lib/stores/auth-provider').then((mod) => mod.AuthStoreProvider),
  { ssr: false }
);

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthStoreProvider>
      {children}
    </AuthStoreProvider>
  );
}
