import React from 'react';
import { CanvasSize } from '../types/MenuBoard';
import { Monitor, Tablet, Smartphone, Square } from 'lucide-react';

interface CanvasSizeSelectorProps {
  sizes: CanvasSize[];
  selectedSize: CanvasSize | null;
  onSelectSize: (size: CanvasSize) => void;
}

export const CanvasSizeSelector: React.FC<CanvasSizeSelectorProps> = ({
  sizes,
  selectedSize,
  onSelectSize
}) => {
  const getIcon = (category: string) => {
    switch (category) {
      case 'tv': return <Monitor className="w-6 h-6" />;
      case 'tablet': return <Tablet className="w-6 h-6" />;
      case 'mobile': return <Smartphone className="w-6 h-6" />;
      default: return <Square className="w-6 h-6" />;
    }
  };

  const groupedSizes = sizes.reduce((acc, size) => {
    if (!acc[size.category]) {
      acc[size.category] = [];
    }
    acc[size.category].push(size);
    return acc;
  }, {} as Record<string, CanvasSize[]>);

  return (
    <div className="p-6 bg-white">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Canvas Size</h2>
      
      {Object.entries(groupedSizes).map(([category, sizesInCategory]) => (
        <div key={category} className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 capitalize flex items-center space-x-2">
            {getIcon(category)}
            <span>{category} Displays</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sizesInCategory.map((size) => (
              <button
                key={size.id}
                onClick={() => onSelectSize(size)}
                className={`p-4 border-2 rounded-lg transition-all duration-200 hover:shadow-lg ${
                  selectedSize?.id === size.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900 mb-1">{size.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {size.width} × {size.height}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{size.aspectRatio}</span>
                    <div 
                      className="w-12 h-8 border border-gray-300 rounded"
                      style={{
                        aspectRatio: size.width / size.height,
                        backgroundColor: selectedSize?.id === size.id ? '#3B82F6' : '#E5E7EB'
                      }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};