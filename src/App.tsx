import { useState, useEffect, Suspense, lazy } from 'react';
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

  useEffect(() => {
    setIsLoading(true);
    // Simulate fetching templates from DB
    setTimeout(() => {
      setTemplates(sampleTemplates as MenuBoardTemplate[]);
      setIsLoading(false);
    }, 2000); // Extended to 2 seconds
  }, []);

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
          <MenuBoardEditor template={selectedTemplate} onBack={handleBackToTemplateGallery} onSave={handleSaveTemplate} />
        )}
      </Suspense>
    </ErrorBoundary>
  );
}