import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from './ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-32 text-center layout-stack gap-12">
      <div className="content-stack items-center">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 15 }}
          className="w-32 h-32 bg-bg-elevated text-teal rounded-card-2xl flex items-center justify-center mx-auto mb-10 shadow-card-glow relative"
        >
          <Compass size={64} className="animate-spin-slow" />
          <div className="absolute -top-4 -right-4 bg-status-error text-white text-h4 font-black px-3 py-1 rounded-card border-2 border-bg-page animate-bounce">
            404
          </div>
        </motion.div>
        
        <div className="content-stack gap-4">
          <h1 className="text-h1">Route Not Found</h1>
          <p className="text-body-lg text-text-muted max-w-lg mx-auto">
            It seems you've wandered off the track. The page you're looking for doesn't exist or has been moved to a new destination.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8 border-t border-bg-border">
        <Button variant="accent" className="px-10 py-4 text-button font-black uppercase tracking-widest gap-2" onClick={() => navigate('/')}>
          <ArrowLeft size={18} /> Return to Hub
        </Button>
        <Button variant="outline" className="px-10 py-4 text-button font-black uppercase tracking-widest" onClick={() => navigate('/events')}>
          Browse Events
        </Button>
      </div>
    </div>
  );
};
