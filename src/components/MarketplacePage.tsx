import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Calendar, 
  MapPin, 
  Tag, 
  User, 
  AlertCircle,
  TrendingDown,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Button } from './ui/Button';
import { TicketResaleListing } from '../types';
import { formatDateTime } from '../lib/dateFormat';

export const MarketplacePage = () => {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { setIsLoginModalOpen } = useUI();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'newest' | 'soonest_event'>('newest');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  
  // Data state
  const [listings, setListings] = useState<TicketResaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Checkout purchase loading states
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  // Fetch listings from backend
  const fetchListings = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', 'LISTED');
      if (search) queryParams.append('search', search);
      if (category !== 'All') queryParams.append('category', category);
      if (sortBy) queryParams.append('sortBy', sortBy);
      if (priceMin) queryParams.append('priceMin', priceMin);
      if (priceMax) queryParams.append('priceMax', priceMax);

      const res = await fetch(`/api/marketplace/listings?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch marketplace listings');
      
      const data = await res.json();
      setListings(data.listings || []);
      setError(null);
    } catch (err: any) {
      console.error('[MarketplacePage] Error fetching listings:', err);
      setError('Could not retrieve active listings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [category, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
  };

  const handleBuy = async (listing: TicketResaleListing) => {
    if (!accessToken) {
      setIsLoginModalOpen(true);
      return;
    }

    if (user?.id === listing.seller_id) {
      alert("You cannot buy your own listed ticket.");
      return;
    }

    setPurchasingId(listing.public_id);
    try {
      const response = await fetch(`/api/marketplace/listings/${listing.public_id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete checkout reservation');
      }

      // Successfully reserved! Redirect to the secure checkout page
      navigate(`/checkout/${data.order.public_id}`);
    } catch (err: any) {
      console.error('[Marketplace] Purchase checkout error:', err);
      alert(err.message || 'Failed to initiate purchase checkout. Please try again.');
    } finally {
      setPurchasingId(null);
    }
  };

  const categories = ['All', 'Music', 'Tech', 'Comedy', 'Sports', 'Conference', 'Arts'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
      {/* Header section with high-end Display Typography */}
      <div className="content-stack gap-4 max-w-3xl mb-12 lg:mb-16">
        <span className="text-[10px] uppercase font-black tracking-[0.3em] text-teal px-3 py-1 bg-teal/10 rounded-tag border border-teal/20 w-fit">
          TicketsHub Resale Engine
        </span>
        <h1 className="text-display-sm sm:text-display font-black tracking-tight text-text-primary leading-tight uppercase">
          Peer-To-Peer <br className="hidden sm:inline" />
          <span className="text-teal">Ticket Resale</span>
        </h1>
        <p className="text-body-md text-text-muted leading-relaxed">
          The safest way to buy and sell verified tickets. Direct peer-to-peer checkout. 
          When you buy, the seller's original ticket barcode is completely invalidated and a brand new, 
          fully unique ticket is automatically generated for you. 100% security guaranteed.
        </p>
        
        {/* Helper info on how to list your own ticket */}
        <div className="flex gap-3 p-4 bg-bg-elevated/30 border border-bg-border rounded-card-xl items-start mt-2">
          <Info size={18} className="text-teal shrink-0 mt-0.5" />
          <div className="content-stack gap-1">
            <h4 className="text-body-xs font-bold text-text-primary">Want to list your own ticket?</h4>
            <p className="text-label text-text-muted">
              Head over to your <span className="text-teal cursor-pointer hover:underline" onClick={() => navigate('/dashboard')}>User Dashboard</span>. 
              Find any active, valid ticket you own and click <strong>"Sell Ticket"</strong> to list it here in seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search controls Bar */}
      <div className="bg-bg-card rounded-card-2xl border border-bg-border p-6 lg:p-8 mb-10 shadow-2xl">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Search field */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text"
              placeholder="Search by event title, venue, or company name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-elevated/50 border border-bg-border rounded-card-xl pl-12 pr-4 py-4 text-body-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all font-bold"
            />
          </div>

          {/* Sort selection */}
          <div className="relative">
            <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full appearance-none bg-bg-elevated/50 border border-bg-border rounded-card-xl pl-12 pr-8 py-4 text-body-sm text-text-primary font-bold focus:outline-none focus:border-teal transition-all cursor-pointer"
            >
              <option value="newest">Newest Listings</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="soonest_event">Event Date: Soonest</option>
            </select>
          </div>

          {/* Filter Trigger Button */}
          <Button type="submit" variant="accent" className="py-4 rounded-card-xl font-bold flex items-center justify-center gap-2">
            <SlidersHorizontal size={16} /> Apply Search
          </Button>
        </form>

        {/* Category quick filters */}
        <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-none border-t border-bg-border/50 pt-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-5 py-2.5 rounded-tag text-label font-bold uppercase tracking-wider border transition-all shrink-0 ${
                category === cat 
                  ? 'bg-teal/10 text-teal border-teal/30 shadow-card-glow' 
                  : 'bg-bg-elevated/20 text-text-muted border-bg-border hover:border-text-muted/30 hover:text-text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Listing results section */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-bg-card rounded-card-2xl border border-bg-border overflow-hidden animate-pulse h-[450px]">
              <div className="h-48 bg-bg-elevated"></div>
              <div className="p-6 content-stack gap-4">
                <div className="h-6 bg-bg-elevated rounded w-3/4"></div>
                <div className="h-4 bg-bg-elevated rounded w-1/2"></div>
                <div className="h-10 bg-bg-elevated rounded-card mt-6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-10 text-center max-w-md mx-auto content-stack gap-4 bg-status-error/5 border border-status-error/15 rounded-card-2xl">
          <AlertCircle className="text-status-error mx-auto" size={36} />
          <h3 className="text-body-md font-bold text-text-primary">Error</h3>
          <p className="text-body-xs text-text-muted">{error}</p>
          <Button variant="outline" size="sm" className="mx-auto" onClick={fetchListings}>Retry</Button>
        </div>
      ) : listings.length === 0 ? (
        <div className="p-16 text-center max-w-xl mx-auto content-stack gap-6 bg-bg-card border border-bg-border rounded-card-2xl shadow-xl">
          <div className="w-16 h-16 bg-bg-elevated rounded-card flex items-center justify-center mx-auto text-text-muted opacity-40">
            <Tag size={28} />
          </div>
          <div className="content-stack gap-2">
            <h3 className="text-body-md font-bold text-text-primary uppercase tracking-wider">No tickets listed right now</h3>
            <p className="text-body-xs text-text-muted leading-relaxed">
              We couldn't find any tickets matching your search filters. Check back soon or list your own tickets for other buyers!
            </p>
          </div>
          <Button variant="outline" className="mx-auto" onClick={() => { setSearch(''); setCategory('All'); setPriceMin(''); setPriceMax(''); fetchListings(); }}>
            Clear Search Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {listings.map((listing) => {
            const ticket = listing.ticket_instance;
            const event = ticket?.order?.event;
            const ticketTypeName = ticket?.ticket_type?.name || 'General Admission';
            const eventImage = event?.image_url || '/placeholder_event.jpg';
            const originalPrice = listing.original_price;
            const listedPrice = listing.price;
            const discountPercent = originalPrice > listedPrice ? Math.round(((originalPrice - listedPrice) / originalPrice) * 100) : 0;

            return (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-card rounded-card-2xl border border-bg-border overflow-hidden flex flex-col group hover:border-teal/50 hover:shadow-2xl hover:shadow-teal/5 transition-all duration-300"
              >
                {/* Event Cover Image / Category */}
                <div className="relative h-48 bg-bg-elevated overflow-hidden shrink-0">
                  <img 
                    src={eventImage} 
                    alt={event?.title || 'Event Cover'} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=600';
                    }}
                  />
                  
                  {/* Category Pill */}
                  <span className="absolute top-4 left-4 bg-bg-page/80 backdrop-blur-md text-[9px] font-black uppercase tracking-widest text-text-primary px-3 py-1.5 rounded-tag border border-bg-border/30">
                    {event?.category || 'Music'}
                  </span>

                  {/* Discount indicator if cheaper than face value */}
                  {discountPercent > 0 && (
                    <span className="absolute top-4 right-4 bg-status-success text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-tag shadow-lg flex items-center gap-1">
                      <TrendingDown size={12} /> {discountPercent}% OFF FACE VALUE
                    </span>
                  )}
                </div>

                {/* Card Content body */}
                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div className="content-stack gap-4">
                    {/* Event Title */}
                    <div>
                      <h3 className="text-body-sm font-black text-text-primary tracking-tight uppercase leading-snug group-hover:text-teal transition-colors line-clamp-1">
                        {event?.title || 'Unknown Event'}
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal mt-1 flex items-center gap-1.5">
                        <Tag size={12} /> {ticketTypeName}
                      </p>
                    </div>

                    {/* Meta details */}
                    <div className="content-stack gap-2 border-t border-b border-bg-border/60 py-3.5">
                      <div className="flex items-center gap-2.5 text-text-muted">
                        <Calendar size={14} className="text-teal" />
                        <span className="text-label font-bold">
                          {event?.event_date ? formatDateTime(event.event_date) : 'Date TBD'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-text-muted">
                        <MapPin size={14} className="text-teal" />
                        <span className="text-label font-bold line-clamp-1">
                          {event?.venue || 'Venue TBD'}, {event?.location || 'Egypt'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-text-muted">
                        <User size={14} className="text-teal" />
                        <span className="text-label font-bold text-text-primary">
                          Seller: {listing.seller?.name || 'Verified Seller'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action row */}
                  <div className="mt-6 pt-2">
                    <div className="flex items-end justify-between mb-5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-text-muted/60 mb-0.5">Resale Price</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-body-md font-black text-teal leading-none">{listedPrice}</span>
                          <span className="text-[10px] font-black text-text-primary uppercase tracking-wider">EGP</span>
                        </div>
                      </div>
                      
                      {originalPrice && (
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-wider text-text-muted/60 mb-0.5">Face Value</p>
                          <span className="text-label font-bold text-text-muted line-through">{originalPrice} EGP</span>
                        </div>
                      )}
                    </div>

                    {/* Primary Trigger Button */}
                    <Button 
                      onClick={() => handleBuy(listing)}
                      disabled={purchasingId === listing.public_id}
                      variant={user?.id === listing.seller_id ? 'outline' : 'accent'}
                      className="w-full py-4 font-black uppercase tracking-widest text-[10px] rounded-card-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                    >
                      {purchasingId === listing.public_id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Locking Ticket...
                        </>
                      ) : user?.id === listing.seller_id ? (
                        'Your Listing'
                      ) : (
                        <>
                          Buy Ticket <ChevronRight size={14} />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
