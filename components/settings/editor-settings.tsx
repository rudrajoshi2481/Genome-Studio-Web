'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useEditorPreferences } from "@/lib/states/editor-preferences";

export function EditorSettings() {
  const { preferences, updatePreferences } = useEditorPreferences();
  const { fontSize, lineHeight, showLineNumbers, wordWrap, autoSave } = preferences;

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Editor</h3>
        <p className="text-sm text-muted-foreground">
          Customize your editor preferences
        </p>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Font Settings</CardTitle>
            <CardDescription>
              Customize the editor font size and line height.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Font Size ({fontSize}px)</Label>
                <Slider
                  value={[fontSize]}
                  onValueChange={(value) => updatePreferences({ fontSize: value[0] })}
                  min={10}
                  max={24}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Line Height ({lineHeight})</Label>
                <Slider
                  value={[lineHeight]}
                  onValueChange={(value) => updatePreferences({ lineHeight: value[0] })}
                  min={10}
                  max={25}
                  step={1}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Editor Preferences</CardTitle>
            <CardDescription>
              Configure your editor behavior and display settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Line Numbers</Label>
                  <p className="text-sm text-muted-foreground">
                    Display line numbers in the editor gutter
                  </p>
                </div>
                <Switch
                  checked={showLineNumbers}
                  onCheckedChange={(checked) => updatePreferences({ showLineNumbers: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Word Wrap</Label>
                  <p className="text-sm text-muted-foreground">
                    Wrap long lines to fit in the editor
                  </p>
                </div>
                <Switch
                  checked={wordWrap}
                  onCheckedChange={(checked) => updatePreferences({ wordWrap: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Save</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save changes
                  </p>
                </div>
                <Switch
                  checked={autoSave}
                  onCheckedChange={(checked) => updatePreferences({ autoSave: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
