/**
 * Lightweight utility to detect if the application is currently in a payment processing flow.
 * This is used to suppress non-essential background network activity.
 */
export const isPaymentFlow = (): boolean => {
  const { pathname, search } = window.location;
  
  // It returns TRUE when:
  // 1. pathname starts with /payment-return
  // 2. OR pathname starts with /confirmation
  return pathname.startsWith('/payment-return') || 
         pathname.startsWith('/confirmation');
};
