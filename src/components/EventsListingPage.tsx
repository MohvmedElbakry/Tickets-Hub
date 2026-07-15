import React from 'react';
import { 
  Filter, 
  Search, 
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from './ui/Button';
import { EventCard } from './EventCard';
import { useEvents } from '../context/EventsContext';
import { useUI } from '../context/UIContext';

export const EventsListingPage = () => {
  const { handleEventClick } = useUI();
  const { 
    filteredEvents, 
    loading: loadingEvents, 
    searchQuery, 
    setSearchQuery, 
    selectedLocation, 
    setSelectedLocation, 
    maxPrice, 
    setMaxPrice 
  } = useEvents();
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-72">
          <div className="bg-bg-card border border-bg-border rounded-card-lg p-6 sticky top-24 content-stack gap-8">
            <div>
              <h3 className="text-h4 mb-6 flex items-center gap-2">
                <Filter size={18} className="text-teal" /> Filters
              </h3>
              <div className="content-stack gap-6">
                <div className="content-stack gap-2">
                  <label className="text-label text-text-muted">Search</label>
                  <div className="relative group/search">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within/search:text-teal" size={16} />
                    <input 
                      type="text" 
                      placeholder="Event name..." 
                      className="w-full bg-bg-page border border-bg-border rounded-input py-2.5 pl-10 pr-4 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 text-text-primary text-body-sm transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="content-stack gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-label text-text-muted">Price Range</label>
                    <span className="text-body-xs font-bold text-teal">Up to {maxPrice.toLocaleString()} EGP</span>
                  </div>
                  <div className="relative pt-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="50000" 
                      step="500"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-bg-elevated rounded-pill appearance-none cursor-pointer accent-teal" 
                    />
                    <div className="flex justify-between text-label text-text-muted mt-3">
                      <span>0 EGP</span>
                      <span>50k+ EGP</span>
                    </div>
                  </div>
                </div>

                <div className="content-stack gap-2">
                  <label className="text-label text-text-muted">Location</label>
                  <select 
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full bg-bg-page border border-bg-border rounded-input py-2.5 px-4 focus:outline-none focus:border-teal text-body-sm text-text-primary transition-colors appearance-none"
                  >
                    <option value="All" className="bg-bg-card">All Locations</option>
                    {['Cairo', 'North Coast', 'Alexandria', 'Sharm El Sheikh', 'Giza', 'Dahab', 'Hurghada'].map(loc => (
                      <option key={loc} value={loc} className="bg-bg-card">{loc}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-bg-border flex flex-col gap-3">
              <Button variant="outline" size="sm" className="w-full" onClick={() => { setSearchQuery(''); setSelectedLocation('All'); setMaxPrice(50000); }}>Reset Filters</Button>
            </div>
          </div>
        </aside>

        {/* Main Grid */}
        <main className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <h2 className="text-h3">{filteredEvents.length} <span className="text-teal font-sans">Events</span> Found</h2>
            <div className="flex items-center gap-3 text-body-sm text-text-muted">
              <span className="text-label">Sort by:</span>
              <select className="bg-transparent font-bold text-text-primary focus:outline-none cursor-pointer">
                <option className="bg-bg-card text-text-primary">Newest</option>
                <option className="bg-bg-card text-text-primary">Price: Low to High</option>
                <option className="bg-bg-card text-text-primary">Price: High to Low</option>
              </select>
            </div>
          </div>

          {loadingEvents ? (
            <div className="flex flex-col items-center justify-center py-32 bg-bg-card rounded-card border border-bg-border animate-pulse">
              <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-text-muted font-black tracking-widest uppercase text-[10px]">Loading Events...</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map(event => (
                <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-bg-card rounded-card-2xl border-2 border-dashed border-bg-border content-stack gap-8">
              <div className="relative mx-auto">
                <div className="w-24 h-24 bg-bg-elevated rounded-card flex items-center justify-center text-text-muted/20">
                  <Search size={48} />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-status-error/10 text-status-error rounded-card flex items-center justify-center border border-status-error/20">
                  <X size={20} />
                </div>
              </div>
              <div className="content-stack gap-3">
                <h3 className="text-h2">No Matches Found</h3>
                <p className="text-body-base text-text-muted max-w-sm mx-auto leading-relaxed">
                  We couldn't find any events matching "<span className="text-text-primary font-bold">{searchQuery}</span>". 
                  Try broadening your search or resetting the filters.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button variant="accent" className="px-8 py-4" onClick={() => { setSearchQuery(''); setSelectedLocation('All'); setMaxPrice(50000); }}>
                  Show All Events
                </Button>
                <Button variant="outline" className="px-8 py-4 border-bg-border" onClick={() => setSearchQuery('')}>
                  Clear Keyword
                </Button>
              </div>
            </div>
          )}

          {/* Pagination */}
          {filteredEvents.length > 0 && (
            <div className="mt-16 flex justify-center items-center gap-3">
              {[1, 2, 3].map(p => (
                <button 
                  key={p} 
                  className={`w-10 h-10 rounded-pill flex items-center justify-center text-label font-bold transition-all duration-base active:scale-90 ${
                    p === 1 
                      ? 'bg-teal text-onteal shadow-card-glow' 
                      : 'bg-bg-card text-text-muted border border-bg-border hover:bg-bg-elevated hover:text-text-primary hover:border-teal/30'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button className="w-10 h-10 rounded-pill bg-bg-card text-text-muted border border-bg-border flex items-center justify-center hover:bg-bg-elevated hover:text-text-primary hover:border-teal/30 transition-all duration-base active:scale-90">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
