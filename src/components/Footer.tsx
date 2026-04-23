import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ticket, 
  Facebook, 
  Twitter, 
  Instagram, 
  Mail 
} from 'lucide-react';

export const Footer = React.memo(() => {
  const navigate = useNavigate();
  return (
  <footer className="bg-secondary-bg border-t border-white/5 pt-20 pb-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        <div className="space-y-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <Ticket className="text-white" size={24} />
            </div>
            <span className="text-2xl font-display font-bold tracking-tight">TicketsHub</span>
          </div>
          <p className="text-text-secondary leading-relaxed">
            The most trusted platform for event discovery and secure ticket booking in Egypt.
          </p>
          <div className="flex gap-4">
            {[Facebook, Twitter, Instagram, Mail].map((Icon, i) => (
              <button key={i} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-text-secondary hover:bg-accent hover:text-white transition-all duration-300">
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-bold mb-6">Quick Links</h4>
          <ul className="space-y-4 text-text-secondary">
            <li><button onClick={() => navigate('/')} className="hover:text-accent transition-colors">Home</button></li>
            <li><button onClick={() => navigate('/events')} className="hover:text-accent transition-colors">Browse Events</button></li>
            <li><button className="hover:text-accent transition-colors">How it Works</button></li>
            <li><button className="hover:text-accent transition-colors">Organizer Portal</button></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold mb-6">Categories</h4>
          <ul className="space-y-4 text-text-secondary">
            <li><button className="hover:text-accent transition-colors">Concerts</button></li>
            <li><button className="hover:text-accent transition-colors">Workshops</button></li>
            <li><button className="hover:text-accent transition-colors">Conferences</button></li>
            <li><button className="hover:text-accent transition-colors">Contact</button></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold mb-6">Support</h4>
          <ul className="space-y-4 text-text-secondary">
            <li><button className="hover:text-accent transition-colors">Help Center</button></li>
            <li><button className="hover:text-accent transition-colors">Terms of Service</button></li>
            <li><button className="hover:text-accent transition-colors">Privacy Policy</button></li>
            <li><button className="hover:text-accent transition-colors">Refund Policy</button></li>
          </ul>
        </div>
      </div>
      
      <div className="pt-8 border-t border-white/5 text-center text-text-secondary text-sm">
        <p>© {new Date().getFullYear()} TicketsHub Egypt. All rights reserved.</p>
      </div>
    </div>
  </footer>
  );
});
