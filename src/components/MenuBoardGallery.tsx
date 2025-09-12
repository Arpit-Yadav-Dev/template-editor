import React from 'react';
import { MenuBoardTemplate } from '../types/MenuBoard';
import { ChevronRight, Monitor, Smartphone } from 'lucide-react';

interface MenuBoardGalleryProps {
  templates: MenuBoardTemplate[];
  onSelectTemplate: (template: MenuBoardTemplate) => void;
}

export const MenuBoardGallery: React.FC<MenuBoardGalleryProps> = ({
  templates,
  onSelectTemplate
}) => {
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

  const groupedTemplates = templates.reduce((acc, template) => {
    const key = template.isHorizontal ? 'horizontal' : 'vertical';
    if (!acc[key]) acc[key] = [];
    acc[key].push(template);
    return acc;
  }, {} as Record<string, MenuBoardTemplate[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Digital Menu Board Templates
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose from our collection of professional menu board designs. 
            Perfect for restaurants, cafes, and food outlets.
          </p>
        </div>

        {/* Orientation Sections */}
        {Object.entries(groupedTemplates).map(([orientation, templateList]) => (
          <div key={orientation} className="mb-16">
            <div className="flex items-center space-x-3 mb-8">
              {orientation === 'horizontal' ? (
                <Monitor className="w-8 h-8 text-blue-600" />
              ) : (
                <Smartphone className="w-8 h-8 text-green-600" />
              )}
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {orientation} Layouts
              </h2>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {templateList.map((template) => (
                <div
                  key={template.id}
                  className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-2"
                  onClick={() => onSelectTemplate(template)}
                >
                  {/* Template Preview */}
                  <div className="relative h-64 overflow-hidden">
                    <div
                      className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundColor: template.backgroundColor }}
                    >
                      {/* Simulate template content */}
                      <div className="absolute inset-0 p-6">
                        {/* Category badge */}
                        <div className="absolute top-4 right-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getCategoryColor(template.category)}`}>
                            {template.category.toUpperCase()}
                          </span>
                        </div>

                        {/* Sample menu content */}
                        <div className="absolute bottom-6 left-6 right-6">
                          <div className="bg-black bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                            <h3 className="text-white font-bold text-lg mb-1">Sample Item</h3>
                            <p className="text-white text-sm opacity-90 mb-2">
                              Delicious menu description
                            </p>
                            <span className="text-yellow-300 font-bold text-xl">$12.99</span>
                          </div>
                        </div>

                        {/* Orientation indicator */}
                        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black bg-opacity-30 rounded-full px-3 py-1">
                          {template.isHorizontal ? (
                            <Monitor className="w-4 h-4 text-white" />
                          ) : (
                            <Smartphone className="w-4 h-4 text-white" />
                          )}
                          <span className="text-white text-xs font-medium">
                            {template.canvasSize.aspectRatio}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Template Info */}
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {template.name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3">
                          {template.preview}
                        </p>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            {template.canvasSize.name}
                          </span>
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            {template.elements.length} elements
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Call to Action */}
        <div className="text-center mt-16 p-8 bg-white rounded-2xl shadow-lg">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Need a Custom Design?
          </h3>
          <p className="text-gray-600 mb-6">
            Start with any template and customize it completely to match your brand
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <span>✓ Drag & Drop Editor</span>
            <span>✓ Custom Colors & Fonts</span>
            <span>✓ High-Resolution Export</span>
          </div>
        </div>
      </div>
    </div>
  );
};