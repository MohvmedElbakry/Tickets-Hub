import React from 'react';
import { validatePassword } from '../../../api/lib/passwordValidator';

interface PasswordChecklistProps {
  password: string;
  confirmPassword?: string;
  onValidationChange?: (isValid: boolean) => void;
}

export const PasswordChecklist: React.FC<PasswordChecklistProps> = ({
  password,
  confirmPassword,
  onValidationChange,
}) => {
  const result = validatePassword(password);
  
  const rules = {
    length: result.rules.length,
    uppercase: result.rules.uppercase,
    lowercase: result.rules.lowercase,
    number: result.rules.number,
    special: result.rules.special,
    noSpaces: result.rules.noSpaces,
    match: confirmPassword !== undefined ? (password === confirmPassword && password.length > 0) : true,
  };

  const isAllValid = result.isValid && rules.match;

  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isAllValid);
    }
  }, [isAllValid, onValidationChange]);

  return (
    <div className="bg-bg-elevated p-4 rounded-card border border-bg-border/60 w-full" id="password-checklist">
      <h4 className="text-body-sm font-semibold text-text-primary mb-3">Password Requirements</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${rules.length ? 'bg-teal/20 text-teal' : 'bg-bg-border text-text-muted'}`}>
            ✓
          </div>
          <span className={rules.length ? 'text-teal font-medium' : 'text-text-muted'}>At least 8 characters</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${rules.uppercase ? 'bg-teal/20 text-teal' : 'bg-bg-border text-text-muted'}`}>
            ✓
          </div>
          <span className={rules.uppercase ? 'text-teal font-medium' : 'text-text-muted'}>Uppercase letter</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${rules.lowercase ? 'bg-teal/20 text-teal' : 'bg-bg-border text-text-muted'}`}>
            ✓
          </div>
          <span className={rules.lowercase ? 'text-teal font-medium' : 'text-text-muted'}>Lowercase letter</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${rules.number ? 'bg-teal/20 text-teal' : 'bg-bg-border text-text-muted'}`}>
            ✓
          </div>
          <span className={rules.number ? 'text-teal font-medium' : 'text-text-muted'}>Include a number</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${rules.special ? 'bg-teal/20 text-teal' : 'bg-bg-border text-text-muted'}`}>
            ✓
          </div>
          <span className={rules.special ? 'text-teal font-medium' : 'text-text-muted'}>Special character</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${rules.noSpaces ? 'bg-teal/20 text-teal' : 'bg-bg-border text-text-muted'}`}>
            ✓
          </div>
          <span className={rules.noSpaces ? 'text-teal font-medium' : 'text-text-muted'}>No lead/trail spaces</span>
        </div>
        {confirmPassword !== undefined && (
          <div className="flex items-center gap-2 sm:col-span-2 border-t border-bg-border/40 pt-2 mt-1">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${rules.match ? 'bg-teal/20 text-teal' : 'bg-bg-border text-text-muted'}`}>
              ✓
            </div>
            <span className={rules.match ? 'text-teal font-medium' : 'text-text-muted'}>Passwords match</span>
          </div>
        )}
      </div>
    </div>
  );
};
