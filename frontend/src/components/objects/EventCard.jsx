/**
 * EventCard component for displaying events
 */

import React from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Pin, X } from 'lucide-react';

const EventCard = ({ event, onClick, onPin, onDelete, className = '' }) => {
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const handlePinClick = (e) => {
    e.stopPropagation();
    if (onPin) {
      onPin(event);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(event);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer relative ${className}`}
    >
      {onDelete && (
        <button
          onClick={handleDeleteClick}
          className="absolute top-2 left-2 p-1.5 rounded-lg bg-white/90 dark:bg-gray-800/90 hover:bg-red-100 dark:hover:bg-red-900 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors z-10 shadow-md"
          title="Delete"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {onPin && (
        <button
          onClick={handlePinClick}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors z-10 shadow-md"
          title="Pin to Townsquare"
        >
          <Pin className="w-4 h-4" />
        </button>
      )}
      <div className="flex items-start gap-3 mt-2">
        <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {event.title}
          </h3>
          {event.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {event.description}
            </p>
          )}
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            <div>{formatDate(event.startDate)}</div>
            {event.endDate && (
              <div className="text-xs">to {formatDate(event.endDate)}</div>
            )}
          </div>
          {event.location?.address && (
            <div className="mt-2 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{event.location.address}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;

