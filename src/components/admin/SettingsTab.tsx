
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
      <div className="bg-secondary-bg p-8 rounded-3xl border border-white/5">
        <h3 className="text-xl font-bold mb-6">Global Application Settings</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Service Fee Percentage (%)</label>
            <input 
              type="number" 
              value={settings.service_fee_percent || 0}
              onChange={(e) => setSettings({ ...settings, service_fee_percent: parseFloat(e.target.value) })}
              className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
              placeholder="e.g. 5"
            />
            <p className="mt-2 text-xs text-text-secondary italic">This fee is added to the total price of every order.</p>
          </div>
          <Button 
            variant="primary" 
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
