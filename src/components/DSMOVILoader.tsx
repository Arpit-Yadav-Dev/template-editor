import React, { useState, useEffect } from 'react';

interface DSMOVILoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  showTips?: boolean;
  showProgress?: boolean;
  duration?: number; // in milliseconds
}

const DSMOVILoader: React.FC<DSMOVILoaderProps> = ({ 
  size = 'md', 
  text = 'Loading...',
  showTips = true,
  showProgress = true,
  duration = 3000
}) => {
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  const tips = [
    "💡 Pro tip: Use keyboard shortcuts for faster editing!",
    "🎨 Try different color combinations for better contrast",
    "📱 Preview your design on different screen sizes",
    "✨ Add shadows and gradients for a professional look",
    "🔄 Use the duplicate feature to save time",
    "🎯 Group elements together for easier management",
    "📐 Use the grid and rulers for precise alignment",
    "🚀 Export in multiple formats for different uses"
  ];

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15; // Random increments for realistic feel
      });
    }, 100);

    // Tips rotation
    const tipsInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(tipsInterval);
    };
  }, [tips.length]);

  useEffect(() => {
    // Pulse animation for the main icon
    const pulseInterval = setInterval(() => {
      setIsAnimating(prev => !prev);
    }, 1500);

    return () => clearInterval(pulseInterval);
  }, []);
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24', 
    lg: 'w-32 h-32'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 max-w-md mx-auto">
      {/* DS MOVI Icon with Enhanced Animation */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden transform transition-transform duration-300 ${isAnimating ? 'scale-105' : 'scale-100'}`}>
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent animate-pulse"></div>
        
        {/* Floating particles inside icon */}
        <div className="absolute top-2 right-2 w-1 h-1 bg-white/80 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
        <div className="absolute bottom-2 left-2 w-1 h-1 bg-white/80 rounded-full animate-ping" style={{ animationDelay: '0.7s' }}></div>
        <div className="absolute top-1/2 left-1 w-0.5 h-0.5 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '1.4s' }}></div>
        
        {/* DS Text with subtle animation */}
        <div className="relative z-10 text-white font-bold transform transition-all duration-500" style={{ fontSize: size === 'sm' ? '1.5rem' : size === 'md' ? '2rem' : '2.5rem' }}>
          <span className="inline-block animate-pulse" style={{ animationDuration: '2s' }}>DS</span>
        </div>
        
        {/* MOVI Text */}
        <div className="relative z-10 text-white font-bold" style={{ fontSize: size === 'sm' ? '0.6rem' : size === 'md' ? '0.8rem' : '1rem' }}>
          MOVI
        </div>
        
        {/* Rotating border animation */}
        <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/50 animate-spin" style={{ animationDuration: '3s' }}></div>
        <div className="absolute inset-0 rounded-2xl border border-white/20 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}></div>
      </div>
      
      {/* Loading Text with Progress */}
      <div className="text-center space-y-3">
        {text && (
          <div className={`${textSizeClasses[size]} text-gray-700 font-medium`}>
            {text}
          </div>
        )}
        
        {/* Progress Bar */}
        {showProgress && (
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        )}
        
        {/* Progress Percentage */}
        {showProgress && (
          <div className="text-sm text-gray-500 font-medium">
            {Math.round(Math.min(progress, 100))}% Complete
          </div>
        )}
      </div>
      
      {/* Enhanced Loading Dots */}
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
        <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
      </div>
      
      {/* Rotating Tips */}
      {showTips && (
        <div className="text-center space-y-2">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">💡 Did You Know?</div>
          <div className="text-sm text-gray-600 font-medium min-h-[2.5rem] flex items-center justify-center px-4">
            <span className="animate-fade-in" key={currentTip}>
              {tips[currentTip]}
            </span>
          </div>
          <div className="flex justify-center space-x-1">
            {tips.map((_, index) => (
              <div 
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  index === currentTip ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              ></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DSMOVILoader;
