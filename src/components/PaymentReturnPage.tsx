
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
        className="max-w-md w-full bg-bg-card border border-bg-border rounded-card-2xl p-8 text-center shadow-2xl"
      >
        <div className="w-20 h-20 bg-teal/10 rounded-card flex items-center justify-center mx-auto mb-6 shadow-card-glow text-teal">
          <CreditCard size={40} />
        </div>
        
        <h1 className="text-h2 mb-4 lowercase tracking-tight"><span className="uppercase">Verifying</span> Secure <br/><span className="text-teal font-sans italic">Transaction</span></h1>
        <p className="text-text-muted mb-8 text-body-sm leading-relaxed">
          Please wait while we verify your transaction through the HUB-PAY secure gateway. Do not close this browser window.
        </p>

        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-teal" size={32} />
          <span className="text-label font-black uppercase tracking-widest text-teal">Security check in progress...</span>
        </div>

        <div className="mt-10 space-y-4 text-left max-w-[240px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-status-success shadow-status-success"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Payment signal detected</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isHandlingPayment ? 'bg-teal animate-pulse shadow-teal' : 'bg-status-success shadow-status-success'}`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Backend verification</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-bg-border"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-40">Order synchronization</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
