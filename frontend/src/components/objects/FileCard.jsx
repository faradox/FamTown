/**
 * FileCard component for displaying files
 */

import React, { useState } from 'react';
import { FileText, FileImage, FileVideo, File as FileIcon, Download, Edit2, Check, X, Trash2 } from 'lucide-react';
import { filesAPI } from '../../services/objectsAPI';
import { useObjectsStore } from '../../stores/useObjectsStore';
import toast from 'react-hot-toast';

const FileCard = ({ file, onClick, onDelete, className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const { updateFile } = useObjectsStore();
  const getFileIcon = () => {
    if (!file.mimeType) return <FileIcon className="w-8 h-8" />;

    if (file.mimeType.startsWith('image/')) {
      return <FileImage className="w-8 h-8" />;
    } else if (file.mimeType.startsWith('video/')) {
      return <FileVideo className="w-8 h-8" />;
    } else if (file.mimeType.includes('pdf')) {
      return <FileText className="w-8 h-8 text-red-500" />;
    } else {
      return <FileIcon className="w-8 h-8" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const isPDF = file.mimeType?.includes('pdf');

  // Extract filename and extension
  const getFilenameWithoutExtension = (filename) => {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return filename;
    return filename.substring(0, lastDotIndex);
  };

  const getFileExtension = (filename) => {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return filename.substring(lastDotIndex);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setEditedName(getFilenameWithoutExtension(file.filename));
    setIsEditing(true);
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditedName('');
  };

  const handleSaveEdit = async (e) => {
    e.stopPropagation();

    if (!editedName.trim()) {
      toast.error('Filename cannot be empty');
      return;
    }

    const newFilename = editedName.trim() + getFileExtension(file.filename);

    try {
      const response = await filesAPI.update(file.id, newFilename);
      updateFile(file.id, response.data);
      toast.success('Filename updated');
      setIsEditing(false);
      setEditedName('');
    } catch (error) {
      console.error('Error updating filename:', error);
      toast.error('Failed to update filename');
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await filesAPI.download(file.id);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(file);
    }
  };

  return (
    <div
      onClick={isEditing ? undefined : onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow ${!isEditing && 'cursor-pointer'} ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
          {getFileIcon()}
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit(e);
                  if (e.key === 'Escape') handleCancelEdit(e);
                }}
                className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-blue-500 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {getFileExtension(file.filename)}
              </span>
            </div>
          ) : (
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {file.filename}
            </h3>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {file.size && <span>{formatFileSize(file.size)}</span>}
            {isPDF && (
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                PDF
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdit}
                className="p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Save"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              {onDelete && (
                <button
                  onClick={handleDeleteClick}
                  className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleEditClick}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Edit filename"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileCard;

