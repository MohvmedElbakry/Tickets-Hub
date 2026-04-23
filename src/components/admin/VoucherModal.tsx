
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';
import { authService } from '../../services/authService';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiry, setExpiry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code || !discount || !maxUses || !expiry) {
      setError('All fields are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await authService.adminCreateVoucher({ 
        code, 
        discount_percent: parseInt(discount) || 0, 
        max_uses: parseInt(maxUses) || 0, 
        expiration_date: expiry,
        name: `Admin Created: ${code}`
      });
      
      if (data) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      try {
        const errorData = JSON.parse(err.message);
        setError(errorData.error || 'Failed to create voucher');
      } catch {
        setError(err.message || 'Error creating voucher');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-primary-bg/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-secondary-bg w-full max-w-md rounded-[2.5rem] p-8 border border-white/10 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Create Voucher</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Voucher Code</label>
            <input 
              type="text" 
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="E.g. SUMMER2024"
              className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Discount (%)</label>
              <input 
                type="number" 
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                placeholder="10"
                className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Max Uses</label>
              <input 
                type="number" 
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                placeholder="100"
                className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Expiration Date</label>
            <input 
              type="date" 
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              className="w-full bg-primary-bg border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
            />
          </div>

          <Button type="submit" className="w-full py-4" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Voucher'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};
