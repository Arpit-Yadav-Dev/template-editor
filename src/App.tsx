import { useState, useEffect, Suspense, lazy } from 'react';
// Lazy load modal components
const IntroTour = lazy(() => import('./components/IntroTour'));
import { CanvasSizeSelector } from './components/CanvasSizeSelector';
// Lazy load heavy components
const MenuBoardGallery = lazy(() => import('./components/MenuBoardGallery').then(module => ({ default: module.MenuBoardGallery })));
import AnimatedBackground from './components/AnimatedBackground';
import LoginPage from './components/LoginPage';
import type { MenuBoardTemplate, CanvasSize } from './types/MenuBoard';
import { canvasSizes } from './data/canvasSizes';
import { AppLoader } from './components/AppLoader';
import ErrorBoundary from './components/ErrorBoundary';
import sampleTemplates from './data/sampleTemplates.json';
import { useAuth } from './hooks/useAuth';
import { apiService } from './services/api';
import { SaveSuccessModal } from './components/SaveSuccessModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
// Thumbnail blob now comes from MenuBoardEditor using the exact export logic

const MenuBoardEditor = lazy(() => import('./components/MenuBoardEditor').then(module => ({ default: module.MenuBoardEditor })));

type AppState = 'login' | 'canvas-selection' | 'template-gallery' | 'editor' | 'loading';

