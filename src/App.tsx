import { useState, useEffect, Suspense, lazy } from 'react';
import IntroTour from './components/IntroTour';
import { CanvasSizeSelector } from './components/CanvasSizeSelector';
import { MenuBoardGallery } from './components/MenuBoardGallery';
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
              <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                <div className="max-w-6xl mx-auto px-6 py-16">
                  <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-6">Digital Display Designer</h1>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">Create stunning, professional display boards for restaurants, cafes, and food outlets. Choose your display size and start designing your perfect digital signage.</p>
                  </div>
                  <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                    <CanvasSizeSelector
                      sizes={filteredCanvasSizes}
                      selectedSize={selectedCanvasSize}
                      onSelectSize={handleCanvasSizeSelect}
                      orientation={orientation}
                      setOrientation={setOrientation}
                    />
                  </div>
                </div>
              </div>
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
            {/* Restart tour button */}
            <button
              onClick={() => { localStorage.removeItem('intro_seen'); setShowIntro(true); setIntroIndex(0); }}
              className="fixed bottom-4 right-4 z-[900] px-3 py-2 rounded-lg bg-white/90 backdrop-blur border border-gray-200 shadow hover:bg-white"
              title="Show Intro"
            >
              Show Tour
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