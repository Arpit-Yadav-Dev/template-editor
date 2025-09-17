import React from 'react';
import { Loader2, Monitor, Palette, Utensils } from 'lucide-react';

interface AppLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AppLoader: React.FC<AppLoaderProps> = ({ 
  message = "Loading...", 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        {/* Main loader with overlay effect */}
        <div className="mb-8">
          <div className={`${sizeClasses[size]} mx-auto relative`}>
            {/* Central icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Monitor size={iconSizes[size]} className="text-blue-600" />
            </div>
            
            {/* Rotating overlay ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 animate-spin"></div>
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
          <p className="text-gray-600">Creating your perfect menu board...</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center space-x-2 mt-6">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};

// Specialized loaders for different contexts
export const FrameLoader: React.FC = () => (
  <AppLoader message="Setting up your display..." size="lg" />
);

export const TemplateLoader: React.FC = () => (
  <AppLoader message="Loading templates..." size="md" />
);

export const PreviewLoader: React.FC = () => (
  <AppLoader message="Generating preview..." size="sm" />
);

export const EditorLoader: React.FC = () => (
  <AppLoader message="Opening editor..." size="lg" />
);
