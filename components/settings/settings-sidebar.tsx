'use client';

import { Button } from "@/components/ui/button";
import { Settings, Paintbrush, User, Network } from "lucide-react";

type SettingsSection = 'appearance' | 'editor' | 'profile' | 'connection';

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="w-56 space-y-4">
      <h2 className="text-lg font-semibold">Settings</h2>
      <div className="space-y-1">
        <Button 
          variant={activeSection === 'appearance' ? 'default' : 'ghost'} 
          className="w-full justify-start gap-2"
          onClick={() => onSectionChange('appearance')}
        >
          <Paintbrush className="h-4 w-4" />
          Appearance
        </Button>
        <Button 
          variant={activeSection === 'editor' ? 'default' : 'ghost'} 
          className="w-full justify-start gap-2"
          onClick={() => onSectionChange('editor')}
        >
          <Settings className="h-4 w-4" />
          Editor
        </Button>
        <Button 
          variant={activeSection === 'profile' ? 'default' : 'ghost'} 
          className="w-full justify-start gap-2"
          onClick={() => onSectionChange('profile')}
        >
          <User className="h-4 w-4" />
          Profile
        </Button>
        <Button 
          variant={activeSection === 'connection' ? 'default' : 'ghost'} 
          className="w-full justify-start gap-2"
          onClick={() => onSectionChange('connection')}
        >
          <Network className="h-4 w-4" />
          Connection
        </Button>
      </div>
    </div>
  );
}
