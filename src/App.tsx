import React, { useState } from 'react';
import { CanvasSizeSelector } from './components/CanvasSizeSelector';
import { TemplateSelector } from './components/TemplateSelector';
import { MenuBoardGallery } from './components/MenuBoardGallery';
import { MenuBoardEditor } from './components/MenuBoardEditor';
import type { MenuBoardTemplate, CanvasSize } from './types/MenuBoard';
import { canvasSizes } from './data/canvasSizes';
import { menuBoardTemplates } from './data/menuTemplates';

type AppState = 'canvas-selection' | 'template-gallery' | 'template-selection' | 'editor';

export default function App() {
  const [currentState, setCurrentState] = useState<AppState>('canvas-selection');
  const [selectedCanvasSize, setSelectedCanvasSize] = useState<CanvasSize | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MenuBoardTemplate | null>(null);
  const [templates] = useState<MenuBoardTemplate[]>(menuBoardTemplates);

  const handleCanvasSizeSelect = (size: CanvasSize) => {
    setSelectedCanvasSize(size);
    setCurrentState('template-gallery');
  };

  const handleTemplateSelect = (template: MenuBoardTemplate) => {
    const adapted = selectedCanvasSize && selectedCanvasSize.id !== template.canvasSize.id
      ? { ...template, canvasSize: selectedCanvasSize }
      : template;
    setSelectedTemplate(adapted);
    setCurrentState('editor');
  };

  const handleBackToCanvasSelection = () => { setCurrentState('canvas-selection'); setSelectedCanvasSize(null); };
  const handleBackToTemplateGallery = () => { setCurrentState('template-gallery'); setSelectedTemplate(null); };

  const handleSaveTemplate = (updated: MenuBoardTemplate) => {
    console.log('Saving template:', updated);
    alert('Template saved successfully!');
  };

  const filteredTemplates = selectedCanvasSize
    ? templates.filter((t) => t.isHorizontal === (selectedCanvasSize.width > selectedCanvasSize.height))
    : templates;

  switch (currentState) {
    case 'canvas-selection':
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Digital Menu Board Designer</h1>
              <p className="text-xl text-gray-600 mb-8">Create stunning menu boards for your restaurant displays</p>
            </div>
            <CanvasSizeSelector sizes={canvasSizes} selectedSize={selectedCanvasSize} onSelectSize={handleCanvasSizeSelect} />
          </div>
        </div>
      );
    case 'template-gallery':
      return <MenuBoardGallery templates={filteredTemplates} onSelectTemplate={handleTemplateSelect} />;
    case 'template-selection':
      return <TemplateSelector templates={filteredTemplates} onSelectTemplate={handleTemplateSelect} onBack={handleBackToCanvasSelection} />;
    case 'editor':
      return selectedTemplate ? (
        <MenuBoardEditor template={selectedTemplate} onBack={handleBackToTemplateGallery} onSave={handleSaveTemplate} />
      ) : null;
    default:
      return <div>Loading...</div>;
  }
}