export default function App() {
  const [currentState, setCurrentState] = useState<AppState>('login');
  const [selectedCanvasSize, setSelectedCanvasSize] = useState<CanvasSize | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MenuBoardTemplate | null>(null);
  const [templates, setTemplates] = useState<MenuBoardTemplate[]>([]);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isLoading, setIsLoading] = useState(false);
  
  // Save success modal state
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [saveAction, setSaveAction] = useState<'saved' | 'updated'>('saved');
  
  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<MenuBoardTemplate | null>(null);
  
  // Use auth hook
  const { isAuthenticated, user, logout: authLogout, isCheckingAuth } = useAuth();
  
  // Track auth state changes in App component
  useEffect(() => {
    // Auth state changed
  }, [isAuthenticated, user, isCheckingAuth]);
  
  // Track if user chose to skip login
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [introIndex, setIntroIndex] = useState(0);
  const [introScope, setIntroScope] = useState<'editor' | 'canvas' | 'gallery'>('editor');
  
  // Local user state to avoid sync issues
  const [localUser, setLocalUser] = useState<any>(null);
  const [localIsAuthenticated, setLocalIsAuthenticated] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    // Simulate fetching templates from DB
    setTimeout(() => {
      setTemplates(sampleTemplates as MenuBoardTemplate[]);
      setIsLoading(false);
    }, 2000); // Extended to 2 seconds
  }, []);

  // Show intro on first visit to editor
  useEffect(() => {
    if (currentState === 'editor') {
      const seen = localStorage.getItem('intro_seen');
      if (!seen) {
        // Small delay to allow editor DOM to mount
        setTimeout(() => {
          console.log('[IntroTour] showing intro');
          setShowIntro(true);
          setIntroIndex(0);
          setIntroScope('editor');
        }, 300);
      }
    }
  }, [currentState]);

  // Optional: intro for canvas selection and gallery
  useEffect(() => {
    if (currentState === 'canvas-selection') {
      const seen = localStorage.getItem('intro_seen_canvas');
      if (!seen) {
        setTimeout(() => {
          setIntroScope('canvas');
          setShowIntro(true);
          setIntroIndex(0);
        }, 800); // Increased delay to ensure DOM is ready
      }
    }
  }, [currentState]);

  useEffect(() => {
    if (currentState === 'template-gallery') {
      const seen = localStorage.getItem('intro_seen_gallery');
      if (!seen) {
        setTimeout(() => {
          setIntroScope('gallery');
          setShowIntro(true);
          setIntroIndex(0);
        }, 800); // Increased delay to match canvas selection
      }
    }
  }, [currentState]);

  const handleCanvasSizeSelect = (size: CanvasSize) => {
    setIsLoading(true);
    setTimeout(() => {
      const newCanvasSize = {
        ...size,
        isHorizontal: orientation === 'landscape',
      };
      console.log('Orientation:', orientation);
      console.log('Original size:', size);
      console.log('New canvas size:', newCanvasSize);
      console.log('Selected canvas size:', newCanvasSize);
      setSelectedCanvasSize(newCanvasSize);
      setCurrentState('template-gallery');
      setIsLoading(false);
    }, 1500); // Extended to 1.5 seconds
  };

  const handleTemplateSelect = (template: MenuBoardTemplate | null) => {
    setIsLoading(true);
    setTimeout(() => {
        if (template) {
          // Always adapt the template to use the selected canvas size and orientation
          const adapted = {
            ...template,
            canvasSize: selectedCanvasSize!,
            isHorizontal: selectedCanvasSize!.isHorizontal ?? true
          };
          console.log('Template adapted:', adapted);
          setSelectedTemplate(adapted);
          setCurrentState('editor');
        } else {
        // Handle blank template
        if (selectedCanvasSize) {
          setSelectedTemplate({
            id: `blank-${Date.now()}`,
            name: 'Blank Template',
            category: 'custom',
            preview: 'Start from scratch',
            backgroundColor: '#ffffff',
            canvasSize: selectedCanvasSize,
            isHorizontal: selectedCanvasSize.isHorizontal ?? true,
            elements: [],
            groups: [],
          });
          setCurrentState('editor');
        }
      }
      setIsLoading(false);
    }, 2000); // Extended to 2 seconds
  };

  const handleBackToCanvasSelection = () => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentState('canvas-selection');
      setSelectedCanvasSize(null);
      setSelectedTemplate(null);
      setIsLoading(false);
    }, 1500); // Extended to 1.5 seconds
  };

  const handleBackToTemplateGallery = () => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentState('template-gallery');
      setSelectedTemplate(null);
      setIsLoading(false);
    }, 1500); // Extended to 1.5 seconds
  };

  const handleSaveTemplate = async (updated: MenuBoardTemplate, options?: { thumbnailBlob?: Blob }) => {
    console.log('Saving template:', updated);
    
    try {
      // Show loading state
      setIsLoading(true);
      
      // Prefer blob from editor (generated with the exact manual logic)
      const blob = options?.thumbnailBlob;
      if (!blob) {
        throw new Error('Thumbnail blob not generated');
      }
      
      // Config: toggle auto-download and API upload
      const downloadForVerification = false; // set true to auto-download PNG on save
      const uploadEnabled = true; // set false to skip server upload

      if (downloadForVerification) {
        try {
          const localUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = localUrl;
          a.download = `${updated.name || 'template'}-thumbnail.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(localUrl);
          console.log('✅ Local thumbnail download triggered');
        } catch (dlErr) {
          console.warn('⚠️ Failed to auto-download thumbnail locally (non-blocking):', dlErr);
        }
      }

      if (!uploadEnabled) {
        console.log('⏭️ Skipping API upload until PNG verified.');
        return;
      }

      console.log('✅ Thumbnail generated, uploading to API...');
      
      // Determine save action based on template metadata
      // Check if template has 'isDefaultTemplate' flag or 'isUserTemplate' flag
      const isDefaultTemplate = updated.isDefaultTemplate === true;
      const isUserTemplate = updated.isUserTemplate === true;
      
      let response;
      
      if (isDefaultTemplate) {
        // Default templates ALWAYS create new (never update the original)
        console.log('✨ Creating new template from default template');
        response = await apiService.saveTemplateWithThumbnail(updated, blob);
      } else if (isUserTemplate && updated.saveAction === 'update') {
        // User chose to UPDATE their existing template
        console.log('🔄 Updating existing user template with ID:', updated.id);
        response = await apiService.updateTemplateWithThumbnail(updated.id, updated, blob);
      } else if (isUserTemplate && updated.saveAction === 'saveAsNew') {
        // User chose to SAVE AS NEW (create a copy)
        console.log('✨ Creating new template (copy of existing)');
        response = await apiService.saveTemplateWithThumbnail(updated, blob);
      } else {
        // Default: CREATE new template (blank templates, etc.)
        console.log('✨ Creating new template');
        response = await apiService.saveTemplateWithThumbnail(updated, blob);
      }
      
      if (response.success) {
        const action = isUserTemplate && updated.saveAction === 'update' ? 'updated' : 'saved';
        console.log(`✅ Template ${action} successfully!`, response.data);
        
        // Show success modal with countdown
        setSaveAction(action);
        setShowSaveSuccess(true);
      } else {
        throw new Error(response.error || 'Failed to save template');
      }
      
    } catch (error) {
      console.error('❌ Failed to save template:', error);
      // Show error in a better way - you can replace this with a toast later
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save template: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete template
  const handleDeleteTemplate = async (template: MenuBoardTemplate) => {
    setTemplateToDelete(template);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      setIsLoading(true);
      setShowDeleteConfirm(false);

      console.log('🗑️ Deleting template:', templateToDelete.id);
      const response = await apiService.deleteTemplateById(templateToDelete.id);

      if (response.success) {
        console.log('✅ Template deleted successfully!');
        // Navigate back to gallery
        handleBackToTemplateGallery();
      } else {
        throw new Error(response.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('❌ Failed to delete template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to delete template: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setTemplateToDelete(null);
    }
  };

  // Auto-navigate based on auth state
  useEffect(() => {
    if (isCheckingAuth) return; // Don't navigate while checking auth
    
    if (isAuthenticated && currentState === 'login') {
      setCurrentState('canvas-selection');
    } else if (!isAuthenticated && !isGuestMode && currentState !== 'login' && !isCheckingAuth) {
      setCurrentState('login');
    }
  }, [isAuthenticated, isCheckingAuth, isGuestMode]); // Removed currentState to prevent loops

  // Login handlers
  const handleLoginSuccess = (userData?: any) => {
    // Set local state immediately to avoid sync issues
    setLocalIsAuthenticated(true);
    setLocalUser(userData || user);
    
    // Force navigation immediately
    setCurrentState('canvas-selection');
  };

  const handleSkipLogin = () => {
    // Mark as guest user (no authentication)
    setIsGuestMode(true);
    setCurrentState('canvas-selection');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Reset all app state
      setSelectedCanvasSize(null);
      setSelectedTemplate(null);
      setTemplates([]);
      setIsGuestMode(false);
      // Clear local state
      setLocalUser(null);
      setLocalIsAuthenticated(false);
      setIsLoggingOut(false);
      // Navigate back to login page
      setCurrentState('login');
    }
  };

  const filteredCanvasSizes = canvasSizes.filter(size => size.category === 'tv');

  const filteredTemplates = selectedCanvasSize
    ? templates.filter((t) => t.isHorizontal === selectedCanvasSize.isHorizontal)
    : templates;

  if (isLoading || isCheckingAuth) {
    return <AppLoader />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<AppLoader />}>
        {currentState === 'login' && (
          <LoginPage 
            onLoginSuccess={handleLoginSuccess}
            onSkip={handleSkipLogin}
          />
        )}
        
        {currentState === 'canvas-selection' && (
              <AnimatedBackground>
                <div className="max-w-6xl mx-auto px-6 py-8">
                  {/* Header with Logout Button */}
                  <div className="flex justify-between items-center mb-8">
                    <div></div>
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl mb-4 shadow-lg">
                        <div className="text-white font-bold text-sm leading-tight">
                          <div>DS</div>
                          <div className="text-xs">MOVI</div>
                        </div>
                      </div>
                      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">Digital Display Designer</h1>
                      <p className="text-base text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        Create stunning, professional display boards for restaurants, cafes, and food outlets. 
                        Choose your display size and start designing your perfect digital signage.
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {(localIsAuthenticated || isAuthenticated) && (localUser || user) ? (
                        <>
                          <span className="text-sm text-gray-600">
                            Welcome, {(localUser || user).name || (localUser || user).email}
                          </span>
                          <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                          >
                            {isLoggingOut ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>Logging out...</span>
                              </>
                            ) : (
                              'Logout'
                            )}
                          </button>
                        </>
                      ) : isGuestMode ? (
                        <>
                          <span className="text-sm text-gray-500">
                            Guest Mode - Default Templates
                          </span>
                          <button
                            onClick={() => setCurrentState('login')}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                          >
                            Login
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden">
                    <CanvasSizeSelector
                      sizes={filteredCanvasSizes}
                      selectedSize={selectedCanvasSize}
                      onSelectSize={handleCanvasSizeSelect}
                      orientation={orientation}
                      setOrientation={setOrientation}
                    />
                  </div>
                </div>
              </AnimatedBackground>
            )}
        {currentState === 'template-gallery' && (
          <MenuBoardGallery
            templates={filteredTemplates}
            onSelectTemplate={handleTemplateSelect}
            onBack={handleBackToCanvasSelection}
            onDeleteTemplate={handleDeleteTemplate}
            selectedCanvasSize={selectedCanvasSize!}
            isAuthenticated={localIsAuthenticated || isAuthenticated}
            user={(localUser || user) || undefined}
            isGuestMode={isGuestMode}
          />
        )}
        {currentState === 'editor' && selectedTemplate && (
          <>
            <MenuBoardEditor template={selectedTemplate} onBack={handleBackToTemplateGallery} onSave={handleSaveTemplate} />
            {/* Restart tour button - very compact */}
            <button
              onClick={() => { localStorage.removeItem('intro_seen'); setShowIntro(true); setIntroIndex(0); }}
              className="fixed bottom-4 right-4 z-[900] group transition-all duration-300 ease-in-out"
              title="Restart Tour Guide"
            >
              <div className="bg-white/90 backdrop-blur border border-gray-200 shadow-lg rounded-full hover:rounded-xl overflow-hidden transition-all duration-300 ease-in-out">
                <div className="flex items-center space-x-0 hover:space-x-1 px-1 hover:px-2 py-1 transition-all duration-300">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <svg className="w-3 h-3 text-blue-600 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Tour
                  </span>
                </div>
              </div>
            </button>
            {showIntro && introScope === 'editor' && (
              <IntroTour
                steps={[
                  {
                    id: 'topbar',
                    targetSelector: '#editor-top-toolbar',
                    title: 'Editor Toolbar',
                    description: 'Toggle grid/rulers for precision, view selection count, and access canvas controls.',
                    placement: 'bottom',
                  },
                  {
                    id: 'left',
                    targetSelector: '#editor-left-toolbar',
                    title: 'Add Elements',
                    description: 'Add text, images, shapes, prices, or promotions. Click any tool to start adding content.',
                    placement: 'right',
                  },
                  {
                    id: 'canvas',
                    targetSelector: '#editor-canvas-area',
                    title: 'Design Canvas',
                    description: 'Drag, resize, rotate elements. Use guides and snap-to-grid for precision alignment. Right-click for context menu.',
                    placement: 'right',
                  },
                  {
                    id: 'right',
                    targetSelector: '#editor-right-properties',
                    title: 'Properties Panel',
                    description: 'Select any element to customize colors, fonts, shadows, strokes, and more.',
                    placement: 'left',
                  },
                  {
                    id: 'header-actions',
                    targetSelector: '#editor-header-actions',
                    title: 'Save & Export',
                    description: 'Download PNG for display, export JSON for backup, or save template. Use zoom controls and preview.',
                    placement: 'bottom',
                  },
                ]}
                currentIndex={introIndex}
                onNext={() => {
                  if (introIndex < 4) {
                    setIntroIndex(introIndex + 1);
                  } else {
                    setShowIntro(false);
                    localStorage.setItem('intro_seen', '1');
                  }
                }}
                onPrev={() => setIntroIndex(Math.max(0, introIndex - 1))}
                onClose={() => {
                  setShowIntro(false);
                  localStorage.setItem('intro_seen', '1');
                }}
              />
            )}
          </>
        )}

        {/* Canvas selection intro */}
        {showIntro && introScope === 'canvas' && currentState === 'canvas-selection' && (
          <IntroTour
            steps={[
              { id: 'canvas-orientation', targetSelector: '#canvas-select-orientation', title: 'Display Orientation', description: 'Choose landscape (wide) or portrait (tall) for your TV. This sets how content will display.', placement: 'bottom' },
              { id: 'canvas-grid', targetSelector: '#canvas-select-grid', title: 'TV Size Selection', description: 'Pick your display size. All options are optimized for digital signage and adapt to your orientation.', placement: 'bottom' },
            ]}
            currentIndex={introIndex}
            onNext={() => {
              if (introIndex < 1) setIntroIndex(introIndex + 1);
              else { setShowIntro(false); localStorage.setItem('intro_seen_canvas', '1'); }
            }}
            onPrev={() => setIntroIndex(Math.max(0, introIndex - 1))}
            onClose={() => { setShowIntro(false); localStorage.setItem('intro_seen_canvas', '1'); }}
          />
        )}

        {/* Gallery intro */}
        {showIntro && introScope === 'gallery' && currentState === 'template-gallery' && (
          <IntroTour
            steps={[
              { id: 'gallery-header', targetSelector: '#gallery-root', title: 'Template Gallery', description: 'Choose from professional templates or start blank. All templates are optimized for your display size.', placement: 'bottom' },
              { id: 'gallery-blank', targetSelector: '#gallery-blank-template', title: 'Blank Template', description: 'Start from scratch with complete creative freedom. Perfect for custom designs.', placement: 'right' },
              { id: 'gallery-templates', targetSelector: '#gallery-template-cards', title: 'Professional Templates', description: 'Ready-made designs for restaurants. Use "Preview" to see designs or "Start Editing" to customize.', placement: 'top' },
            ]}
            currentIndex={introIndex}
            onNext={() => {
              if (introIndex < 2) {
                setIntroIndex(introIndex + 1);
              } else {
                setShowIntro(false);
                localStorage.setItem('intro_seen_gallery', '1');
              }
            }}
            onPrev={() => setIntroIndex(Math.max(0, introIndex - 1))}
            onClose={() => { setShowIntro(false); localStorage.setItem('intro_seen_gallery', '1'); }}
          />
        )}
      </Suspense>

      {/* Save Success Modal */}
      <SaveSuccessModal
        isOpen={showSaveSuccess}
        action={saveAction}
        onComplete={() => {
          setShowSaveSuccess(false);
          handleBackToTemplateGallery();
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        templateName={templateToDelete?.name || ''}
        onConfirm={confirmDeleteTemplate}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setTemplateToDelete(null);
        }}
      />
    </ErrorBoundary>
  );
}