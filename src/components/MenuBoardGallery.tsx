import React, { useState, useEffect } from 'react';
import { MenuBoardTemplate, MenuBoardElement } from '../types/MenuBoard';
import { ChevronRight, Monitor, RotateCcw, Eye, Edit, Plus, Loader2, X } from 'lucide-react';
import { PreviewLoader } from './AppLoader';

interface MenuBoardGalleryProps {
  templates: MenuBoardTemplate[];
  onSelectTemplate: (template: MenuBoardTemplate | null) => void;
  onBack: () => void;
  selectedCanvasSize: { width: number; height: number; isHorizontal: boolean };
}

const PreviewRenderer: React.FC<{ template: MenuBoardTemplate }> = ({ template }) => {
  // Simplified render logic for preview
  const renderElement = (el: MenuBoardElement) => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: el.x, // Don't clamp to 0, allow elements to be positioned anywhere
      top: el.y,  // Don't clamp to 0, allow elements to be positioned anywhere
      width: Math.max(10, el.width),
      height: Math.max(10, el.height),
      transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipX ? -1 : 1}) scaleY(${el.flipY ? -1 : 1})`,
      zIndex: el.zIndex || 1,
      opacity: Math.max(0, Math.min(1, el.opacity ?? 1)),
      boxShadow: el.shadow ?? 'none',
    };

    if (el.type === 'text' || el.type === 'price' || el.type === 'promotion') {
      return (
        <div key={el.id} style={{
          ...baseStyle,
          color: el.color || '#000',
          fontSize: Math.max(8, el.fontSize || 16),
          fontWeight: el.fontWeight || 'normal',
          fontFamily: el.fontFamily || 'Arial',
          textAlign: el.textAlign || 'left',
          whiteSpace: 'pre-line',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
          padding: '2px',
        }}>
          {el.content || (el.type === 'price' ? '' : 'Sample Text')}
        </div>
      );
    } else if (el.type === 'image') {
      return (
        <div key={el.id} style={{
          ...baseStyle,
          borderRadius: Math.max(0, el.borderRadius || 0),
          overflow: 'hidden',
          backgroundColor: '#f3f4f6',
        }}>
          {el.imageUrl ? (
            <img 
              src={el.imageUrl} 
              alt="" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                display: 'block'
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<div style="width: 100%; height: 100%; background: linear-gradient(45deg, #f3f4f6, #e5e7eb); display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 12px;">Image</div>';
              }}
            />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              backgroundColor: '#e5e7eb', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#6b7280',
              fontSize: '12px'
            }}>
              Image
            </div>
          )}
        </div>
      );
    } else if (el.type === 'shape') {
      return (
        <div key={el.id} style={{
          ...baseStyle,
          backgroundColor: el.backgroundColor || '#3B82F6',
          borderRadius: el.borderRadius || 0,
          border: el.shapeStrokeWidth ? `${Math.max(0, el.shapeStrokeWidth)}px solid ${el.shapeStrokeColor || '#000'}` : 'none',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Basic shape rendering */}
          {el.shapeType === 'circle' && (
            <div style={{ 
              width: '80%', 
              height: '80%', 
              borderRadius: '50%', 
              backgroundColor: el.backgroundColor || '#3B82F6' 
            }} />
          )}
          {el.shapeType === 'rounded-rectangle' && (
            <div style={{ 
              width: '80%', 
              height: '80%', 
              borderRadius: '12px', 
              backgroundColor: el.backgroundColor || '#3B82F6' 
            }} />
          )}
          {el.shapeType === 'rectangle' && (
            <div style={{ 
              width: '80%', 
              height: '80%', 
              backgroundColor: el.backgroundColor || '#3B82F6' 
            }} />
          )}
          {!el.shapeType && (
            <div style={{ 
              width: '80%', 
              height: '80%', 
              backgroundColor: el.backgroundColor || '#3B82F6',
              borderRadius: el.borderRadius || 0
            }} />
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="relative"
      style={{
        width: template.canvasSize.width,
        height: template.canvasSize.height,
        backgroundColor: template.backgroundColor || '#ffffff',
        backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : undefined,
        backgroundSize: template.backgroundImageFit || "cover",
        backgroundPosition: template.backgroundImagePosition || "center",
        minWidth: '200px',
        minHeight: '150px',
        overflow: 'visible', // Changed from hidden to visible to show complete layout
        position: 'relative'
      }}
    >
      {template.elements && template.elements.length > 0 ? (
        template.elements.map(renderElement)
      ) : (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#6b7280',
          fontSize: '14px',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          Blank Template
        </div>
      )}
    </div>
  );
};

export const MenuBoardGallery: React.FC<MenuBoardGalleryProps> = ({
  templates,
  onSelectTemplate,
  onBack,
  selectedCanvasSize,
}) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<MenuBoardTemplate | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'burger': return 'from-red-500 to-red-600';
      case 'pizza': return 'from-orange-500 to-orange-600';
      case 'cafe': return 'from-amber-600 to-amber-700';
      case 'restaurant': return 'from-blue-600 to-blue-700';
      case 'fast-food': return 'from-yellow-500 to-yellow-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const handlePreviewClick = (template: MenuBoardTemplate) => {
    setIsPreviewLoading(true);
    setPreviewTemplate(null); // Clear previous preview
    setShowPreviewModal(true);
    setTimeout(() => {
      setPreviewTemplate(template);
      setIsPreviewLoading(false);
    }, 2000); // Extended loading time
  };

  const blankTemplate: MenuBoardTemplate = {
    id: 'blank',
    name: 'Blank Template',
    category: 'custom',
    preview: 'Start from scratch with an empty canvas',
    backgroundColor: '#ffffff',
    canvasSize: selectedCanvasSize,
    isHorizontal: selectedCanvasSize.isHorizontal,
    elements: [],
    groups: [],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Back to Display Selection</span>
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-xl font-semibold text-gray-900">
              Choose Template
            </h1>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Professional Display Templates
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl">
              Choose from professionally designed templates or start with a blank canvas to create your perfect digital display
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Blank Template Card */}
            <div
              className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 flex flex-col"
            >
              <div className="relative h-64 flex items-center justify-center bg-gray-100 border-4 border-dashed border-gray-300 text-gray-500">
                <Plus className="w-12 h-12" />
                <span className="absolute bottom-4 text-lg font-semibold">Start Blank</span>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Blank Template
                </h3>
                <p className="text-gray-600 text-sm mb-3 flex-grow">
                  Start from scratch with an empty canvas of your selected display size.
                </p>
                <div className="flex space-x-2 mt-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectTemplate(blankTemplate); }}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Edit className="w-5 h-5" />
                    <span>Start Editing</span>
                  </button>
                </div>
              </div>
            </div>

            {templates.map((template) => (
              <div
                key={template.id}
                className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2 flex flex-col"
              >
                {/* Template Preview (blank) */}
                <div
                  className="relative h-48 overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: template.backgroundColor }}
                >
                  <div className="text-gray-400 text-center">
                    <div className="text-4xl mb-2">📋</div>
                    <div className="text-sm font-medium">Template Preview</div>
                  </div>
                </div>

                {/* Template Info and Actions */}
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {template.name}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-0">
                      {template.preview}
                    </p>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePreviewClick(template); }}
                      className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Eye className="w-5 h-5" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelectTemplate(template); }}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Edit className="w-5 h-5" />
                      <span>Start Editing</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPreviewModal(false);
          }}
        >
          <div 
            className="relative bg-white rounded-lg shadow-2xl"
            style={{
              width: '90vw',
              height: '90vh',
              maxWidth: '1200px',
              maxHeight: '800px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-700 z-10 shadow-lg border-2 border-white"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {previewTemplate?.name || 'Loading Preview...'}
              </h3>
              <p className="text-sm text-gray-600">
                {previewTemplate?.preview || 'Please wait while we generate your preview'}
              </p>
            </div>

            <div className="flex-1 flex items-center justify-center bg-gray-50 p-6 overflow-hidden">
              {isPreviewLoading || !previewTemplate ? (
                <div 
                  className="flex items-center justify-center"
                  style={{ 
                    width: '600px', 
                    height: '400px',
                    minWidth: '600px',
                    minHeight: '400px'
                  }}
                >
                  <PreviewLoader />
                </div>
              ) : (
                <div 
                  className="flex items-center justify-center"
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: previewTemplate.canvasSize.width,
                      height: previewTemplate.canvasSize.height,
                      transform: `scale(${Math.min(
                        ((window.innerWidth * 0.9) - 120) / previewTemplate.canvasSize.width,
                        ((window.innerHeight * 0.9) - 200) / previewTemplate.canvasSize.height,
                        1
                      )})`,
                      transformOrigin: "center center",
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      backgroundColor: '#ffffff',
                      overflow: 'visible' // Allow content to extend beyond bounds
                    }}
                  >
                    <PreviewRenderer template={previewTemplate} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};