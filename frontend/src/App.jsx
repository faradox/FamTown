import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

// Authentication
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import OptionalAuthRoute from './components/auth/OptionalAuthRoute';
import LoginForm from './components/auth/LoginForm';
import ForgotPasswordForm from './components/auth/ForgotPasswordForm';

// Pages
import HomePage from './pages/HomePage';
import TownsquarePage from './pages/TownsquarePage';
import CalendarPage from './pages/CalendarPage';
import PhotosPage from './pages/PhotosPage';
import DeskPage from './pages/DeskPage';
import SkyPage from './pages/SkyPage';
import ProfilePage from './pages/ProfilePage';
import AccountingPage from './pages/AccountingPage';
import EntriesPage from './pages/EntriesPage';
import TemplatesPage from './pages/TemplatesPage';
import CategoriesPage from './pages/CategoriesPage';

// Components
import Navigation from './components/Navigation';

// Hooks
import { useWebSocket } from './hooks/useWebSocket';
import { useObjectsStore } from './stores/useObjectsStore';

// Styles
import './index.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

function WebSocketProvider({ children }) {
  useWebSocket();
  return children;
}

function App() {
  const { addPicture, addFile } = useObjectsStore();

  useEffect(() => {
    const onDragOver = (e) => {
      // Only prevent default if dragging files
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
      }
    };

    const onDrop = async (e) => {
      if (!e.dataTransfer) return;
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length === 0) return;

      e.preventDefault();

      let picturesUploaded = 0;
      let docsUploaded = 0;

      try {
        for (const file of files) {
          const isImage = (file.type && file.type.startsWith('image/')) || /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(file.name);

          if (isImage) {
            const { picturesAPI } = await import('./services/objectsAPI');
            const { townsquareAPI } = await import('./services/townsquareAPI');
            const resp = await picturesAPI.upload(file);
            const picture = resp.data;
            addPicture(picture);
            await townsquareAPI.addItem({
              objectType: 'picture',
              objectId: picture.id,
              x: Math.floor(Math.random() * 500 + 100),
              y: Math.floor(Math.random() * 300 + 100),
              width: 300,
              height: 300,
              zIndex: 0,
              rotation: 0,
            });
            picturesUploaded += 1;
          } else {
            const { filesAPI } = await import('./services/objectsAPI');
            const { townsquareAPI } = await import('./services/townsquareAPI');
            const resp = await filesAPI.upload(file);
            const uploadedFile = resp.data;
            addFile(uploadedFile);
            await townsquareAPI.addItem({
              objectType: 'file',
              objectId: uploadedFile.id,
              x: Math.floor(Math.random() * 500 + 100),
              y: Math.floor(Math.random() * 300 + 100),
              width: 300,
              height: 200,
              zIndex: 0,
              rotation: 0,
            });
            docsUploaded += 1;
          }
        }

        if (picturesUploaded || docsUploaded) {
          const parts = [];
          if (picturesUploaded) parts.push(`${picturesUploaded} image${picturesUploaded > 1 ? 's' : ''}`);
          if (docsUploaded) parts.push(`${docsUploaded} file${docsUploaded > 1 ? 's' : ''}`);
          toast.success(`Uploaded ${parts.join(' and ')} and added to Townsquare`);
          window.dispatchEvent(new CustomEvent('townsquare-items-updated'));
        }
      } catch (err) {
        console.error('Global drop upload failed:', err);
        toast.error('Failed to upload dropped item(s)');
      }
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [addPicture, addFile]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <Router>
            <Navigation />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginForm />} />
              <Route path="/forgot" element={<ForgotPasswordForm />} />
              
              {/* Home page */}
              <Route path="/" element={<HomePage />} />
              
              {/* Protected routes */}
              <Route path="/townsquare" element={
                <ProtectedRoute>
                  <TownsquarePage />
                </ProtectedRoute>
              } />
              
              <Route path="/calendar" element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              } />
              
              <Route path="/photos" element={
                <ProtectedRoute>
                  <PhotosPage />
                </ProtectedRoute>
              } />
              
              <Route path="/desk" element={
                <ProtectedRoute>
                  <DeskPage />
                </ProtectedRoute>
              } />
              
              <Route path="/sky" element={
                <ProtectedRoute>
                  <SkyPage />
                </ProtectedRoute>
              } />

              <Route path="/profile/:userId?" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />

              <Route path="/accounting" element={
                <ProtectedRoute>
                  <AccountingPage />
                </ProtectedRoute>
              } />

              <Route path="/accounting/entries" element={
                <ProtectedRoute>
                  <EntriesPage />
                </ProtectedRoute>
              } />

              <Route path="/accounting/templates" element={
                <ProtectedRoute>
                  <TemplatesPage />
                </ProtectedRoute>
              } />

              <Route path="/accounting/categories" element={
                <ProtectedRoute>
                  <CategoriesPage />
                </ProtectedRoute>
              } />
            </Routes>
          </Router>
        </WebSocketProvider>
      </AuthProvider>
        
        {/* React Query DevTools - Only in development */}
        {/* {import.meta.env.DEV && (
          <React.Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </React.Suspense>
        )} */}
        
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App; 