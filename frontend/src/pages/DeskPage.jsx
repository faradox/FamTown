/**
 * DeskPage - file browser view
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Search, User, Settings } from 'lucide-react';
import { filesAPI } from '../services/objectsAPI';
import { useObjectsStore } from '../stores/useObjectsStore';
import { useViewConfigStore } from '../stores/useViewConfigStore';
import FileCard from '../components/objects/FileCard';
import FloatingMenu from '../components/common/FloatingMenu';
import ConfigModal from '../components/common/ConfigModal';
import toast from 'react-hot-toast';

const DeskPage = () => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { files, setFiles, addFile, deleteFile } = useObjectsStore();
  const {
    viewConfigs,
    getBackgroundStyle,
    setBackgroundColor,
    uploadBackgroundImage,
    resetViewConfig,
    hasUserOverride,
    loadAll,
  } = useViewConfigStore();
  const backgroundStyle = getBackgroundStyle('desk');

  useEffect(() => {
    loadAll();
    loadFiles();
  }, [loadAll]);

  const loadFiles = async () => {
    try {
      const response = await filesAPI.list();
      setFiles(response.data);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of selectedFiles) {
        const response = await filesAPI.upload(file);
        addFile(response.data);
      }
      toast.success(`Uploaded ${selectedFiles.length} file(s)`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.filename}"?`)) {
      return;
    }

    try {
      await filesAPI.delete(file.id);
      deleteFile(file.id);
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  // Filter files based on search query
  const filteredFiles = files.filter((file) =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pdfFiles = filteredFiles.filter((f) => f.mimeType?.includes('pdf'));
  const otherFiles = filteredFiles.filter((f) => !f.mimeType?.includes('pdf'));

  // Menu items for the floating menu (no add button for desk view)
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
            Desk
          </h1>
          <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 cursor-pointer">
            <Upload className="w-5 h-5" />
            Upload Files
            <input
              type="file"
              multiple
              accept=".pdf,application/pdf,.txt,text/plain,.doc,application/msword,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>

        {/* Search bar */}
        {files.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {files.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No files yet. Upload your first file!
            </p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No files found matching "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {pdfFiles.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  PDFs
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pdfFiles.map((file) => (
                    <FileCard key={file.id} file={file} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}

            {otherFiles.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Other Files
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherFiles.map((file) => (
                    <FileCard key={file.id} file={file} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isUploading && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            Uploading...
          </div>
        )}
      </div>

      <FloatingMenu items={menuItems} />
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        viewName="desk"
        onSetColor={setBackgroundColor}
        onUploadImage={uploadBackgroundImage}
        onReset={resetViewConfig}
        currentConfig={viewConfigs['desk']}
        hasUserConfig={hasUserOverride('desk')}
      />
    </div>
  );
};

export default DeskPage;
