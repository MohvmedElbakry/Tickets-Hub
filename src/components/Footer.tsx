import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ticket, 
  Facebook, 
  Twitter, 
  Instagram, 
  Mail 
} from 'lucide-react';

import { Logo } from './ui/Logo';

export const Footer = React.memo(() => {
  const navigate = useNavigate();
  return (
  <footer className="bg-bg-card border-t border-bg-border pt-24 pb-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
        <div className="content-stack gap-6">
          <div className="cursor-pointer group w-fit" onClick={() => navigate('/')}>
            <Logo />
          </div>
          <p className="text-body-sm text-text-muted leading-relaxed max-w-xs">
            The most trusted platform for event discovery and secure ticket booking in Egypt. Built for the modern event-goer.
          </p>
          <div className="flex gap-4">
            {[Facebook, Twitter, Instagram, Mail].map((Icon, i) => (
              <button key={i} className="w-10 h-10 rounded-card bg-bg-elevated/50 flex items-center justify-center text-text-muted hover:bg-teal hover:text-onteal border border-bg-border transition-all duration-base group">
                <Icon size={18} className="group-hover:scale-110 transition-transform" />
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-label font-black uppercase tracking-widest text-text-primary mb-8">Navigation</h4>
          <ul className="content-stack gap-4">
            <li><button onClick={() => navigate('/')} className="text-body-sm text-text-muted hover:text-teal transition-colors">Home</button></li>
            <li><button onClick={() => navigate('/events')} className="text-body-sm text-text-muted hover:text-teal transition-colors">Browse Events</button></li>
            <li><button className="text-body-sm text-text-muted hover:text-teal transition-colors">How it Works</button></li>
            <li><button className="text-body-sm text-text-muted hover:text-teal transition-colors">Organizer Portal</button></li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-label font-black uppercase tracking-widest text-text-primary mb-8">Categories</h4>
          <ul className="content-stack gap-4">
            <li><button className="text-body-sm text-text-muted hover:text-teal transition-colors">Concerts & Nightlife</button></li>
            <li><button className="text-body-sm text-text-muted hover:text-teal transition-colors">Workshops & Learning</button></li>
            <li><button className="text-body-sm text-text-muted hover:text-teal transition-colors">Conferences & Tech</button></li>
            <li><button className="text-body-sm text-text-muted hover:text-teal transition-colors">Exclusive Partners</button></li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-label font-black uppercase tracking-widest text-text-primary mb-8">Support</h4>
          <ul className="content-stack gap-4">
            <li><button className="text-body-sm text-text-muted hover:text-teal transition-colors">Help Center</button></li>
            <li><button className="text-body-sm text-text-muted hover:text-teal transition-colors">Terms of Service</button></li>
            <li><button className="text-body-sm text-text-muted hover:text-teal transition-colors">Privacy Policy</button></li>
            <li><button className="text-body-sm text-text-muted hover:text-teal transition-colors">Refund Policy</button></li>
          </ul>
        </div>
      </div>
      
      <div className="pt-10 border-t border-bg-border flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-label text-text-muted font-bold">© {new Date().getFullYear()} TicketsHub Egypt. All rights reserved.</p>
        <div className="flex gap-6">
          <button className="text-label text-text-muted hover:text-text-primary transition-colors">EG ENGLISH</button>
          <button className="text-label text-text-muted hover:text-text-primary transition-colors">DEVELOPER API</button>
        </div>
      </div>
    </div>
  </footer>
  );
});
