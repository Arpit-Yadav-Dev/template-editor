import React, { useState } from 'react';
import { CanvasSize } from '../types/MenuBoard';
import { Monitor, Tv, Tv2, TvOff, MonitorPlay, MonitorDot, Settings, Plus } from 'lucide-react';

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
  const [showCustomSize, setShowCustomSize] = useState(false);
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
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

  const handleCustomSize = () => {
    const width = parseInt(customWidth);
    const height = parseInt(customHeight);
    
    if (width > 0 && height > 0) {
      // Use exact dimensions as entered by user
      const customSize: CanvasSize = {
        id: `custom-${width}x${height}`,
        name: `Custom ${width}×${height}`,
        width: width,
        height: height,
        category: 'custom',
        isHorizontal: width > height
      };
      
      onSelectSize(customSize);
      setShowCustomSize(false);
      setCustomWidth('');
      setCustomHeight('');
    }
  };

  return (
    <div className="p-4 lg:p-8 xl:p-12 max-w-7xl mx-auto relative z-30" id="canvas-select-root">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mb-4 shadow-lg">
          <Monitor className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">Choose Your Display Size</h2>
        <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Select the perfect canvas size for your digital menu board. All sizes are optimized for professional displays.
        </p>
      </div>

      <div className="mb-12 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-4 lg:p-6 xl:p-8 border border-blue-100/50 shadow-xl relative z-50" id="canvas-select-orientation">
        <div className="text-center mb-6 lg:mb-8">
          <h3 className="text-lg lg:text-xl font-bold text-gray-800 mb-2">Display Orientation</h3>
          <p className="text-sm lg:text-base text-gray-600 max-w-2xl mx-auto">
            Choose how your TV will be mounted. Landscape is wider (like traditional TVs), Portrait is taller (like phone screens).
          </p>
        </div>
        <div className="flex justify-center">
          <div className="inline-flex rounded-xl lg:rounded-2xl border-2 border-gray-200 overflow-hidden bg-white shadow-xl max-w-full">
            <button
              className={`px-4 lg:px-8 py-3 lg:py-4 flex items-center space-x-2 lg:space-x-3 transition-colors duration-200 ${orientation === 'landscape' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50'}`}
              onClick={() => setOrientation('landscape')}
            >
              <MonitorPlay className="w-5 h-5 lg:w-6 lg:h-6" />
              <div className="text-left">
                <div className="font-bold text-sm lg:text-lg">Landscape</div>
                <div className="text-xs lg:text-sm opacity-90">Wide Screen (16:9)</div>
              </div>
            </button>
            <button
              className={`px-4 lg:px-8 py-3 lg:py-4 flex items-center space-x-2 lg:space-x-3 transition-colors duration-200 ${orientation === 'portrait' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50'}`}
              onClick={() => setOrientation('portrait')}
            >
              <MonitorDot className="w-5 h-5 lg:w-6 lg:h-6" />
              <div className="text-left">
                <div className="font-bold text-sm lg:text-lg">Portrait</div>
                <div className="text-xs lg:text-sm opacity-90">Tall Screen (9:16)</div>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-12 relative z-40" id="canvas-select-grid">
        {Object.entries(groupedSizes).map(([category, sizesInCategory]) => (
          <div key={category}>
            <div className="text-center mb-12 relative z-50">
              <div className="inline-flex items-center space-x-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-lg border border-gray-200/50">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  {getIcon(category)}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 capitalize">
                  {category} Display Options
                </h3>
              </div>
            </div>

            <div className={`grid gap-6 ${
              orientation === 'portrait' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}>
              {sizesInCategory.map((size) => {
                const currentWidth = orientation === 'portrait' ? size.height : size.width;
                const currentHeight = orientation === 'portrait' ? size.width : size.height;
                const isSelected = selectedSize?.id === size.id && selectedSize?.width === currentWidth;

                return (
                  <button
                    key={`${size.id}-${orientation}`}
                    onClick={() => onSelectSize(size)}
                    className={`group relative z-50 p-4 lg:p-6 border-2 rounded-2xl lg:rounded-3xl transition-colors duration-200 hover:shadow-2xl flex flex-col items-center justify-start ${orientation === 'portrait' ? 'min-h-[360px] lg:min-h-[420px]' : 'min-h-[280px] lg:min-h-[300px]'} ${
                      isSelected
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-2xl'
                        : 'border-gray-200 hover:border-blue-400 bg-white hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50'
                    }`}
                  >
                    <div className={`relative flex items-center justify-center mb-3 lg:mb-4 ${
                      orientation === 'portrait' ? 'w-32 h-56 lg:w-40 lg:h-72' : 'w-48 h-32 lg:w-56 lg:h-36'
                    }`}>
                      <div className={`absolute inset-0 border-2 rounded-xl lg:rounded-2xl transition-colors duration-200 ${
                        isSelected 
                          ? 'border-blue-500 bg-gradient-to-br from-blue-100 to-indigo-200' 
                          : 'border-gray-300 bg-gradient-to-br from-gray-100 to-gray-200'
                      }`} style={{
                        aspectRatio: orientation === 'portrait' ? '9/16' : '16/9'
                      }}>
                        <div className="absolute inset-2 rounded-lg lg:rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center p-2">
                          <div className="text-center leading-tight">
                            <div className="text-xs font-bold text-gray-700 mb-1 break-words">
                              {size.name.replace(' (1920×1080)', '').replace(' (1280×720)', '').replace(' (1366×768)', '')}
                            </div>
                            <div className="text-xs text-gray-600 font-medium break-words">
                              {currentWidth} × {currentHeight}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center px-2 flex-1 flex flex-col justify-center">
                      <div className="text-base lg:text-lg font-bold text-gray-900 mb-1 leading-tight break-words">{size.name}</div>
                      <div className="text-xs lg:text-sm text-gray-600 font-medium mb-2">
                        {orientation === 'landscape' ? 'Wide Screen' : 'Tall Screen'}
                      </div>
                      <div className="inline-flex items-center space-x-1 text-xs text-gray-500">
                        <div className={`w-2 h-2 rounded-full ${orientation === 'landscape' ? 'bg-green-400' : 'bg-purple-400'}`}></div>
                        <span>{orientation === 'landscape' ? '16:9 Aspect' : '9:16 Aspect'}</span>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Custom Size Section */}
      <div className="mt-16">
        <div className="text-center mb-12 relative z-50">
          <div className="inline-flex items-center space-x-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-2xl shadow-lg border border-gray-200/50">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 capitalize">
              Custom Size
            </h3>
          </div>
        </div>

        <div className="flex justify-center px-4 relative z-50">
          {!showCustomSize ? (
            <button
              onClick={() => setShowCustomSize(true)}
              className="group relative z-50 p-6 lg:p-8 border-2 border-dashed border-gray-300 rounded-2xl lg:rounded-3xl transition-colors duration-200 hover:shadow-2xl flex flex-col items-center justify-center hover:border-purple-400 bg-white hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 max-w-sm w-full"
            >
              <div className="relative w-40 h-28 lg:w-48 lg:h-32 flex items-center justify-center mb-4 lg:mb-6">
                <div className="absolute inset-0 border-2 border-dashed border-gray-300 rounded-xl lg:rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 group-hover:border-purple-400 group-hover:from-purple-50 group-hover:to-pink-50 transition-colors duration-200">
                  <div className="absolute inset-3 lg:inset-4 rounded-lg lg:rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <Plus className="text-gray-400 group-hover:text-purple-500 transition-colors" size={40} />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg lg:text-xl font-bold text-gray-900 mb-2">Custom Size</div>
                <div className="text-sm lg:text-base text-gray-600 font-medium">
                  Create your own dimensions
                </div>
              </div>
            </button>
          ) : (
            <div className="bg-white rounded-2xl lg:rounded-3xl p-6 lg:p-8 border-2 border-purple-200 shadow-2xl max-w-md w-full mx-4 relative z-50">
              <div className="text-center mb-6 lg:mb-8">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                </div>
                <h4 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">Enter Custom Dimensions</h4>
                <p className="text-xs lg:text-sm text-gray-600">Specify width and height in pixels</p>
              </div>
              
              <div className="space-y-4 lg:space-y-6">
                <div>
                  <label className="block text-xs lg:text-sm font-semibold text-gray-700 mb-2 lg:mb-3">Width (px)</label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    placeholder="e.g., 1920"
                    className="w-full px-3 lg:px-4 py-3 lg:py-4 border-2 border-gray-300 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-base lg:text-lg font-medium"
                    min="100"
                    max="8000"
                  />
                </div>
                
                <div>
                  <label className="block text-xs lg:text-sm font-semibold text-gray-700 mb-2 lg:mb-3">Height (px)</label>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    placeholder="e.g., 1080"
                    className="w-full px-3 lg:px-4 py-3 lg:py-4 border-2 border-gray-300 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-base lg:text-lg font-medium"
                    min="100"
                    max="8000"
                  />
                </div>
                
                <div className="flex space-x-3 lg:space-x-4 pt-2 lg:pt-4">
                  <button
                    onClick={handleCustomSize}
                    disabled={!customWidth || !customHeight || parseInt(customWidth) <= 0 || parseInt(customHeight) <= 0}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 lg:py-4 px-4 lg:px-6 rounded-lg lg:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm lg:text-base"
                  >
                    Create Custom Size
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomSize(false);
                      setCustomWidth('');
                      setCustomHeight('');
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 lg:py-4 px-4 lg:px-6 rounded-lg lg:rounded-xl transition-all duration-200 text-sm lg:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};