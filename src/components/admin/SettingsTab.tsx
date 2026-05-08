
import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { eventService } from '../../services/eventService';
import { useEvents } from '../../context/EventsContext';

interface SettingsTabProps {}

export const SettingsTab: React.FC<SettingsTabProps> = () => {
  const { settings, setSettings } = useEvents();
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  return (
    <section className="max-w-2xl">
      <div className="bg-bg-card p-8 rounded-3xl border border-bg-border">
        <h3 className="text-h3 mb-6">Global Application Settings</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-body-sm font-medium text-text-muted mb-2">Service Fee Percentage (%)</label>
            <input 
              type="number" 
              step="0.01"
              value={settings.service_fee_percent}
              onChange={(e) => setSettings({ ...settings, service_fee_percent: parseFloat(e.target.value) })}
              className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50"
              placeholder="e.g. 10"
            />
            <p className="mt-2 text-body-xs text-text-muted italic">This fee is added to the total price (Platform Fee).</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-body-sm font-medium text-text-muted mb-2">Processing Fee (%)</label>
              <input 
                type="number" 
                step="0.01"
                value={settings.processing_fee_percent}
                onChange={(e) => setSettings({ ...settings, processing_fee_percent: parseFloat(e.target.value) })}
                className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50"
                placeholder="e.g. 2.75"
              />
            </div>
            <div>
              <label className="block text-body-sm font-medium text-text-muted mb-2">Fixed Fee (EGP)</label>
              <input 
                type="number" 
                step="0.01"
                value={settings.fixed_fee_egp}
                onChange={(e) => setSettings({ ...settings, fixed_fee_egp: parseFloat(e.target.value) })}
                className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50"
                placeholder="e.g. 3"
              />
            </div>
          </div>
          <p className="-mt-4 text-body-xs text-text-muted italic">Processing fees are usually (2.75% + 3 EGP).</p>
          <Button 
            variant="accent" 
            className="w-full py-4" 
            disabled={isSavingSettings}
            onClick={async () => {
              setIsSavingSettings(true);
              try {
                const data = await eventService.adminUpdateSettings(settings);
                if (data) alert('Settings updated successfully!');
              } catch (err) {
                console.error('Failed to save settings', err);
              } finally {
                setIsSavingSettings(false);
              }
            }}
          >
            {isSavingSettings ? <RefreshCw className="animate-spin" size={20} /> : 'Save Global Settings'}
          </Button>
        </div>
      </div>
    </section>
  );
};
