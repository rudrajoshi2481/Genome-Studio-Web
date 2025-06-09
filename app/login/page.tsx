"use client";

import dynamic from 'next/dynamic';

// Use a client component for the actual login form
const LoginForm = dynamic(
  () => import('../../components/auth/LoginForm').then(mod => mod.default),
  { ssr: false }
);

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <LoginForm />
    </div>
  );
}
