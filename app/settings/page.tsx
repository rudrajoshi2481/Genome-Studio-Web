'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { useState } from 'react';
import { SettingsSidebar } from '@/components/settings/settings-sidebar';
import { AppearanceSettings } from '@/components/settings/appearance-settings';
import { EditorSettings } from '@/components/settings/editor-settings';
import { ProfileSettings } from '@/components/settings/profile-settings';
import { ConnectionSettings } from '@/components/settings/connection-settings';

type SettingsSection = 'appearance' | 'editor' | 'profile' | 'connection';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');

  return (
    <MainLayout>
      <div className="container max-w-5xl p-6 mx-auto">
        <div className="mb-8">
          <Button variant="ghost" className="-ml-2 text-muted-foreground hover:text-foreground" asChild>
            <Link href="/" className="flex items-center gap-2" prefetch>
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </Button>
        </div>

        <div className="flex gap-12">
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />

          <div className="flex-1">
            {activeSection === 'appearance' && <AppearanceSettings />}
            {activeSection === 'editor' && <EditorSettings />}
            {activeSection === 'profile' && <ProfileSettings />}
            {activeSection === 'connection' && <ConnectionSettings />}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
