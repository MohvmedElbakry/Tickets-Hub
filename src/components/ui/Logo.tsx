import React, { useState } from 'react';
import { Ticket } from 'lucide-react';
import { cn } from '../../lib/utils';
import logoImg from './logo.PNG';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  textOnly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  iconOnly = false, 
  textOnly = false,
  size = 'md' 
}) => {
  const [imgError, setImgError] = useState(false);
  
  const iconSizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    hero: 'w-28 h-28'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    hero: 'text-4xl'
  };

  if (textOnly) {
    return (
      <span className={cn(
        "font-display font-bold tracking-tight text-text-primary",
        textSizes[size],
        className
      )}>
        TicketsHub
      </span>
    );
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      {!textOnly && (
        <div className={cn(
          "flex items-center justify-center transition-all duration-base",
          iconSizes[size]
        )}>
          {!imgError ? (
            <img 
              src={logoImg} 
              alt="TicketsHub" 
              className="w-full h-full object-contain scale-125 block"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="bg-teal rounded-card w-full h-full flex items-center justify-center shadow-card">
              <Ticket className="text-onteal" size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
            </div>
          )}
        </div>
      )}
      {!iconOnly && (
        <span className={cn(
          "font-display font-bold tracking-tight text-text-primary",
          textSizes[size]
        )}>
          TicketsHub
        </span>
      )}
    </div>
  );
};
