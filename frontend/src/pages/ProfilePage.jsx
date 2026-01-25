/**
 * ProfilePage - user profile view with canvas
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, User, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { eventsAPI, picturesAPI, filesAPI, textsAPI } from '../services/objectsAPI';
import { useObjectsStore } from '../stores/useObjectsStore';
import { useViewConfigStore } from '../stores/useViewConfigStore';
import { profileAPI } from '../services/profileAPI';
import ProfileCanvas from '../components/profile/ProfileCanvas';
import ObjectPicker from '../components/townsquare/ObjectPicker';
import FloatingMenu from '../components/common/FloatingMenu';
import ConfigModal from '../components/common/ConfigModal';
import EditProfileModal from '../components/profile/EditProfileModal';
import Avatar from '../components/common/Avatar';

const ProfilePage = () => {
  const { userId } = useParams(); // Get userId from URL params
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const { setEvents, setPictures, setFiles, setTexts } = useObjectsStore();
  const {
    viewConfigs,
    getBackgroundStyle,
    setBackgroundColor,
    uploadBackgroundImage,
    resetViewConfig,
    hasUserOverride,
    loadAll,
  } = useViewConfigStore();
  const backgroundStyle = getBackgroundStyle('profile');

  // If no userId in URL, use current user's ID
  const profileUserId = userId || currentUser?.id;
  const isOwnProfile = currentUser?.id === profileUserId;

  useEffect(() => {
    loadAll();
    loadAllObjects();
  }, [loadAll]);

  const loadAllObjects = async () => {
    try {
      const [eventsRes, picturesRes, filesRes, textsRes] = await Promise.all([
        eventsAPI.list(),
        picturesAPI.list(),
        filesAPI.list(),
        textsAPI.list(),
      ]);

      setEvents(eventsRes.data);
      setPictures(picturesRes.data);
      setFiles(filesRes.data);
      setTexts(textsRes.data);
    } catch (error) {
      console.error('Error loading objects:', error);
    }
  };

  const handleConfigClick = () => {
    if (isOwnProfile) {
      setIsEditProfileOpen(true);
    } else {
      setIsConfigOpen(true);
    }
  };

  const handleAddToProfile = async (objectType, object) => {
    try {
      const response = await profileAPI.addItem(profileUserId, {
        objectType,
        objectId: object.id,
        x: Math.floor(Math.random() * 500 + 100),
        y: Math.floor(Math.random() * 300 + 100),
        width: 300,
        height: 200,
        zIndex: 0,
        rotation: 0,
      });
      // Reload profile canvas by triggering a re-render
      // The ProfileCanvas component will reload items when it detects this
      window.dispatchEvent(new CustomEvent('profile-items-updated', { detail: { userId: profileUserId } }));
    } catch (error) {
      console.error('Error adding to profile:', error);
      throw error;
    }
  };

  // Menu items for the floating menu
  const menuItems = isOwnProfile
    ? [
        {
          icon: <Plus className="w-6 h-6" />,
          label: 'Add to Profile',
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
          label: 'Edit Profile',
          color: 'bg-orange-600 hover:bg-orange-700',
          onClick: handleConfigClick,
        },
      ]
    : [
        {
          icon: <User className="w-6 h-6" />,
          label: 'My Profile',
          color: 'bg-purple-600 hover:bg-purple-700',
          onClick: () => navigate('/profile'),
        },
        {
          icon: <Settings className="w-6 h-6" />,
          label: 'Settings',
          color: 'bg-orange-600 hover:bg-orange-700',
          onClick: handleConfigClick,
        },
      ];

  return (
    <div className="fixed inset-0 overflow-hidden" style={backgroundStyle}>
      {/* Avatar in top left corner - clickable to go to townsquare */}
      <div className="absolute top-6 left-6 z-40">
        <button
          onClick={() => navigate('/townsquare')}
          className="transition-transform hover:scale-105"
          title="Go to Townsquare"
        >
          <Avatar user={currentUser} size="xl" className="shadow-lg" />
        </button>
      </div>

      <ProfileCanvas userId={profileUserId} isOwner={isOwnProfile} />

      <FloatingMenu items={menuItems} />

      {isOwnProfile && (
        <>
          <ObjectPicker
            isOpen={isPickerOpen}
            onClose={() => setIsPickerOpen(false)}
            title="Add to Profile wall"
            onAdd={handleAddToProfile}
          />
          <EditProfileModal
            isOpen={isEditProfileOpen}
            onClose={() => setIsEditProfileOpen(false)}
          />
        </>
      )}

      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        viewName="profile"
        onSetColor={setBackgroundColor}
        onUploadImage={uploadBackgroundImage}
        onReset={resetViewConfig}
        currentConfig={viewConfigs['profile']}
        hasUserConfig={hasUserOverride('profile')}
      />
    </div>
  );
};

export default ProfilePage;
