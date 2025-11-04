
import React, { useState, useMemo, useEffect } from 'react';
import type { CalendarEvent, ContentType, ContentStatus } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon, TagIcon, CheckCircleIcon, ClockIcon, EyeIcon, TrashIcon } from '../components/Icons';

interface CalendarProps {
    events: CalendarEvent[];
    setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
}

const contentTypes: ContentType[] = ['Post', 'Story', 'Reel', 'Ad'];
const contentStatuses: ContentStatus[] = ['Planned', 'In Progress', 'Needs Review', 'Published'];

const typeColors: { [key in ContentType]: { bg: string; text: string; } } = {
    Post: { bg: 'bg-accent-blue/20', text: 'text-accent-blue' },
    Story: { bg: 'bg-accent-purple/20', text: 'text-accent-purple' },
    Reel: { bg: 'bg-accent-orange/20', text: 'text-accent-orange' },
    Ad: { bg: 'bg-accent-red/20', text: 'text-accent-red' },
};

const statusConfig: { [key in ContentStatus]: { icon: React.FC<{className?: string}>; color: string; } } = {
    'Planned': { icon: TagIcon, color: 'text-text-secondary' },
    'In Progress': { icon: ClockIcon, color: 'text-accent-yellow' },
    'Needs Review': { icon: EyeIcon, color: 'text-accent-orange' },
    'Published': { icon: CheckCircleIcon, color: 'text-accent-green' },
};


interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: Omit<CalendarEvent, 'id' | 'created' | 'updated'> & { id?: number }) => void;
    onDelete: (id: number) => void;
    eventToEdit: CalendarEvent | null;
    selectedDate: string;
}

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, onDelete, eventToEdit, selectedDate }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'Post' as ContentType,
        status: 'Planned' as ContentStatus,
        date: selectedDate,
    });
    
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (eventToEdit) {
            setFormData({
                title: eventToEdit.title,
                description: eventToEdit.description || '',
                type: eventToEdit.type,
                status: eventToEdit.status,
                date: eventToEdit.date,
            });
        } else {
            setFormData({
                title: '',
                description: '',
                type: 'Post' as ContentType,
                status: 'Planned' as ContentStatus,
                date: selectedDate,
            });
        }
    }, [eventToEdit, selectedDate, isOpen]);


    const handleSave = () => {
        if(!formData.title) {
            alert('Title is required.');
            return;
        }
        onSave({ id: eventToEdit?.id, ...formData });
    };
    
    const handleDelete = () => {
        if(eventToEdit && window.confirm('Are you sure you want to delete this event?')) {
            onDelete(eventToEdit.id);
        }
    }

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-lg rounded-2xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border-color flex justify-between items-center">
                    <h2 className="text-xl font-semibold">{eventToEdit ? 'Edit Event' : 'Add New Event'}</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-hover-bg transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
                        <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                        <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
                            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as ContentType})} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue">
                                {contentTypes.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ContentStatus})} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue">
                                {contentStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-bg-tertiary/50 border-t border-border-color flex justify-between items-center gap-4 rounded-b-2xl">
                    <div>
                         {eventToEdit && (
                            <button onClick={handleDelete} className="px-4 py-2 rounded-lg font-medium text-sm bg-accent-red/20 text-accent-red hover:bg-accent-red/30 transition-colors flex items-center gap-2">
                                <TrashIcon className="w-5 h-5"/> Delete
                            </button>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-bg-secondary hover:bg-hover-bg transition">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 rounded-lg font-semibold bg-accent-blue text-white hover:bg-opacity-80 transition">Save Event</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const Calendar: React.FC<CalendarProps> = ({ events, setEvents }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const changeMonth = (direction: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + direction);
            return newDate;
        });
    };
    
    const goToToday = () => setCurrentDate(new Date());

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const eventsByDate = useMemo(() => {
        return events.reduce((acc, event) => {
            (acc[event.date] = acc[event.date] || []).push(event);
            return acc;
        }, {} as { [key: string]: CalendarEvent[] });
    }, [events]);

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        
        const days = [];
        // Fill empty cells before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="border-r border-b border-border-color bg-bg-primary rounded-lg"></div>);
        }
        
        // Fill days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const dayEvents = eventsByDate[dateKey] || [];

            days.push(
                <div key={day} onClick={() => handleDayClick(dateKey)} className={`border-r border-b border-border-color bg-bg-secondary p-2 min-h-[120px] flex flex-col hover:bg-hover-bg/50 transition-colors cursor-pointer relative rounded-lg`}>
                    <span className={`font-medium text-sm mb-2 self-start flex items-center justify-center ${isToday ? 'bg-accent-blue text-white rounded-full w-7 h-7' : 'text-text-secondary w-7 h-7'}`}>{day}</span>
                    <div className="flex-1 space-y-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map((event) => {
                            const StatusIcon = statusConfig[event.status].icon;
                            const statusColor = statusConfig[event.status].color;
                            const typeColor = typeColors[event.type];

                            return (
                                <div key={event.id} onClick={(e) => {e.stopPropagation(); handleEventClick(event)}} className={`p-1.5 rounded-md text-xs truncate leading-tight transition-transform hover:scale-105 ${typeColor.bg}`}>
                                    <div className="flex items-center gap-1.5">
                                         <StatusIcon className={`w-3.5 h-3.5 flex-shrink-0 ${statusColor}`} />
                                        <span className={`font-medium ${typeColor.text}`}>{event.title}</span>
                                    </div>
                                </div>
                            )
                        })}
                        {dayEvents.length > 2 && (
                             <div className="text-xs text-text-secondary font-medium pt-1">+{dayEvents.length - 2} more</div>
                        )}
                    </div>
                </div>
            );
        }
        return days;
    }, [currentDate, eventsByDate]);

    const handleDayClick = (dateKey: string) => {
        setSelectedDate(dateKey);
        setEventToEdit(null);
        setIsModalOpen(true);
    };

    const handleEventClick = (event: CalendarEvent) => {
        setSelectedDate(event.date);
        setEventToEdit(event);
        setIsModalOpen(true);
    };

    const handleSaveEvent = (eventData: Omit<CalendarEvent, 'id' | 'created' | 'updated'> & { id?: number }) => {
        if (eventData.id) { // Editing existing event
            setEvents(events.map(e => e.id === eventData.id ? { ...e, ...eventData, id: e.id, updated: new Date().toISOString() } : e));
        } else { // Creating new event
            const newEvent: CalendarEvent = {
                id: Date.now(),
                title: eventData.title,
                description: eventData.description,
                date: eventData.date,
                type: eventData.type,
                status: eventData.status,
                created: new Date().toISOString(),
            };
            setEvents([...events, newEvent]);
        }
        setIsModalOpen(false);
    };

    const handleDeleteEvent = (id: number) => {
        setEvents(events.filter(e => e.id !== id));
        setIsModalOpen(false);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-semibold">Content Calendar</h2>
                    <p className="text-text-secondary mt-1">Plan and schedule your social media content.</p>
                </div>
                <button onClick={() => handleDayClick(new Date().toISOString().split('T')[0])} className="bg-accent-blue text-white px-4 py-2 rounded-lg font-medium text-sm shadow-md hover:bg-opacity-80 transition flex items-center gap-2">
                    <PlusIcon className="w-5 h-5"/>
                    Add Event
                </button>
            </div>
            <div className="bg-bg-secondary p-4 sm:p-6 rounded-2xl border border-border-color">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-2">
                         <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-hover-bg transition"><ChevronLeftIcon className="w-6 h-6" /></button>
                         <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-hover-bg transition"><ChevronRightIcon className="w-6 h-6" /></button>
                         <h3 className="text-xl font-semibold ml-2">{monthName}</h3>
                    </div>
                    <button onClick={goToToday} className="px-4 py-2 text-sm font-medium rounded-lg bg-bg-tertiary text-text-primary hover:bg-hover-bg transition">
                        Today
                    </button>
                </div>
                <div className="grid grid-cols-7 border-t border-l border-border-color bg-border-color gap-px">
                     {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                        <div key={day} className="p-3 text-center text-sm font-semibold text-text-secondary bg-bg-tertiary/60">{day}</div>
                    ))}
                    {calendarGrid}
                </div>
            </div>
            <EventModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEvent}
                onDelete={handleDeleteEvent}
                eventToEdit={eventToEdit}
                selectedDate={selectedDate}
            />
        </div>
    );
};

export default Calendar;