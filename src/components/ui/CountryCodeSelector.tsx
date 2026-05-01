import React from 'react';
import { ChevronDown } from 'lucide-react';

interface CountryCodeSelectorProps {
  value: string;
  onChange: (code: string) => void;
}

export const CountryCodeSelector = ({ value, onChange }: CountryCodeSelectorProps) => {
  const countries = [
    { code: '+20', flag: '🇪🇬', name: 'Egypt' },
    { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
    { code: '+971', flag: '🇦🇪', name: 'UAE' },
    { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
    { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  ];

  return (
    <div className="relative group">
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-bg-elevated border border-bg-border rounded-card py-4 pl-4 pr-10 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/20 transition-all cursor-pointer font-black text-label uppercase tracking-widest h-full"
      >
        {countries.map(c => (
          <option key={c.code} value={c.code} className="bg-bg-card">{c.flag} {c.code}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none group-focus-within:text-teal transition-colors" size={16} />
    </div>
  );
};
