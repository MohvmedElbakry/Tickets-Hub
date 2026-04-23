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
        className="appearance-none bg-primary-bg border border-white/10 rounded-2xl py-4 pl-4 pr-10 focus:outline-none focus:border-accent transition-colors cursor-pointer font-bold text-sm h-full"
      >
        {countries.map(c => (
          <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none group-hover:text-accent transition-colors" size={16} />
    </div>
  );
};
