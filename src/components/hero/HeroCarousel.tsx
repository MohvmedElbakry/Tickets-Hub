import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../lib/dateFormat';
import { formatEventTime } from '../../lib/utils';

import { useEvents } from '../../context/EventsContext';

type Slide = {
  id?: string | number;
  title: string;
  date: string;
  time: string;
  venue: string;
  price: number;
  image: string;
  category: string;
};

const AUTO_SLIDE_DURATION = 5000;

export const HeroCarousel: React.FC = () => {
  const { events, loading: eventsLoading } = useEvents();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  
  const touchStartX = useRef<number | null>(null);

  // Derive slides from live events
  const slides = React.useMemo(() => {
    // 1. Get filtered and sorted candidates
    const featured = events
      .filter(e => e.is_featured)
      .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));
    
    const upcoming = events
      .filter(e => !e.is_featured && e.status !== 'closed' && e.status !== 'draft')
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

    // 2. Combine with priority to featured
    let candidates = [...featured, ...upcoming].slice(0, 5);

    // 3. Absolute fallback if absolutely empty
    if (candidates.length === 0 && !eventsLoading) {
      return [
        {
          id: 'fallback-1',
          title: "The Hub Experience",
          category: "HUB",
          venue: "Cairo Citadel",
          date: "Upcoming",
          time: "20:00",
          price: 0,
          image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=2000'
        }
      ];
    }

    if (candidates.length === 0) return [];

    return candidates.map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      venue: e.location,
      date: e.event_date,
      time: e.event_time,
      price: e.price,
      image: e.image_url,
    }));
  }, [events, eventsLoading]);

  // Restart index if slides change and current index becomes invalid
  useEffect(() => {
    if (slides.length > 0 && currentIndex >= slides.length) {
      setCurrentIndex(0);
      setProgress(0);
    }
  }, [slides.length, currentIndex]);

  const nextSlide = useCallback(() => {
    if (slides.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setProgress(0);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    if (slides.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
  }, [slides.length]);

  // Robust timer/progress management
  useEffect(() => {
    if (slides.length <= 1) {
      setProgress(0);
      return;
    }

    let frameId: number;
    let startTime: number | null = null;
    
    // We use a small timeout to let the fade animation breathe before starting progress
    const timer = setTimeout(() => {
      const animate = (time: number) => {
        if (!startTime) startTime = time;
        const elapsed = time - startTime;
        const progressValue = Math.min((elapsed / AUTO_SLIDE_DURATION) * 100, 100);
        
        setProgress(progressValue);

        if (progressValue < 100) {
          frameId = requestAnimationFrame(animate);
        } else {
          nextSlide();
        }
      };
      frameId = requestAnimationFrame(animate);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [currentIndex, nextSlide, slides.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    touchStartX.current = null;
  };

  const currentSlide = slides[currentIndex] || slides[0];

  if (eventsLoading && events.length === 0) {
    return (
      <div className="relative w-full h-[100svh] min-h-[600px] overflow-hidden bg-bg-page flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-[100svh] min-h-[600px] overflow-hidden bg-bg-page"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide Counter */}
      <div className="absolute top-24 left-6 z-30 pointer-events-none">
        <p className="text-label text-text-muted font-black tracking-[0.2em] opacity-80">
          {(currentIndex + 1).toString().padStart(2, '0')} / {slides.length.toString().padStart(2, '0')}
        </p>
      </div>

      {/* Slides Layer */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div 
            key={slide.id || index}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${
              index === currentIndex ? 'opacity-100 z-0' : 'opacity-0 -z-10'
            }`}
          >
            <img 
              src={slide.image} 
              alt={slide.title} 
              className={`w-full h-full object-cover ${index === currentIndex ? 'animate-[kenBurns_7s_linear_forwards]' : ''}`}
            />
          </div>
        ))}
      </div>

      {/* Overlays */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(6,7,9,0.35) 0%, rgba(6,7,9,0.05) 35%, rgba(6,7,9,0.92) 100%)'
        }}
      />
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 75% 15%, rgba(0,196,160,0.13), transparent 55%)'
        }}
      />

      {/* Content Block */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-8 sm:p-12 lg:p-16">
        <div className="max-w-7xl mx-auto content-stack gap-6">
          <div key={`${currentIndex}-${currentSlide?.id}`} className="animate-[fadeUp_0.6s_ease_both] content-stack gap-4">
            <div className="inline-flex items-center gap-2 bg-teal text-bg-page rounded-pill px-4 py-1 self-start">
              <span className="w-1.5 h-1.5 bg-bg-page rounded-full"></span>
              <span className="text-label font-black tracking-widest uppercase">{currentSlide?.category}</span>
            </div>

            <h1 className="text-hero text-text-primary leading-tight drop-shadow-[0_2px_30px_rgba(0,0,0,0.6)] max-w-4xl">
              {currentSlide?.title}
            </h1>

            <div className="flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-2 text-body-sm text-text-primary">
                <Calendar size={16} className="text-teal" />
                <span>{formatDate(currentSlide?.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-body-sm text-text-primary">
                <Clock size={16} className="text-teal" />
                <span>{formatEventTime(currentSlide?.date, currentSlide?.time)}</span>
              </div>
              <div className="flex items-center gap-2 text-body-sm text-text-primary">
                <MapPin size={16} className="text-teal" />
                <span>{currentSlide?.venue}</span>
              </div>
              {currentSlide?.price > 0 && (
                <div className="flex items-center gap-2 text-body-sm font-bold text-teal">
                  <span>From {currentSlide.price} EGP</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="primary" size="lg" onClick={() => currentSlide?.id && navigate(`/events/${currentSlide.id}`)} className="group">
                Get Tickets <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="secondary" onClick={() => currentSlide?.id && navigate(`/events/${currentSlide.id}`)}>
                View Details
              </Button>
            </div>
          </div>

          {/* Progress Dots */}
          <div className="flex gap-3 mt-8">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setProgress(0);
                }}
                className={`relative h-[3px] rounded-full overflow-hidden ${
                  index === currentIndex ? 'w-16 bg-white/10' : 'w-4 bg-white/20 hover:bg-white/40 transition-all duration-300'
                }`}
              >
                {index === currentIndex && (
                  <div 
                    className="absolute left-0 top-0 h-full bg-teal"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
