import React from 'react';
import { MenuBoardTemplate } from '../types/MenuBoard';
import { ChevronRight, Monitor, RotateCcw } from 'lucide-react';

interface TemplateSelectorProps {
  templates: MenuBoardTemplate[];
  onSelectTemplate: (template: MenuBoardTemplate) => void;
  onBack: () => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  onSelectTemplate,
  onBack
}) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'burger': return 'bg-red-500';
      case 'pizza': return 'bg-orange-500';
      case 'cafe': return 'bg-amber-600';
      case 'restaurant': return 'bg-blue-600';
      case 'fast-food': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Back to Canvas Selection</span>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Professional Menu Board Templates
            </h2>
            <p className="text-gray-600">
              Select a template that matches your restaurant style and customize it to your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                onClick={() => onSelectTemplate(template)}
              >
                {/* Template Preview */}
                <div 
                  className="h-48 relative overflow-hidden"
                  style={{ backgroundColor: template.backgroundColor }}
                >
                  {/* Simulate the template design */}
                  <div className="absolute inset-0 p-4">
                    {/* Show orientation indicator */}
                    <div className="absolute top-2 left-2 flex items-center space-x-1">
                      <Monitor className="w-4 h-4 text-white opacity-75" />
                      <span className="text-xs text-white opacity-75">
                        {template.isHorizontal ? 'Horizontal' : 'Vertical'}
                      </span>
                    </div>

                    {/* Category badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(template.category)}`}>
                        {template.category.toUpperCase()}
                      </span>
                    </div>

                    {/* Sample content based on template */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="text-white">
                        <h3 className="font-bold text-lg mb-1">Sample Menu Item</h3>
                        <p className="text-sm opacity-90 mb-2">Delicious description here</p>
                        <span className="text-yellow-300 font-bold text-xl">$12.99</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Template Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {template.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {template.preview}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{template.canvasSize.name}</span>
                        <span>•</span>
                        <span>{template.canvasSize.aspectRatio}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};