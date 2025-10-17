import React, { useState, useEffect } from 'react';
import { ArrowLeft, Eye, Edit, Ruler, X, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { MenuBoardTemplate, MenuBoardElement, CanvasSize } from '../types/MenuBoard';
import AnimatedBackground from './AnimatedBackground';
import { apiService } from '../services/api';

interface MenuBoardGalleryProps {
  templates: MenuBoardTemplate[];
  onSelectTemplate: (template: MenuBoardTemplate) => void;
  onBack: () => void;
  onDeleteTemplate?: (template: MenuBoardTemplate) => void;
  selectedCanvasSize: CanvasSize;
  isAuthenticated?: boolean;
  isGuestMode?: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    user_type: string;
    createdAt: string;
  };
}

const PreviewRenderer: React.FC<{ template: MenuBoardTemplate }> = ({ template }) => {
  const renderElement = (el: MenuBoardElement) => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: el.x,
      top: el.y,
      width: Math.max(1, el.width),
      height: Math.max(1, el.height),
      transform: `rotate(${el.rotation || 0}deg)`,
      zIndex: el.zIndex || 1,
      opacity: Math.max(0.9, Math.min(1, el.opacity ?? 1)),
      boxShadow: el.shadow ?? 'none',
    };

    if (el.type === 'text' || el.type === 'price' || el.type === 'promotion') {
      return (
        <div key={el.id} style={{
          ...baseStyle,
          color: el.color || '#000',
          fontSize: Math.max(12, el.fontSize || 16),
          fontWeight: el.fontWeight || 'normal',
          fontFamily: el.fontFamily || 'Arial',
          textAlign: el.textAlign || 'left',
          whiteSpace: 'pre-line',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
          padding: '4px',
          lineHeight: '1.2',
          backgroundColor: el.backgroundColor || 'transparent',
          borderRadius: el.borderRadius || 0,
          textShadow: el.textStrokeWidth ? `${el.textStrokeWidth}px 0 0 ${el.textStrokeColor}, -${el.textStrokeWidth}px 0 0 ${el.textStrokeColor}, 0 ${el.textStrokeWidth}px 0 ${el.textStrokeColor}, 0 -${el.textStrokeWidth}px 0 ${el.textStrokeColor}` : 'none',
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
                opacity: 1
              }} 
              draggable={false}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
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
              fontSize: '14px',
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
      {template.elements
        .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
        .map(renderElement)}
    </div>
  );
};

