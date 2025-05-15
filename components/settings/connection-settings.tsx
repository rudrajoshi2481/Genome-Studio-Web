'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useConnectionPreferences } from "@/lib/states";

export function ConnectionSettings() {
  const { preferences, updatePreferences } = useConnectionPreferences();
  const { wsUrl } = preferences;

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Connection Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure connection endpoints for the application
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Configuration</CardTitle>
          <CardDescription>
            Configure the WebSocket server endpoint
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="wsUrl">WebSocket URL</Label>
            <Input
              id="wsUrl"
              value={wsUrl}
              onChange={(e) => updatePreferences({ wsUrl: e.target.value })}
              placeholder="localhost:8000"
            />
            <p className="text-sm text-muted-foreground">
              The WebSocket server URL for real-time updates. Default: localhost:8000
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
