import React from 'react';
import { Loader2, Monitor, Palette, Utensils } from 'lucide-react';
import DSMOVILoader from './DSMOVILoader';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        {/* DS MOVI Loader */}
        <DSMOVILoader 
          size={size} 
          text={message} 
          showTips={true}
          showProgress={true}
        />
        
        {/* Additional loading text */}
        <div className="mt-6 space-y-2">
          <h2 className="text-xl font-semibold text-gray-700">Creating your perfect menu board...</h2>
          <p className="text-sm text-gray-500">Please wait while we prepare everything for you</p>
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

// Specialized loader for template loading
export const TemplateLoadingLoader: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <DSMOVILoader 
        size="lg" 
        text="Loading Templates..." 
        showTips={true}
        showProgress={true}
      />
      <div className="mt-6 space-y-2">
        <h2 className="text-xl font-semibold text-gray-700">Preparing your template gallery...</h2>
        <p className="text-sm text-gray-500">We're loading all the professional designs for you</p>
      </div>
    </div>
  </div>
);

// Specialized loader for saving
export const SaveLoader: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <DSMOVILoader 
        size="md" 
        text="Saving Template..." 
        showTips={true}
        showProgress={true}
      />
      <div className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-gray-700">Almost done!</h2>
        <p className="text-sm text-gray-500">Your design is being saved securely</p>
      </div>
    </div>
  </div>
);
