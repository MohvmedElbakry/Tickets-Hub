
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Event, TicketType } from '../../types';
import { Button } from '../ui/Button';
import { eventService } from '../../services/eventService';
import { useEvents } from '../../context/EventsContext';
import { useUI } from '../../context/UIContext';

export const AdminEventModal: React.FC = () => {
  const { 
    isEventModalOpen: isOpen, 
    setIsEventModalOpen, 
    editingEvent, 
    setEditingEvent 
  } = useUI();
  
  const onClose = () => setIsEventModalOpen(false);
  
  const { events, setEvents } = useEvents();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    venue: '',
    date: '',
    time: '',
    imageUrl: '',
    companyName: '',
    rules: '',
    googleMapsUrl: '',
    status: 'draft' as const,
    qr_enabled_manual: false,
    government: 'Cairo',
    require_approval: false,
    is_featured: false,
    featured_order: 0,
    ticketTypes: [] as any[]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        setError('Image size must be less than 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField('imageUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (editingEvent) {
        setFormData({
          title: editingEvent.title || '',
          description: editingEvent.description || '',
          location: editingEvent.location || '',
          venue: editingEvent.venue || '',
          date: editingEvent.event_date || editingEvent.date || '',
          time: editingEvent.event_time || editingEvent.time || '',
          imageUrl: editingEvent.image_url || editingEvent.image || '',
          companyName: editingEvent.company_name || '',
          rules: editingEvent.rules || '',
          googleMapsUrl: editingEvent.google_maps_url || '',
          status: editingEvent.status || 'draft',
          qr_enabled_manual: editingEvent.qr_enabled_manual || false,
          government: editingEvent.government || 'Cairo',
          require_approval: editingEvent.require_approval || false,
          is_featured: editingEvent.is_featured || false,
          featured_order: editingEvent.featured_order || 0,
          ticketTypes: editingEvent.ticket_types || []
        });
      } else {
        setFormData({
          title: '',
          description: '',
          location: '',
          venue: '',
          date: '',
          time: '',
          imageUrl: '',
          companyName: '',
          rules: '',
          googleMapsUrl: '',
          status: 'draft',
          qr_enabled_manual: false,
          government: 'Cairo',
          require_approval: false,
          is_featured: false,
          featured_order: 0,
          ticketTypes: [{ 
            name: 'General Admission', 
            description: 'Standard entry', 
            price: 0, 
            quantity_total: 100, 
            quantity_sold: 0,
            sale_start: new Date().toISOString().split('T')[0],
            sale_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }]
        });
      }
    }
  }, [isOpen, editingEvent]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTicketType = () => {
    updateField('ticketTypes', [...formData.ticketTypes, { 
      name: '', 
      description: '', 
      price: 0, 
      quantity_total: 0, 
      quantity_sold: 0,
      sale_start: new Date().toISOString().split('T')[0],
      sale_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }]);
  };

  const handleRemoveTicketType = (index: number) => {
    updateField('ticketTypes', formData.ticketTypes.filter((_: any, i: number) => i !== index));
  };

  const handleTicketTypeChange = (index: number, field: keyof TicketType, value: any) => {
    const newTicketTypes = [...formData.ticketTypes];
    newTicketTypes[index] = { ...newTicketTypes[index], [field]: value };
    updateField('ticketTypes', newTicketTypes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const eventData = {
      title: formData.title,
      description: formData.description,
      location: formData.location,
      venue: formData.venue,
      event_date: formData.date,
      event_time: formData.time,
      image_url: formData.imageUrl,
      company_name: formData.companyName,
      rules: formData.rules,
      google_maps_url: formData.googleMapsUrl,
      status: formData.status,
      qr_enabled_manual: formData.qr_enabled_manual,
      government: formData.government,
      require_approval: formData.require_approval,
      is_featured: formData.is_featured,
      featured_order: formData.featured_order,
      ticket_types: formData.ticketTypes
    };

    try {
      const data = editingEvent 
        ? await eventService.adminUpdateEvent(editingEvent.id!, eventData)
        : await eventService.adminCreateEvent(eventData);

      if (data) {
        if (editingEvent) {
          setEvents(events.map(e => e.id === editingEvent.id ? data : e));
        } else {
          setEvents([data, ...events]);
        }
        onClose();
        setEditingEvent(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { onClose(); setEditingEvent(null); }}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-bg-card/80 backdrop-blur-xl rounded-3xl p-8 border border-bg-border shadow-2xl"
          >
            <button onClick={() => { onClose(); setEditingEvent(null); }} className="absolute top-6 right-6 text-text-muted hover:text-text-primary transition-colors"><X size={24} /></button>
            <h2 className="text-h1 mb-6">{editingEvent ? 'Edit' : 'Create'} <span className="text-teal">Event</span></h2>
            
            {error && <div className="bg-status-error/10 border border-status-error/20 text-status-error p-4 rounded-xl mb-6 text-body-sm">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-h3 border-b border-bg-border pb-2">Basic Info</h3>
                  <div>
                    <label className="block text-body-sm font-medium mb-1 text-text-muted">Event Title</label>
                    <input type="text" value={formData.title} onChange={e => updateField('title', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50" required />
                  </div>
                  <div>
                    <label className="block text-body-sm font-medium mb-1 text-text-muted">Description</label>
                    <textarea value={formData.description} onChange={e => updateField('description', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50 h-32" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-body-sm font-medium mb-1 text-text-muted">Date</label>
                      <input type="date" value={formData.date} onChange={e => updateField('date', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary" required />
                    </div>
                    <div>
                      <label className="block text-body-sm font-medium mb-1 text-text-muted">Time</label>
                      <input type="time" value={formData.time} onChange={e => updateField('time', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary" required />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-h3 border-b border-bg-border pb-2">Location & Media</h3>
                  <div>
                    <label className="block text-body-sm font-medium mb-1 text-text-muted">Government (Location Category)</label>
                    <select 
                      value={formData.government} 
                      onChange={e => updateField('government', e.target.value)} 
                      className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary"
                    >
                      <option value="Cairo">Cairo</option>
                      <option value="Giza">Giza</option>
                      <option value="Alexandria">Alexandria</option>
                      <option value="North Coast">North Coast</option>
                      <option value="Sharm El-Sheikh">Sharm El-Sheikh</option>
                      <option value="Dahab">Dahab</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-body-sm font-medium mb-1 text-text-muted">City/Location</label>
                    <input type="text" value={formData.location} onChange={e => updateField('location', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50" placeholder="e.g. Cairo, Egypt" />
                  </div>
                  <div>
                    <label className="block text-body-sm font-medium mb-1 text-text-muted">Venue Name</label>
                    <input type="text" value={formData.venue} onChange={e => updateField('venue', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50" placeholder="e.g. Cairo International Stadium" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-body-sm font-medium text-text-muted">Event Image</label>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setImageMode('url')}
                          className={`text-label px-2 py-1 rounded-md font-bold uppercase tracking-wider transition-colors ${imageMode === 'url' ? 'bg-teal text-onteal' : 'bg-bg-elevated text-text-muted'}`}
                        >
                          URL
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setImageMode('upload')}
                          className={`text-label px-2 py-1 rounded-md font-bold uppercase tracking-wider transition-colors ${imageMode === 'upload' ? 'bg-teal text-onteal' : 'bg-bg-elevated text-text-muted'}`}
                        >
                          Upload
                        </button>
                      </div>
                    </div>
                    {imageMode === 'url' ? (
                      <input 
                        type="url" 
                        value={formData.imageUrl} 
                        onChange={e => updateField('imageUrl', e.target.value)} 
                        className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50" 
                        placeholder="https://..." 
                      />
                    ) : (
                      <div className="space-y-2">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange} 
                          className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-label file:font-semibold file:bg-teal/10 file:text-teal hover:file:bg-teal/20 text-text-primary" 
                        />
                        {formData.imageUrl && (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-bg-border">
                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              type="button" 
                              onClick={() => updateField('imageUrl', '')}
                              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-text-primary hover:bg-black/70 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-body-sm font-medium mb-1 text-text-muted">Company Name</label>
                    <input type="text" value={formData.companyName} onChange={e => updateField('companyName', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50" placeholder="Organizer Company Name" />
                  </div>
                  <div>
                    <label className="block text-body-sm font-medium mb-1 text-text-muted">Rules of Event</label>
                    <textarea value={formData.rules} onChange={e => updateField('rules', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50 h-24" placeholder="Enter event rules..." />
                  </div>
                  <div>
                    <label className="block text-body-sm font-medium mb-1 text-text-muted">Google Maps URL</label>
                    <input type="url" value={formData.googleMapsUrl} onChange={e => updateField('googleMapsUrl', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50" placeholder="https://maps.google.com/..." />
                  </div>
                  <div>
                    <label className="block text-body-sm font-medium mb-1 text-text-muted">Status</label>
                    <select value={formData.status} onChange={e => updateField('status', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-xl px-4 py-3 focus:border-teal outline-none text-text-primary">
                      <option value="draft">Draft</option>
                      <option value="published">Published (Legacy)</option>
                      <option value="upcoming">Upcoming (Pre-Registration)</option>
                      <option value="live">Live (Tickets Available)</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-4 pt-2">
                    <div className="space-y-4 bg-bg-elevated/50 p-4 rounded-xl border border-bg-border">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="is_featured" 
                          checked={formData.is_featured} 
                          onChange={e => updateField('is_featured', e.target.checked)} 
                          className="w-5 h-5 accent-teal"
                        />
                        <label htmlFor="is_featured" className="text-body-sm font-medium cursor-pointer text-text-primary">
                          Feature this event
                          <p className="text-body-xs text-text-muted font-normal">If enabled, this event will appear in the home page hero carousel.</p>
                        </label>
                      </div>
                      
                      {formData.is_featured && (
                        <div className="pl-8 pt-2">
                          <label className="block text-label text-text-muted mb-1">Feature Order (Lower = First)</label>
                          <input 
                            type="number" 
                            value={formData.featured_order} 
                            onChange={e => updateField('featured_order', parseInt(e.target.value) || 0)} 
                            className="w-24 bg-bg-page border border-bg-border rounded-lg px-3 py-1.5 text-body-sm focus:border-teal outline-none text-text-primary"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 bg-bg-elevated/50 p-4 rounded-xl border border-bg-border">
                      <input 
                        type="checkbox" 
                        id="require_approval"
                        checked={formData.require_approval} 
                        onChange={e => updateField('require_approval', e.target.checked)} 
                        className="w-5 h-5 accent-teal"
                      />
                      <label htmlFor="require_approval" className="text-body-sm font-medium cursor-pointer text-text-primary">
                        Require Admin Approval for Bookings
                        <p className="text-body-xs text-text-muted font-normal">If enabled, users must wait for approval before paying.</p>
                      </label>
                    </div>
                    <div className="flex items-center gap-3 bg-bg-elevated/50 p-4 rounded-xl border border-bg-border">
                      <input 
                        type="checkbox" 
                        id="qr_enabled_manual" 
                        checked={formData.qr_enabled_manual} 
                        onChange={e => updateField('qr_enabled_manual', e.target.checked)}
                        className="w-5 h-5 accent-teal"
                      />
                      <label htmlFor="qr_enabled_manual" className="text-body-sm font-medium cursor-pointer text-text-primary">
                        Enable QR Codes Manually (Override)
                        <p className="text-body-xs text-text-muted font-normal">If enabled, QR codes will be visible to users even before the 1-hour window.</p>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-bg-border pb-2">
                  <h3 className="text-h3">Ticket Types</h3>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTicketType} className="py-1 px-3 text-body-sm"><Plus size={16} /> Add Type</Button>
                </div>
                
                <div className="space-y-4">
                  {formData.ticketTypes.map((tt: any, index: number) => (
                    <div key={index} className="bg-bg-page/50 p-4 rounded-2xl border border-bg-border space-y-4">
                      <div className="flex justify-between gap-4">
                        <div className="flex-1">
                          <label className="block text-label text-text-muted mb-1">Name</label>
                          <input type="text" value={tt.name} onChange={e => handleTicketTypeChange(index, 'name', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-lg px-3 py-2 text-body-sm focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50" placeholder="e.g. VIP" required />
                        </div>
                        <div className="flex-1">
                          <label className="block text-label text-text-muted mb-1">Price (EGP)</label>
                          <input type="number" value={tt.price} onChange={e => handleTicketTypeChange(index, 'price', e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-full bg-bg-page border border-bg-border rounded-lg px-3 py-2 text-body-sm focus:border-teal outline-none text-text-primary" required />
                        </div>
                        <div className="flex-1">
                          <label className="block text-label text-text-muted mb-1">Total Quantity</label>
                          <input type="number" value={tt.quantity_total} onChange={e => handleTicketTypeChange(index, 'quantity_total', e.target.value === '' ? 0 : parseInt(e.target.value))} className="w-full bg-bg-page border border-bg-border rounded-lg px-3 py-2 text-body-sm focus:border-teal outline-none text-text-primary" required />
                        </div>
                        <button type="button" onClick={() => handleRemoveTicketType(index)} className="mt-6 p-2 text-status-error hover:bg-status-error/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-label text-text-muted mb-1">Sale Start</label>
                          <input type="date" value={tt.sale_start} onChange={e => handleTicketTypeChange(index, 'sale_start', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-lg px-3 py-2 text-body-sm focus:border-teal outline-none text-text-primary" required />
                        </div>
                        <div>
                          <label className="block text-label text-text-muted mb-1">Sale End</label>
                          <input type="date" value={tt.sale_end} onChange={e => handleTicketTypeChange(index, 'sale_end', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-lg px-3 py-2 text-body-sm focus:border-teal outline-none text-text-primary" required />
                        </div>
                      </div>
                      <div>
                        <label className="block text-label text-text-muted mb-1">Description</label>
                        <input type="text" value={tt.description} onChange={e => handleTicketTypeChange(index, 'description', e.target.value)} className="w-full bg-bg-page border border-bg-border rounded-lg px-3 py-2 text-body-sm focus:border-teal outline-none text-text-primary placeholder:text-text-muted/50" placeholder="Ticket type description..." />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button variant="accent" type="submit" className="w-full py-4 text-body-base" disabled={loading}>
                {loading ? 'Saving Event...' : (editingEvent ? 'Update Event' : 'Create Event')}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
