import React from 'react';
import { CanvasSize } from '../types/MenuBoard';
import { Monitor, Tv, Tv2, TvOff, MonitorPlay, MonitorDot } from 'lucide-react';

interface CanvasSizeSelectorProps {
  sizes: CanvasSize[];
  selectedSize: CanvasSize | null;
  onSelectSize: (size: CanvasSize) => void;
  orientation: 'landscape' | 'portrait';
  setOrientation: (orientation: 'landscape' | 'portrait') => void;
}

export const CanvasSizeSelector: React.FC<CanvasSizeSelectorProps> = ({
  sizes,
  selectedSize,
  onSelectSize,
  orientation,
  setOrientation,
}) => {
  const getIcon = (category: string) => {
    switch (category) {
      case 'tv': return <Monitor className="w-6 h-6" />;
      default: return <Monitor className="w-6 h-6" />;
    }
  };

  const maybeRotate = (size: CanvasSize): CanvasSize => {
    if (orientation === 'portrait' && size.width > size.height) {
      return { ...size, width: size.height, height: size.width };
    }
    if (orientation === 'landscape' && size.width < size.height) {
      return { ...size, width: size.height, height: size.width };
    }
    return size;
  };

  const groupedSizes = sizes.reduce((acc, original) => {
    const size = maybeRotate(original);
    if (!acc[size.category]) {
      acc[size.category] = [];
    }
    acc[size.category].push(size);
    return acc;
  }, {} as Record<string, CanvasSize[]>);

  return (
    <div className="p-10">
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Choose Your Display</h2>
        <p className="text-base text-gray-600">Select the perfect size for your digital menu board</p>
      </div>

      <div className="mb-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">Display Orientation</h3>
          <div className="text-sm text-gray-600">Choose how your display will be mounted</div>
        </div>
        <div className="flex justify-center">
          <div className="inline-flex rounded-2xl border-2 border-gray-200 overflow-hidden bg-white shadow-lg">
            <button
              className={`px-8 py-4 flex items-center space-x-3 transition-all duration-300 ${orientation === 'landscape' ? 'bg-blue-600 text-white shadow-lg transform scale-105' : 'bg-white text-gray-700 hover:bg-blue-50 hover:scale-105'}`}
              onClick={() => setOrientation('landscape')}
            >
              <MonitorPlay className="w-6 h-6" />
              <span className="font-semibold text-lg">Landscape</span>
            </button>
            <button
              className={`px-8 py-4 flex items-center space-x-3 transition-all duration-300 ${orientation === 'portrait' ? 'bg-blue-600 text-white shadow-lg transform scale-105' : 'bg-white text-gray-700 hover:bg-blue-50 hover:scale-105'}`}
              onClick={() => setOrientation('portrait')}
            >
              <MonitorDot className="w-6 h-6" />
              <span className="font-semibold text-lg">Portrait</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-8">
        {Object.entries(groupedSizes).map(([category, sizesInCategory]) => (
          <div key={category}>
            <div className="flex items-center justify-center mb-8">
              <h3 className="text-xl font-bold text-gray-800 capitalize flex items-center space-x-3">
                {getIcon(category)}
                <span>{category} Display Options</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sizesInCategory.map((size) => {
                const currentWidth = orientation === 'portrait' ? size.height : size.width;
                const currentHeight = orientation === 'portrait' ? size.width : size.height;
                const isSelected = selectedSize?.id === size.id && selectedSize?.width === currentWidth;

                return (
                  <button
                    key={`${size.id}-${orientation}`}
                    onClick={() => onSelectSize(size)}
                    className={`group relative p-8 border-3 rounded-3xl transition-all duration-500 hover:shadow-2xl flex flex-col items-center justify-center transform hover:-translate-y-2 ${
                      isSelected
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-2xl scale-105'
                        : 'border-gray-200 hover:border-blue-400 bg-white hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50'
                    }`}
                  >
                    <div className="relative w-56 h-36 flex items-center justify-center mb-6">
                      <Tv className={`absolute text-gray-300 ${orientation === 'portrait' ? 'rotate-90' : ''}`} size={140} />
                      <div className={`absolute flex items-center justify-center text-center ${orientation === 'portrait' ? 'inset-6' : 'inset-4'}`}>
                        <div className="text-sm font-bold text-gray-800">
                          {size.name.replace(' (1920×1080)', '').replace(' (1280×720)', '').replace(' (1366×768)', '')}
                          <div className="text-xs text-gray-600 mt-1 font-normal">
                            {currentWidth} × {currentHeight}px
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-xl font-bold text-gray-900">{size.name}</span>
                      <div className="text-base text-gray-600 mt-2 font-medium">
                        {orientation === 'landscape' ? 'Wide Screen' : 'Tall Screen'}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-4 right-4 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};