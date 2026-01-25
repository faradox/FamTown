/**
 * TownsquarePage - main townsquare view
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, User, Settings } from 'lucide-react';
import TownsquareCanvas from '../components/townsquare/TownsquareCanvas';
import ObjectPicker from '../components/townsquare/ObjectPicker';
import FloatingMenu from '../components/common/FloatingMenu';
import ConfigModal from '../components/common/ConfigModal';
import { useViewConfigStore } from '../stores/useViewConfigStore';

const TownsquarePage = () => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const {
    viewConfigs,
    getBackgroundStyle,
    setBackgroundColor,
    uploadBackgroundImage,
    resetViewConfig,
    hasUserOverride,
    loadAll,
    isLoaded,
  } = useViewConfigStore();
  const backgroundStyle = getBackgroundStyle('townsquare');
  const navigate = useNavigate();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Menu items for the floating menu
  const menuItems = [
    {
      icon: <Plus className="w-6 h-6" />,
      label: 'Add to Townsquare',
      color: 'bg-green-600 hover:bg-green-700',
      onClick: () => setIsPickerOpen(true),
    },
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
    <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 overflow-hidden">
      <TownsquareCanvas />

      <FloatingMenu items={menuItems} />

      <ObjectPicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} />
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        viewName="townsquare"
        onSetColor={setBackgroundColor}
        onUploadImage={uploadBackgroundImage}
        onReset={resetViewConfig}
        currentConfig={viewConfigs['townsquare']}
        hasUserConfig={hasUserOverride('townsquare')}
      />
    </div>
  );
};

export default TownsquarePage;