export const MenuBoardGallery: React.FC<MenuBoardGalleryProps> = ({
  templates: _localTemplates, // Keep for backward compatibility but not used anymore
  onSelectTemplate,
  onBack,
  onDeleteTemplate,
  selectedCanvasSize,
  isAuthenticated = false,
  isGuestMode = false,
  user,
}) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<MenuBoardTemplate | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // API Templates State
  const [defaultTemplates, setDefaultTemplates] = useState<MenuBoardTemplate[]>([]);
  const [userTemplates, setUserTemplates] = useState<MenuBoardTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

  // Transform API response to MenuBoardTemplate
  const transformApiTemplate = (apiTemplate: any): MenuBoardTemplate | null => {
    try {
      // Parse the template_json if it exists
      let templateData = apiTemplate.template_json;
      if (typeof templateData === 'string') {
        templateData = JSON.parse(templateData);
      }

      // If we have full template data, use it
      if (templateData && templateData.elements) {
        return {
          ...templateData,
          id: apiTemplate.id,
          name: apiTemplate.name || templateData.name,
          preview: apiTemplate.description || templateData.preview || '',
          previewImageUrl: apiTemplate.thumbnail_url,
          // Mark template type for save logic
          isDefaultTemplate: apiTemplate.is_public === true,
          isUserTemplate: apiTemplate.is_public === false,
        };
      }

      // Otherwise, create a basic template with just the thumbnail
      return {
        id: apiTemplate.id,
        name: apiTemplate.name,
        category: apiTemplate.is_public ? 'Default' : 'Custom',
        preview: apiTemplate.description || '',
        backgroundColor: '#ffffff',
        canvasSize: selectedCanvasSize,
        isHorizontal: selectedCanvasSize.isHorizontal || false,
        elements: [],
        groups: [],
        previewImageUrl: apiTemplate.thumbnail_url,
        // Mark template type for save logic
        isDefaultTemplate: apiTemplate.is_public === true,
        isUserTemplate: apiTemplate.is_public === false,
      };
    } catch (error) {
      console.error('Error transforming template:', error, apiTemplate);
      return null;
    }
  };

  // Fetch templates from API
  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);

    try {
      // Fetch default templates (always available)
      const defaultResponse = await apiService.getDefaultTemplates(1, 50);
      
      if (defaultResponse.success && defaultResponse.data?.data?.templates) {
        const transformedDefault = defaultResponse.data.data.templates
          .map(transformApiTemplate)
          .filter((t: MenuBoardTemplate | null): t is MenuBoardTemplate => t !== null);
        setDefaultTemplates(transformedDefault);
      }

      // Fetch user templates if authenticated
      if (isAuthenticated && !isGuestMode) {
        const userResponse = await apiService.getUserTemplates(1, 50);
        
        if (userResponse.success && userResponse.data?.data?.templates) {
          const transformedUser = userResponse.data.data.templates
            .map(transformApiTemplate)
            .filter((t: MenuBoardTemplate | null): t is MenuBoardTemplate => t !== null);
          setUserTemplates(transformedUser);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplatesError('Failed to load templates. Please try again.');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [isAuthenticated, isGuestMode]);

  const handlePreviewClick = (template: MenuBoardTemplate) => {
    setIsPreviewLoading(true);
    setPreviewTemplate(template);
    setShowPreviewModal(true);
    // Simulate loading for preview rendering
    setTimeout(() => setIsPreviewLoading(false), 100);
  };

  // Handle template selection - fetch full template JSON
  const handleSelectTemplate = async (template: MenuBoardTemplate) => {
    setIsLoadingTemplate(true);
    
    try {
      // Check if template has an ID (from API)
      // UUIDs are 36 characters with hyphens, e.g., "69826b25-b831-4c74-a086-7768b8a859a0"
      const isApiTemplate = template.id && template.id.length > 20 && template.id.includes('-');
      
      if (isApiTemplate) {
        // Fetch complete template JSON from API
        const response = await apiService.getTemplateById(template.id);
        
        if (response.success && response.data?.data) {
          const fullTemplateData = response.data.data;
          
          // Parse template_json if it's a string
          let templateJson = fullTemplateData.template_json;
          if (typeof templateJson === 'string') {
            templateJson = JSON.parse(templateJson);
          }
          
          // If we have full template data, use it
          if (templateJson && templateJson.elements) {
            const completeTemplate: MenuBoardTemplate = {
              ...templateJson,
              id: fullTemplateData.id,
              name: fullTemplateData.name || templateJson.name,
              preview: fullTemplateData.description || templateJson.preview || '',
              previewImageUrl: fullTemplateData.thumbnail_url,
              // Preserve template type flags
              isDefaultTemplate: fullTemplateData.is_public === true,
              isUserTemplate: fullTemplateData.is_public === false,
            };
            onSelectTemplate(completeTemplate);
          } else {
            // If no template_json, use the basic template (with flags preserved)
            onSelectTemplate({
              ...template,
              isDefaultTemplate: template.isDefaultTemplate,
              isUserTemplate: template.isUserTemplate,
            });
          }
        } else {
          // If API call fails, use the template as-is
          console.error('Failed to fetch template details:', response.error);
          onSelectTemplate(template);
        }
      } else {
        // For local templates (blank, etc.), use directly
        onSelectTemplate(template);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      // Fallback to using template as-is
      onSelectTemplate(template);
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showPreviewModal) {
        setShowPreviewModal(false);
      }
    };

    if (showPreviewModal) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPreviewModal]);

  return (
    <AnimatedBackground>
      <div id="gallery-root" className="relative min-h-screen">
        {/* Loading Overlay - When loading template */}
        {isLoadingTemplate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Template...</h3>
                <p className="text-gray-600">
                  Fetching complete template data from the server
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Consistent Header */}
        <div className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-all duration-200 hover:bg-gray-100 px-3 py-2 rounded-lg group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Back to Canvas Selection</span>
              </button>
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <div className="text-white font-bold text-sm leading-tight">
                    <div>DS</div>
                    <div className="text-xs">MOVI</div>
                  </div>
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">Template Gallery</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {isAuthenticated ? `Welcome back, ${user?.name || user?.email}! Choose from your templates` : 
                     isGuestMode ? 'Choose from default templates (Guest Mode)' : 'Choose from professional designs'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4 flex-shrink-0">
              <div className="text-center">
                <div className="text-sm text-gray-500">Default Templates</div>
                <div className="text-lg font-bold text-blue-600">
                  {isLoadingTemplates ? '...' : defaultTemplates.length}
                </div>
              </div>
              {isAuthenticated && !isGuestMode && (
                <>
                  <div className="h-8 w-px bg-gray-300" />
                  <div className="text-center">
                    <div className="text-sm text-gray-500">My Templates</div>
                    <div className="text-lg font-bold text-emerald-600">
                      {isLoadingTemplates ? '...' : userTemplates.length}
                    </div>
                  </div>
                </>
              )}
              <button
                onClick={fetchTemplates}
                disabled={isLoadingTemplates}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Refresh templates"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoadingTemplates ? 'animate-spin' : ''}`} />
              </button>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">
                    {selectedCanvasSize.width} × {selectedCanvasSize.height}
                  </div>
                  <div className="text-xs text-gray-500">Canvas Size</div>
                </div>
                <div className={`px-3 py-2 rounded-lg text-sm font-medium shadow-sm ${
                  selectedCanvasSize.isHorizontal 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-violet-100 text-violet-800 border border-violet-200'
                }`}>
                  {selectedCanvasSize.isHorizontal ? 'Landscape' : 'Portrait'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-8 py-8">
        <div className="mb-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Choose Your Perfect Template
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Start with a professionally designed template or create from scratch. 
              All templates are optimized for your selected canvas size.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {templatesError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 flex items-center space-x-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">Error Loading Templates</h3>
              <p className="text-red-700">{templatesError}</p>
            </div>
            <button
              onClick={fetchTemplates}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Canvas Size Info */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Ruler className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Canvas Size</h3>
                <p className="text-gray-600">{selectedCanvasSize.width} × {selectedCanvasSize.height} pixels</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Aspect Ratio</div>
                <div className="font-semibold text-gray-900">
                  {Math.round(selectedCanvasSize.width / selectedCanvasSize.height * 100) / 100}:1
                </div>
              </div>
              <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                selectedCanvasSize.isHorizontal 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-violet-100 text-violet-800'
              }`}>
                {selectedCanvasSize.isHorizontal ? 'Landscape' : 'Portrait'}
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingTemplates && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 mb-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
              <p className="text-gray-600 text-lg font-medium">Loading templates...</p>
              <p className="text-gray-500 text-sm mt-2">Fetching your templates from the server</p>
            </div>
          </div>
        )}

        {/* User Templates Section - Show First if User is Authenticated */}
        {isAuthenticated && !isGuestMode && userTemplates.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                  <span>My Custom Templates</span>
                  <span className="bg-emerald-100 text-emerald-800 text-sm font-semibold px-3 py-1 rounded-full">
                    {userTemplates.length}
                  </span>
                </h2>
                <p className="text-gray-600 mt-1">Your saved templates, ready to edit and customize</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTemplates.map((template) => {
                return (
                  <div
                    key={template.id}
                    className="group bg-white rounded-2xl shadow-lg border-2 border-emerald-200 overflow-hidden hover:shadow-xl hover:border-emerald-400 transition-all duration-300 cursor-pointer flex flex-col"
                    style={{ height: '20rem' }}
                  >
                    {/* Template Preview */}
                    <div
                      className="relative overflow-hidden bg-gray-50 border-b border-gray-100"
                      style={{ 
                        backgroundColor: template.backgroundColor,
                        height: template.isHorizontal ? '10rem' : '14rem',
                        aspectRatio: template.isHorizontal ? '16/9' : '9/16'
                      }}
                      onClick={(e) => { e.stopPropagation(); handlePreviewClick(template); }}
                    >
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                        <div className="flex flex-col space-y-2">
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePreviewClick(template); }}
                              className="bg-white/90 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 shadow-lg hover:bg-white transition-colors flex items-center space-x-2"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Preview</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSelectTemplate(template); }}
                              className="bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg text-sm font-medium text-white shadow-lg transition-colors flex items-center space-x-2"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                          </div>
                          {onDeleteTemplate && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteTemplate(template); }}
                              className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-medium text-white shadow-lg transition-colors flex items-center space-x-2 justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete Template</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Template Preview - PNG Image */}
                      <div className="absolute inset-2 rounded-lg overflow-hidden shadow-inner">
                        <div 
                          className="w-full h-full relative bg-gray-100" 
                          style={{ 
                            aspectRatio: `${template.canvasSize.width} / ${template.canvasSize.height}`,
                            maxWidth: '100%',
                            maxHeight: '100%',
                            margin: 'auto'
                          }}
                        >
                          {template.previewImageUrl ? (
                            <img 
                              src={template.previewImageUrl}
                              alt={`${template.name} preview`}
                              className="w-full h-full object-contain"
                              style={{ display: 'block' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100">
                              <span className="text-emerald-600 text-sm font-medium">No Preview</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Template Badges */}
                      <div className="absolute top-2 left-2 flex flex-col space-y-1">
                        <div className="bg-emerald-500/90 text-white px-2 py-1 rounded-lg text-xs font-semibold">
                          My Template
                        </div>
                      </div>
                      
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <div className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-xs font-medium">
                          {template.elements?.length || 0}
                        </div>
                        <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          template.isHorizontal 
                            ? 'bg-green-500 text-white' 
                            : 'bg-purple-500 text-white'
                        }`}>
                          {template.isHorizontal ? 'L' : 'P'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Template Info */}
                    <div className="p-4 flex-1 flex flex-col justify-between bg-emerald-50/30">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {template.name}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {template.preview || 'Your custom template'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Default Templates Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                <span>Default Templates</span>
                <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                  {defaultTemplates.length}
                </span>
              </h2>
              <p className="text-gray-600 mt-1">Professional templates available to all users</p>
            </div>
          </div>

          <div id="gallery-template-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Blank Template Card */}
            <div
            id="gallery-blank-template"
            key="blank-template"
            className="group bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
            style={{ height: '20rem' }}
            onClick={() => {
              const blankTemplate: MenuBoardTemplate = {
                id: 'blank-' + Date.now(),
                name: 'Blank Template',
                category: 'Custom',
                preview: 'Start with a blank canvas',
                canvasSize: selectedCanvasSize,
                isHorizontal: selectedCanvasSize.isHorizontal || false,
                elements: [],
                groups: [],
                backgroundColor: '#ffffff',
              };
              handleSelectTemplate(blankTemplate);
            }}
          >
            {/* Blank Template Preview */}
            <div
              className="relative overflow-hidden bg-gray-50 border-b border-gray-100"
              style={{
                height: selectedCanvasSize.isHorizontal ? '10rem' : '14rem',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Start from Scratch</h3>
                  <p className="text-gray-600 text-sm">Create your own design</p>
                </div>
              </div>
            </div>

            {/* Template Info */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Blank Canvas</h3>
                <p className="text-gray-600 text-sm">Perfect for custom designs and creative freedom</p>
              </div>
            </div>
          </div>

          {defaultTemplates.map((template) => {
            return (
                <div
                  key={template.id}
              className="group bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
              style={{ height: '20rem' }}
                >
                  {/* Template Preview */}
              <div
                className="relative overflow-hidden bg-gray-50 border-b border-gray-100"
                style={{ 
                  backgroundColor: template.backgroundColor,
                  height: template.isHorizontal ? '10rem' : '14rem',
                  aspectRatio: template.isHorizontal ? '16/9' : '9/16'
                }}
                onClick={(e) => { e.stopPropagation(); handlePreviewClick(template); }}
              >
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePreviewClick(template); }}
                      className="bg-white/90 px-3 py-2 rounded-lg text-sm font-medium text-gray-800 shadow-lg hover:bg-white transition-colors flex items-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelectTemplate(template); }}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-medium text-white shadow-lg transition-colors flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Use</span>
                    </button>
                          </div>
                        </div>

                {/* Template Preview - PNG Image */}
                <div className="absolute inset-2 rounded-lg overflow-hidden shadow-inner">
                  <div 
                    className="w-full h-full relative bg-gray-100" 
                    style={{ 
                      aspectRatio: `${template.canvasSize.width} / ${template.canvasSize.height}`,
                      maxWidth: '100%',
                      maxHeight: '100%',
                      margin: 'auto'
                    }}
                  >
                    {template.previewImageUrl ? (
                      /* Show PNG preview if available */
                      <img 
                        src={template.previewImageUrl}
                        alt={`${template.name} preview`}
                        className="w-full h-full object-contain"
                        style={{ display: 'block' }}
                        onError={(e) => {
                          // Fallback to live preview if PNG fails
                          const target = e.target as HTMLImageElement;
                          const container = target.parentElement;
                          if (container) {
                            container.innerHTML = `
                              <div style="
                                position: absolute;
                                inset: 0;
                                transform: scale(${Math.min(400 / template.canvasSize.width, 320 / template.canvasSize.height)});
                                transform-origin: top left;
                                width: ${template.canvasSize.width}px;
                                height: ${template.canvasSize.height}px;
                                background-color: ${template.backgroundColor || '#ffffff'};
                                background-image: ${template.backgroundImage ? `url(${template.backgroundImage})` : 'none'};
                                background-size: cover;
                                background-position: center;
                              ">
                                <!-- Template elements will be rendered here -->
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      /* Show live preview - actual template content */
                      <div 
                        className="absolute inset-0"
                        style={{
                          transform: `scale(${Math.min(
                            (280 / template.canvasSize.width),
                            (160 / template.canvasSize.height)
                          )})`,
                          transformOrigin: 'center center',
                          width: template.canvasSize.width,
                          height: template.canvasSize.height,
                          backgroundColor: template.backgroundColor || '#ffffff',
                          backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          left: '50%',
                          top: '50%',
                          marginLeft: `-${template.canvasSize.width / 2}px`,
                          marginTop: `-${template.canvasSize.height / 2}px`,
                        }}
                      >
                        {template.elements
                          .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
                          .filter(element => {
                            // Skip very large background elements
                            if (element.type === 'shape' && element.width >= template.canvasSize.width * 0.9 && element.height >= template.canvasSize.height * 0.9) {
                              return false;
                            }
                            return true;
                          })
                          .slice(0, 12) // Show key elements
                          .map((element) => {
                            const baseStyle: React.CSSProperties = {
                              position: 'absolute',
                              left: element.x,
                              top: element.y,
                              width: Math.max(8, element.width),
                              height: Math.max(8, element.height),
                              transform: `rotate(${element.rotation || 0}deg)`,
                              zIndex: element.zIndex || 1,
                              opacity: Math.max(0.9, Math.min(1, element.opacity ?? 1)),
                            };

                            if (element.type === 'text' || element.type === 'price' || element.type === 'promotion') {
                              return (
                                <div key={element.id} style={{
                                  ...baseStyle,
                                  color: element.color || '#000',
                                  fontSize: Math.max(10, (element.fontSize || 16) * 0.6), // Larger font
                                  fontWeight: element.fontWeight || 'normal',
                                  fontFamily: element.fontFamily || 'Arial',
                                  textAlign: element.textAlign || 'left',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: element.textAlign === 'center' ? 'center' : element.textAlign === 'right' ? 'flex-end' : 'flex-start',
                                  padding: '2px',
                                  lineHeight: '1.2',
                                  backgroundColor: element.backgroundColor || 'rgba(255,255,255,0.8)',
                                  borderRadius: element.borderRadius || 0,
                                  border: '1px solid rgba(0,0,0,0.1)',
                                }}>
                                  {(element.content || '').substring(0, 10)}
                                </div>
                              );
                            } else if (element.type === 'image') {
                              return (
                                <div key={element.id} style={{
                                  ...baseStyle,
                                  borderRadius: Math.max(0, element.borderRadius || 0),
                                  overflow: 'hidden',
                                  backgroundColor: '#f8f9fa',
                                  border: '2px solid #dee2e6',
                                }}>
                                  {element.imageUrl ? (
                                    <img 
                                      src={element.imageUrl} 
                                      alt="" 
                                      style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'cover',
                                        opacity: 0.9
                                      }} 
                                      draggable={false}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      backgroundColor: '#e9ecef',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '8px',
                                      color: '#6c757d',
                                      fontWeight: 'bold'
                                    }}>
                                      📷
                                    </div>
                                  )}
                        </div>
                              );
                            } else if (element.type === 'shape') {
                              return (
                                <div key={element.id} style={{
                                  ...baseStyle,
                                  backgroundColor: element.backgroundColor || '#6c757d',
                                  borderRadius: element.shapeType === 'circle' ? '50%' : Math.max(0, element.borderRadius || 0),
                                  border: element.strokeWidth ? `${Math.max(2, element.strokeWidth * 0.5)}px solid ${element.strokeColor || '#000'}` : '2px solid rgba(0,0,0,0.2)',
                                }} />
                              );
                            }
                            return null;
                          })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Template Badges */}
                <div className="absolute top-2 left-2 flex flex-col space-y-1">
                  <div className="bg-blue-500/90 text-white px-2 py-1 rounded-lg text-xs font-semibold capitalize">
                    {template.category || 'Default'}
                  </div>
                </div>
                
                <div className="absolute top-2 right-2 flex space-x-1">
                  <div className="bg-blue-500 text-white px-2 py-1 rounded-lg text-xs font-medium">
                    {template.elements?.length || 0}
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    template.isHorizontal 
                      ? 'bg-green-500 text-white' 
                      : 'bg-purple-500 text-white'
                  }`}>
                    {template.isHorizontal ? 'L' : 'P'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Template Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {template.name}
                        </h3>
                  <p className="text-gray-600 text-sm">
                    {template.preview || 'Professional template ready for customization'}
                  </p>
                    </div>
                  </div>
                </div>
            );
          })}
          </div>
        </div>

        {/* Empty State - No Templates */}
        {!isLoadingTemplates && defaultTemplates.length === 0 && userTemplates.length === 0 && (
          <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Templates Found</h3>
              <p className="text-gray-600 mb-4">
                No templates are available at the moment. Start with a blank canvas or try refreshing.
              </p>
              <button
                onClick={fetchTemplates}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Templates</span>
              </button>
            </div>
          </div>
        )}
        </div>

        {/* Enhanced Preview Modal */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPreviewModal(false);
          }}
        >
          <div 
            className="relative bg-white rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden"
            style={{
              width: '95vw',
              height: '95vh',
              maxWidth: '1400px',
              maxHeight: '900px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl w-10 h-10 flex items-center justify-center z-10 shadow-lg transition-all duration-200 hover:scale-110"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 border-b border-gray-200/50 flex-shrink-0 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {previewTemplate?.name || 'Loading Preview...'}
          </h3>
                  <p className="text-gray-600 text-lg">
                    {previewTemplate?.preview || 'Please wait while we generate your preview'}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Canvas Size</div>
                    <div className="font-semibold text-gray-900">
                      {previewTemplate?.canvasSize.width} × {previewTemplate?.canvasSize.height}
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                    previewTemplate?.isHorizontal 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-violet-100 text-violet-800'
                  }`}>
                    {previewTemplate?.isHorizontal ? 'Landscape' : 'Portrait'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-8 overflow-hidden">
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
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
                    <p className="text-gray-600 text-lg font-medium">Loading preview...</p>
                    <p className="text-gray-500 text-sm mt-2">Please wait while we render your template</p>
                  </div>
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
                  {/* Show thumbnail if available, otherwise render live preview */}
                  {previewTemplate.previewImageUrl ? (
                    <div
                      style={{
                        maxWidth: '90%',
                        maxHeight: '90%',
                        border: '3px solid #e5e7eb',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
                        overflow: 'hidden',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <img
                        src={previewTemplate.previewImageUrl}
                        alt={`${previewTemplate.name} preview`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          display: 'block',
                        }}
                        onError={(e) => {
                          // If thumbnail fails, hide it and show live preview
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: previewTemplate.canvasSize.width,
                        height: previewTemplate.canvasSize.height,
                        transform: `scale(${Math.min(
                          ((window.innerWidth * 0.95) - 200) / previewTemplate.canvasSize.width,
                          ((window.innerHeight * 0.95) - 300) / previewTemplate.canvasSize.height,
                          1
                        )})`,
                        transformOrigin: "center center",
                        border: '3px solid #e5e7eb',
                        borderRadius: '16px',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
                        backgroundColor: '#ffffff',
                        overflow: 'visible'
                      }}
                    >
                      <PreviewRenderer template={previewTemplate} />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Click outside or press ESC to close
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Close Preview
                  </button>
                  <button
                    onClick={() => {
                      if (previewTemplate) {
                        setShowPreviewModal(false);
                        handleSelectTemplate(previewTemplate);
                      }
                    }}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Start Editing</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AnimatedBackground>
  );
};
