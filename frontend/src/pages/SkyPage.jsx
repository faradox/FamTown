/**
 * SkyPage - text collection view
 */

import React, { useEffect, useState, useRef } from 'react';
import { Plus, X, User, Settings, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { textsAPI } from '../services/objectsAPI';
import { townsquareAPI } from '../services/townsquareAPI';
import { useObjectsStore } from '../stores/useObjectsStore';
import { useViewConfigStore } from '../stores/useViewConfigStore';
import TextCard from '../components/objects/TextCard';
import FloatingMenu from '../components/common/FloatingMenu';
import ConfigModal from '../components/common/ConfigModal';
import toast from 'react-hot-toast';

const TEXT_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'wish', label: 'Wishes' },
  { value: 'insight', label: 'Insights' },
  { value: 'recipe', label: 'Recipes' },
  { value: 'movie_idea', label: 'Movie Ideas' },
  { value: 'quote', label: 'Quotes' },
];

const SkyPage = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newTextContent, setNewTextContent] = useState('');
  const [newTextType, setNewTextType] = useState('wish');
  const [isCreating, setIsCreating] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [viewerText, setViewerText] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const loadMoreRef = useRef(null);
  const { texts, setTexts, addText, deleteText } = useObjectsStore();
  const {
    viewConfigs,
    getBackgroundStyle,
    setBackgroundColor,
    uploadBackgroundImage,
    resetViewConfig,
    hasUserOverride,
    loadAll,
  } = useViewConfigStore();
  const backgroundStyle = getBackgroundStyle('sky');

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    // Reset and load first page when type changes
    setPage(1);
    setHasMore(true);
    setTexts([]);
    loadTexts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  const loadTexts = async (reset = false) => {
    if (isLoadingPage) return;
    try {
      setIsLoadingPage(true);
      const nextPage = reset ? 1 : page;
      const pageSize = 20;
      const params = { page: nextPage, pageSize };
      if (selectedType !== 'all') {
        params.textType = selectedType;
      }
      const response = await textsAPI.list(params);
      const newItems = response.data || [];
      if (reset) {
        setTexts(newItems);
      } else {
        // Merge without duplicates
        const existingIds = new Set(texts.map((t) => t.id));
        const merged = [...texts, ...newItems.filter((t) => !existingIds.has(t.id))];
        setTexts(merged);
      }
      setHasMore(newItems.length === pageSize);
      setPage(nextPage + 1);
    } catch (error) {
      console.error('Error loading texts:', error);
    } finally {
      setIsLoadingPage(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoadingPage) {
          loadTexts();
        }
      },
      { rootMargin: '200px' }
    );
    const current = loadMoreRef.current;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isLoadingPage]);

  const handleCreateText = async () => {
    if (!newTextContent.trim()) {
      toast.error('Please enter some content');
      return;
    }

    setIsCreating(true);
    try {
      const response = await textsAPI.create({
        content: newTextContent,
        textType: newTextType,
      });
      addText(response.data);
      toast.success('Text created successfully');
      setShowModal(false);
      setNewTextContent('');
      setNewTextType('wish');
    } catch (error) {
      console.error('Error creating text:', error);
      toast.error('Failed to create text');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePin = async (text) => {
    try {
      // Generate random position within reasonable bounds
      const x = Math.floor(Math.random() * 800) + 100;
      const y = Math.floor(Math.random() * 600) + 100;

      await townsquareAPI.addItem({
        objectType: 'text',
        objectId: text.id,
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
      console.error('Error pinning text:', error);
      toast.error('Failed to pin to Townsquare');
    }
  };

  const handleDelete = async (text) => {
    if (!window.confirm('Are you sure you want to delete this text?')) {
      return;
    }

    try {
      await textsAPI.delete(text.id);
      deleteText(text.id);
      toast.success('Text deleted successfully');
    } catch (error) {
      console.error('Error deleting text:', error);
      toast.error('Failed to delete text');
    }
  };

  // Filter texts by type and search query
  const filteredTexts = texts
    .filter((text) =>
      selectedType === 'all' || text.textType === selectedType
    )
    .filter((text) =>
      text.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Menu items for the floating menu (no add button for sky view)
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
            Sky
          </h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Text
          </button>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TEXT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedType === type.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        {texts.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search texts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {texts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No texts yet. Create your first one!
            </p>
          </div>
        ) : filteredTexts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No texts found matching "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
            {filteredTexts.map((text) => (
              <div key={text.id} className="break-inside-avoid">
                <TextCard
                  text={text}
                  onClick={() => setViewerText(text)}
                  onPin={handlePin}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
          )}
          {/* Sentinel for infinite scroll */}
          <div ref={loadMoreRef} className="h-10" />
          {isLoadingPage && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading…</div>
          )}
      </div>

      {/* Create Text Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Create New Text
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={newTextType}
                  onChange={(e) => setNewTextType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {TEXT_TYPES.filter((t) => t.value !== 'all').map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content
                </label>
                <textarea
                  value={newTextContent}
                  onChange={(e) => setNewTextContent(e.target.value)}
                  placeholder="Enter your text here..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateText}
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
      {/* Fullscreen viewer */}
      {viewerText && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4"
          onClick={() => setViewerText(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewerText(null)}
              className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <TextCard text={viewerText} fullView className="w-full" />
          </div>
        </div>
      )}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        viewName="sky"
        onSetColor={setBackgroundColor}
        onUploadImage={uploadBackgroundImage}
        onReset={resetViewConfig}
        currentConfig={viewConfigs['sky']}
        hasUserConfig={hasUserOverride('sky')}
      />
    </div>
  );
};

export default SkyPage;
