
import React from 'react';
import { motion } from 'motion/react';
import { useKashierReturn } from '../hooks/useKashierReturn';
import { CreditCard, Loader2 } from 'lucide-react';

export const PaymentReturnPage: React.FC = () => {
  const { isHandlingPayment } = useKashierReturn();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-secondary-bg border border-white/10 rounded-2xl p-8 text-center shadow-xl"
      >
        <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CreditCard className="text-accent" size={40} />
        </div>
        
        <h1 className="text-2xl font-bold mb-4">Verifying Payment</h1>
        <p className="text-text-secondary mb-8">
          Please wait while we verify your transaction with Kashier. Do not close this browser window.
        </p>

        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-accent" size={32} />
          <span className="text-sm font-medium text-accent">Security check in progress...</span>
        </div>

        {/* Informative Step indicators */}
        <div className="mt-8 space-y-3 text-left max-w-[240px] mx-auto text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span>Payment signal detected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isHandlingPayment ? 'bg-accent animate-pulse' : 'bg-green-500'}`}></div>
            <span>Backend verification</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
            <span>Order synchronization</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
