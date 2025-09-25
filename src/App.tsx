import { useState, useEffect, Suspense, lazy } from 'react';
import IntroTour from './components/IntroTour';
import { CanvasSizeSelector } from './components/CanvasSizeSelector';
import { MenuBoardGallery } from './components/MenuBoardGallery';
import AnimatedBackground from './components/AnimatedBackground';
import type { MenuBoardTemplate, CanvasSize } from './types/MenuBoard';
import { canvasSizes } from './data/canvasSizes';
import { AppLoader } from './components/AppLoader';
import ErrorBoundary from './components/ErrorBoundary';
import sampleTemplates from './data/sampleTemplates.json';

const MenuBoardEditor = lazy(() => import('./components/MenuBoardEditor').then(module => ({ default: module.MenuBoardEditor })));

type AppState = 'canvas-selection' | 'template-gallery' | 'editor' | 'loading';

export default function App() {
  const [currentState, setCurrentState] = useState<AppState>('canvas-selection');
  const [selectedCanvasSize, setSelectedCanvasSize] = useState<CanvasSize | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MenuBoardTemplate | null>(null);
  const [templates, setTemplates] = useState<MenuBoardTemplate[]>([]);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isLoading, setIsLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [introIndex, setIntroIndex] = useState(0);
  const [introScope, setIntroScope] = useState<'editor' | 'canvas' | 'gallery'>('editor');

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

  const handleSaveTemplate = (updated: MenuBoardTemplate) => {
    console.log('Saving template:', updated);
    alert('Template saved successfully!');
  };

  const filteredCanvasSizes = canvasSizes.filter(size => size.category === 'tv');

  const filteredTemplates = selectedCanvasSize
    ? templates.filter((t) => t.isHorizontal === selectedCanvasSize.isHorizontal)
    : templates;

  if (isLoading) {
    return <AppLoader />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<AppLoader />}>
            {currentState === 'canvas-selection' && (
              <AnimatedBackground>
                <div className="max-w-6xl mx-auto px-6 py-8">
                  <div className="text-center mb-8">
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
            selectedCanvasSize={{ 
              width: selectedCanvasSize!.width, 
              height: selectedCanvasSize!.height, 
              isHorizontal: selectedCanvasSize!.isHorizontal ?? true 
            }}
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
    </ErrorBoundary>
  );
}