/**
 * CalendarPage - calendar view for events
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { Plus, User, Settings, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { eventsAPI } from '../services/objectsAPI';
import { townsquareAPI } from '../services/townsquareAPI';
import { useObjectsStore } from '../stores/useObjectsStore';
import { useViewConfigStore } from '../stores/useViewConfigStore';
import EventCard from '../components/objects/EventCard';
import FloatingMenu from '../components/common/FloatingMenu';
import ConfigModal from '../components/common/ConfigModal';
import toast from 'react-hot-toast';

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
  });
  const { events, setEvents, addEvent, deleteEvent } = useObjectsStore();
  const {
    viewConfigs,
    getBackgroundStyle,
    setBackgroundColor,
    uploadBackgroundImage,
    resetViewConfig,
    hasUserOverride,
    loadAll,
  } = useViewConfigStore();
  const backgroundStyle = getBackgroundStyle('calendar');
  const navigate = useNavigate();

  useEffect(() => {
    loadAll();
    loadEvents();
  }, [loadAll]);

  const loadEvents = async () => {
    try {
      const response = await eventsAPI.list();
      setEvents(response.data);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventForm.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!eventForm.startDate) {
      toast.error('Please enter a start date');
      return;
    }

    setIsCreating(true);
    try {
      const eventData = {
        title: eventForm.title,
        description: eventForm.description || undefined,
        startDate: new Date(eventForm.startDate).toISOString(),
        endDate: eventForm.endDate ? new Date(eventForm.endDate).toISOString() : undefined,
        location: eventForm.location ? { address: eventForm.location } : undefined,
      };

      const response = await eventsAPI.create(eventData);
      addEvent(response.data);
      toast.success('Event created successfully');
      setShowEventModal(false);
      setEventForm({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        location: '',
      });
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePin = async (event) => {
    try {
      const x = Math.floor(Math.random() * 800) + 100;
      const y = Math.floor(Math.random() * 600) + 100;

      await townsquareAPI.addItem({
        objectType: 'event',
        objectId: event.id,
        x,
        y,
        width: 300,
        height: 200,
        zIndex: 0,
        rotation: 0,
      });

      toast.success('Pinned to Townsquare!');
      navigate('/townsquare');
    } catch (error) {
      console.error('Error pinning event:', error);
      toast.error('Failed to pin to Townsquare');
    }
  };

  const handleDelete = async (event) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      await eventsAPI.delete(event.id);
      deleteEvent(event.id);
      toast.success('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date) => {
    return events.filter((event) =>
      isSameDay(new Date(event.startDate), date)
    );
  };

  const filteredEvents = selectedDate
    ? getEventsForDate(selectedDate)
    : events;

  // Menu items for the floating menu (no add button for calendar view)
  const menuItems = [
    {
      icon: <User className="w-6 h-6" />,
      label: 'Profile',
      color: 'bg-purple-600 hover:bg-purple-700',
      onClick: () => navigate('/profile'),
    },
    {
      icon: <Settings className="w-6 h-6" />,
      label: 'Settings',
      color: 'bg-orange-600 hover:bg-orange-700',
      onClick: () => setIsConfigOpen(true),
    },
  ];

  return (
    <div className={`min-h-screen`} style={backgroundStyle}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Calendar
          </h1>
          <button
            onClick={() => setShowEventModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Event
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={previousMonth}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  title="Previous month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  title="Next month"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
                  >
                    {day}
                  </div>
                ))}

                {daysInMonth.map((day) => {
                  const dayEvents = getEventsForDate(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      className={`aspect-square p-2 rounded-lg text-sm ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : isTodayDate
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <div className="font-medium">{format(day, 'd')}</div>
                      {dayEvents.length > 0 && (
                        <div className="mt-1 flex justify-center">
                          <div className="w-1.5 h-1.5 bg-current rounded-full" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'All Events'}
              </h3>
              <div className="space-y-3">
                {filteredEvents.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No events for this date
                  </p>
                ) : (
                  filteredEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onPin={handlePin}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Create New Event
              </h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Event title"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Event description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={eventForm.startDate}
                  onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={eventForm.endDate}
                  onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="Event location"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEventModal(false)}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FloatingMenu items={menuItems} />
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        viewName="calendar"
        onSetColor={setBackgroundColor}
        onUploadImage={uploadBackgroundImage}
        onReset={resetViewConfig}
        currentConfig={viewConfigs['calendar']}
        hasUserConfig={hasUserOverride('calendar')}
      />
    </div>
  );
};

export default CalendarPage;
