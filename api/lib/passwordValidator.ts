export interface PasswordValidationResult {
  isValid: boolean;
  rules: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
    noSpaces: boolean;
  };
}

export function validatePassword(password: string): PasswordValidationResult {
  const length = password.length >= 8;
  const uppercase = /[A-Z]/.test(password);
  const lowercase = /[a-z]/.test(password);
  const number = /[0-9]/.test(password);
  // Special characters: any character that is not a letter or number (punctuation, symbols, etc.)
  const special = /[^A-Za-z0-9]/.test(password);
  // No leading or trailing spaces
  const noSpaces = password.length > 0 && password[0] !== ' ' && password[password.length - 1] !== ' ';

  const isValid = length && uppercase && lowercase && number && special && noSpaces;

  return {
    isValid,
    rules: {
      length,
      uppercase,
      lowercase,
      number,
      special,
      noSpaces,
    },
  };
}
