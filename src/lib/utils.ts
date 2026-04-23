
export const calculateAge = (birthdate?: string) => {
  if (!birthdate) return 'N/A';
  const today = new Date();
  const birthDate = new Date(birthdate);
  if (isNaN(birthDate.getTime())) return 'N/A';
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};
