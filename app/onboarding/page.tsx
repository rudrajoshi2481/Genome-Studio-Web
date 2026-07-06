"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, RefreshCw, ArrowRight, CheckCircle2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [hasPreviousData, setHasPreviousData] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check backend for existing users (persists across port changes unlike localStorage)
    const checkOnboardingStatus = async () => {
      try {
        const res = await fetch(`${window.location.origin}/api/v1/onboarding/status`);
        const data = await res.json();
        setHasPreviousData(data.has_users || false);
      } catch (e) {
        console.error("Failed to check onboarding status:", e);
        setHasPreviousData(false);
      }
      setChecking(false);
    };
    setMounted(true);
    checkOnboardingStatus();
  }, []);

  const handleFreshStart = async () => {
    try {
      // Call backend to wipe all data (database, logs, memory, models)
      await fetch(`${window.location.origin}/api/v1/reset`, { method: "POST" });
    } catch (e) {
      console.error("Backend reset failed:", e);
    }
    // Clear all localStorage keys
    localStorage.clear();
    // Clear auth cookie
    document.cookie = "genome_studio_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
    // Mark as onboarded using cookie (persists across port changes, unlike localStorage)
    document.cookie = "genome_studio_onboarded=true; path=/; max-age=31536000; SameSite=Strict";
    router.replace("/login");
  };

  const handleRestore = () => {
    // Keep existing data, just mark as onboarded using cookie
    document.cookie = "genome_studio_onboarded=true; path=/; max-age=31536000; SameSite=Strict";
    // Check cookies for token (cookies are domain-scoped, persist across ports)
    const cookies = document.cookie.split(";");
    const tokenCookie = cookies.find(c => c.trim().startsWith("genome_studio_token="));
    if (tokenCookie) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  };

  if (!mounted || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

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

      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Genome Studio</h1>
        <p className="mt-2 text-muted-foreground">
          Your visual workflow orchestration IDE for bioinformatics
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        {/* Restore option */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg ${
            hasPreviousData ? "border-primary/50" : "opacity-50 pointer-events-none"
          }`}
          onClick={hasPreviousData ? handleRestore : undefined}
        >
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Restore Previous Session</CardTitle>
            </div>
            <CardDescription>
              Pick up where you left off with your previous workspace, files, and settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasPreviousData ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Previous session detected
                </div>
                <Button className="w-full" onClick={handleRestore}>
                  Restore <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No previous data found.</p>
            )}
          </CardContent>
        </Card>

        {/* Fresh Start option */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg border-primary/50"
          onClick={handleFreshStart}
        >
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Start Fresh</CardTitle>
            </div>
            <CardDescription>
              Begin with a clean slate. Set up a new workspace and configure everything from scratch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={handleFreshStart}>
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        This screen is shown only on first launch. You won&apos;t see it again.
      </p>
    </div>
  );
}
