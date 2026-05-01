
import React from 'react';

export const Button: React.FC<{ 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent', 
  size?: 'sm' | 'md' | 'lg',
  className?: string,
  onClick?: () => void,
  disabled?: boolean,
  type?: 'button' | 'submit' | 'reset'
}> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '', 
  onClick,
  disabled = false,
  type = 'button'
}) => {
  const baseStyles = "rounded-pill font-sans transition-all duration-base ease-out flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 focus:ring-offset-bg-page disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95";
  
  const sizes = {
    sm: "px-5 py-2 text-label tracking-widest font-black uppercase",
    md: "px-7 py-3.5 text-button font-black uppercase tracking-widest",
    lg: "px-9 py-5 text-button font-black uppercase tracking-widest scale-105"
  };

  const variants = {
    primary: "bg-teal text-onteal hover:bg-teal-light shadow-card hover:shadow-card-glow active:shadow-none",
    accent: "bg-teal text-onteal hover:bg-teal-light shadow-card hover:shadow-card-glow active:shadow-none",
    secondary: "bg-bg-elevated text-text-primary border border-bg-border hover:bg-bg-card hover:border-teal/30 hover:shadow-card active:bg-bg-border",
    outline: "border-2 border-teal text-teal hover:bg-teal hover:text-onteal hover:shadow-card-glow active:bg-teal-dark",
    ghost: "text-text-muted hover:text-text-primary hover:bg-bg-elevated active:bg-bg-border"
  };

  return (
    <button 
      type={type}
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
