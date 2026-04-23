
import React from 'react';

export const Button: React.FC<{ 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost', 
  className?: string,
  onClick?: () => void,
  disabled?: boolean,
  type?: 'button' | 'submit' | 'reset'
}> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  onClick,
  disabled = false,
  type = 'button'
}) => {
  const baseStyles = "px-6 py-3 rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-accent text-white hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(108,92,231,0.5)] active:scale-95",
    secondary: "bg-secondary-bg text-white hover:bg-white/10",
    outline: "border border-accent text-accent hover:bg-accent hover:text-white",
    ghost: "text-text-secondary hover:text-white hover:bg-white/5"
  };

  return (
    <button 
      type={type}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
