import React, { useState } from 'react';
import { ArrowLeft, Eye, Edit, Ruler } from 'lucide-react';
import { MenuBoardTemplate, MenuBoardElement } from '../types/MenuBoard';

interface CanvasSize {
  width: number;
  height: number;
  isHorizontal: boolean;
}

interface MenuBoardGalleryProps {
  templates: MenuBoardTemplate[];
  onSelectTemplate: (template: MenuBoardTemplate) => void;
  onBack: () => void;
  selectedCanvasSize: CanvasSize;
}

const PreviewRenderer: React.FC<{ template: MenuBoardTemplate }> = ({ template }) => {
  const renderElement = (el: MenuBoardElement) => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: el.x,
      top: el.y,
      width: Math.max(10, el.width),
      height: Math.max(10, el.height),
      transform: `rotate(${el.rotation || 0}deg)`,
      zIndex: el.zIndex || 1,
      opacity: Math.max(0.3, Math.min(1, el.opacity ?? 1)),
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
                opacity: 0.8
              }} 
              draggable={false}
            />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '100%', 
              backgroundColor: '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              IMG
            </div>
          )}
        </div>
      );
    } else if (el.type === 'shape') {
      return (
        <div key={el.id} style={{
          ...baseStyle,
          backgroundColor: el.backgroundColor || '#3B82F6',
          borderRadius: el.shapeType === 'circle' ? '50%' : Math.max(0, el.borderRadius || 0),
          border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.strokeColor || '#000'}` : 'none',
        }} />
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
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
      }}
    >
      {template.elements.map(renderElement)}
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

  const handlePreviewClick = (template: MenuBoardTemplate) => {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
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
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Canvas Selection</span>
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-xl font-semibold text-gray-900">Template Gallery</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {templates.length} templates available
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-sm font-medium text-gray-700">
                Canvas: {selectedCanvasSize.width}×{selectedCanvasSize.height}
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                selectedCanvasSize.isHorizontal 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {selectedCanvasSize.isHorizontal ? 'Landscape' : 'Portrait'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Choose Your Template
              </h2>
              <p className="text-gray-600">
                Select a professionally designed template to get started quickly
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Showing {templates.length} templates
              </div>
            </div>
          </div>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Canvas Size Info Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border border-blue-200">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Ruler className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Canvas Size</h3>
                <p className="text-sm text-gray-600">{selectedCanvasSize.width}×{selectedCanvasSize.height}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Dimensions:</span>
                <span className="font-medium">{selectedCanvasSize.width} × {selectedCanvasSize.height}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Aspect Ratio:</span>
                <span className="font-medium">{selectedCanvasSize.width}:{selectedCanvasSize.height}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Orientation:</span>
                <span className={`font-medium ${selectedCanvasSize.isHorizontal ? 'text-green-600' : 'text-purple-600'}`}>
                  {selectedCanvasSize.isHorizontal ? 'Landscape' : 'Portrait'}
                </span>
              </div>
            </div>
          </div>

          {templates.map((template) => (
            <div
              key={template.id}
              className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 hover:scale-[1.02] flex flex-col"
            >
              {/* Template Preview with Mini Render */}
              <div
                className="relative overflow-hidden cursor-pointer"
                style={{ 
                  backgroundColor: template.backgroundColor,
                  height: template.isHorizontal ? '12rem' : '16rem'
                }}
                onClick={(e) => { e.stopPropagation(); handlePreviewClick(template); }}
              >
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                  <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-gray-800 shadow-lg">
                    Click to Preview
                  </div>
                </div>
                
                {/* Mini Template Preview - Dynamic Aspect Ratio */}
                <div className="absolute inset-2 rounded-lg overflow-hidden bg-white shadow-inner">
                  <div 
                    className="w-full h-full relative" 
                    style={{ 
                      aspectRatio: `${template.canvasSize.width} / ${template.canvasSize.height}`,
                      maxWidth: '100%',
                      maxHeight: '100%',
                      margin: 'auto'
                    }}
                  >
                    <div 
                      className="relative w-full h-full"
                      style={{
                        transform: `scale(${Math.min(280 / template.canvasSize.width, 160 / template.canvasSize.height)})`,
                        transformOrigin: 'top left',
                        width: template.canvasSize.width,
                        height: template.canvasSize.height,
                      }}
                    >
                      {template.elements.slice(0, 12).map((element) => {
                        const baseStyle: React.CSSProperties = {
                          position: 'absolute',
                          left: element.x,
                          top: element.y,
                          width: Math.max(5, element.width),
                          height: Math.max(5, element.height),
                          transform: `rotate(${element.rotation || 0}deg)`,
                          zIndex: element.zIndex || 1,
                          opacity: Math.max(0.3, Math.min(1, element.opacity ?? 1)),
                        };

                        if (element.type === 'text' || element.type === 'price' || element.type === 'promotion') {
                          return (
                            <div key={element.id} style={{
                              ...baseStyle,
                              color: element.color || '#000',
                              fontSize: Math.max(8, element.fontSize || 16),
                              fontWeight: element.fontWeight || 'normal',
                              fontFamily: element.fontFamily || 'Arial',
                              textAlign: element.textAlign || 'left',
                              whiteSpace: 'pre-line',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: element.textAlign === 'center' ? 'center' : element.textAlign === 'right' ? 'flex-end' : 'flex-start',
                              padding: '2px',
                            }}>
                              {element.content || (element.type === 'price' ? '' : 'Sample Text')}
                            </div>
                          );
                        } else if (element.type === 'image') {
                          return (
                            <div key={element.id} style={{
                              ...baseStyle,
                              backgroundColor: '#f0f0f0',
                              borderRadius: Math.max(0, element.borderRadius || 0),
                              overflow: 'hidden',
                            }}>
                              {element.imageUrl ? (
                                <img 
                                  src={element.imageUrl} 
                                  alt="" 
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    opacity: 0.8
                                  }} 
                                  draggable={false}
                                />
                              ) : (
                                <div style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  backgroundColor: '#e5e7eb',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  color: '#6b7280'
                                }}>
                                  IMG
                                </div>
                              )}
                            </div>
                          );
                        } else if (element.type === 'shape') {
                          return (
                            <div key={element.id} style={{
                              ...baseStyle,
                              backgroundColor: element.backgroundColor || '#ccc',
                              borderRadius: element.shapeType === 'circle' ? '50%' : Math.max(0, element.borderRadius || 0),
                              border: element.strokeWidth ? `${element.strokeWidth}px solid ${element.strokeColor || '#000'}` : 'none',
                            }} />
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </div>

                {/* Template Category Badge */}
                <div className="absolute top-2 left-2 bg-white bg-opacity-90 px-2 py-1 rounded-full text-xs font-medium text-gray-700 capitalize">
                  {template.category}
                </div>
                
                {/* Enhanced Elements Count and Orientation Badge */}
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                    {template.elements.length} elements
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium shadow-sm ${
                    template.isHorizontal 
                      ? 'bg-green-500 text-white' 
                      : 'bg-purple-500 text-white'
                  }`}>
                    {template.isHorizontal ? 'Landscape' : 'Portrait'}
                  </div>
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

      {/* Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPreviewModal(false);
          }}
        >
          <div 
            className="relative bg-white rounded-lg shadow-2xl overflow-hidden"
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              width: 'auto',
              height: 'auto',
              aspectRatio: `${previewTemplate.canvasSize.width} / ${previewTemplate.canvasSize.height}`,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-gray-600 hover:text-gray-900 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex-1 flex items-center justify-center p-8">
              <div
                style={{
                  transform: `scale(${Math.min(
                    ((window.innerWidth * 0.9) - 120) / previewTemplate.canvasSize.width,
                    ((window.innerHeight * 0.9) - 200) / previewTemplate.canvasSize.height,
                    1
                  )})`,
                  transformOrigin: "center center",
                }}
              >
                <PreviewRenderer template={previewTemplate} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
