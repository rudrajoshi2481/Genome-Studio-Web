"use client";

import dynamic from 'next/dynamic';

const LoginForm = dynamic(
  () => import('../../components/auth/LoginForm').then(mod => mod.default),
  { ssr: false }
);

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
      {/* Decorative background */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-muted/50 to-background"
        aria-hidden
      />
      <div
        className="absolute left-1/2 top-0 -z-10 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.15] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"
        aria-hidden
      />

      <LoginForm />
    </div>
  );
}
