import React from 'react';
import { 
  Filter, 
  Search, 
  ChevronRight
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 space-y-8">
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Filter size={18} className="text-accent" /> Filters
            </h3>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                  <input 
                    type="text" 
                    placeholder="Event name..." 
                    className="w-full bg-secondary-bg border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-accent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-text-secondary">Price Range</label>
                  <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded-lg">Up to {maxPrice.toLocaleString()} EGP</span>
                </div>
                <div className="relative pt-2 pb-6">
                  <input 
                    type="range" 
                    min="0" 
                    max="50000" 
                    step="500"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent" 
                  />
                  <div className="flex justify-between text-[10px] text-text-secondary mt-2 font-bold uppercase tracking-wider">
                    <span>0 EGP</span>
                    <span>50,000+ EGP</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">Location</label>
                <select 
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full bg-secondary-bg border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-accent text-sm"
                >
                  <option value="All">All Locations</option>
                  {['Cairo', 'North Coast', 'Alexandria', 'Sharm El Sheikh', 'Giza', 'Dahab', 'Hurghada'].map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={() => { setSearchQuery(''); setSelectedLocation('All'); setMaxPrice(50000); }}>Reset Filters</Button>
        </aside>

        {/* Main Grid */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">{filteredEvents.length} Events Found</h2>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>Sort by:</span>
              <select className="bg-transparent font-bold text-white focus:outline-none">
                <option>Newest</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
              </select>
            </div>
          </div>

          {loadingEvents ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-text-secondary">Loading events...</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map(event => (
                <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-secondary-bg rounded-3xl border border-dashed border-white/10">
              <Search size={48} className="mx-auto text-text-secondary mb-4 opacity-20" />
              <h3 className="text-xl font-bold mb-2">No events found</h3>
              <p className="text-text-secondary">Try adjusting your filters or search query.</p>
            </div>
          )}

          {/* Pagination */}
          <div className="mt-12 flex justify-center gap-2">
            {[1, 2, 3].map(p => (
              <button key={p} className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all ${p === 1 ? 'bg-accent text-white' : 'bg-secondary-bg text-text-secondary hover:bg-white/10'}`}>
                {p}
              </button>
            ))}
            <button className="w-10 h-10 rounded-xl bg-secondary-bg text-text-secondary flex items-center justify-center hover:bg-white/10">
              <ChevronRight size={18} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};
