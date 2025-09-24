import React from 'react';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'minimal' | 'intense';
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ 
  children, 
  variant = 'default' 
}) => {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0">
        {/* Geometric Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(90deg, rgba(59, 130, 246, 0.4) 1px, transparent 1px),
                linear-gradient(rgba(59, 130, 246, 0.4) 1px, transparent 1px),
                linear-gradient(45deg, rgba(99, 102, 241, 0.2) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px, 60px 60px, 120px 120px'
            }}
          />
        </div>

        {/* Canvas-like Floating Elements - Simplified for Performance */}
        <div className="absolute inset-0">
          {/* Corner Canvas Elements - Top Left */}
          <div className="absolute top-4 left-4 w-20 h-16 bg-white/15 backdrop-blur-sm border border-blue-500/25 rounded-lg animate-float-slow shadow-lg" 
               style={{ animationDelay: '0s' }}>
            <div className="w-full h-full bg-gradient-to-br from-blue-500/15 to-transparent rounded-lg"></div>
          </div>
          
          {/* Corner Canvas Elements - Bottom Right */}
          <div className="absolute bottom-4 right-4 w-22 h-16 bg-white/15 backdrop-blur-sm border border-purple-500/25 rounded-xl animate-float-slow shadow-lg" 
               style={{ animationDelay: '3s' }}>
            <div className="w-full h-full bg-gradient-to-tl from-purple-500/15 to-transparent rounded-xl"></div>
          </div>
          
          {/* Large Canvas Frames - Reduced for Performance */}
          <div className="absolute top-1/4 left-1/6 w-32 h-24 bg-white/8 backdrop-blur-sm border-2 border-indigo-500/15 rounded-2xl animate-spin-slow shadow-xl" 
               style={{ animationDuration: '40s' }}>
            <div className="absolute inset-2 bg-gradient-to-br from-indigo-500/3 to-transparent rounded-xl"></div>
          </div>
          
          {/* Floating Design Tools - Simplified */}
          <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-blue-500/15 rounded-full animate-bounce-slow shadow-lg" 
               style={{ animationDelay: '0.5s' }}>
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
          </div>
          
          {/* Corner Decorative Elements - Simplified */}
          <div className="absolute top-2 right-2 w-4 h-4 border-2 border-blue-500/40 rounded-full animate-ping" 
               style={{ animationDelay: '0.8s' }} />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-2 border-purple-500/40 rounded-full animate-ping" 
               style={{ animationDelay: '2.2s' }} />
          
          {/* Right Side Balanced Elements - Minimal for Performance */}
          <div className="absolute top-1/4 right-8 w-12 h-8 bg-white/8 backdrop-blur-sm border border-indigo-500/15 rounded-lg animate-float-slow shadow-sm" 
               style={{ animationDelay: '2s' }}>
            <div className="w-full h-full bg-gradient-to-l from-indigo-500/8 to-transparent rounded-lg"></div>
          </div>
        </div>

        {/* Gradient overlays for depth - Simplified */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-50/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
    </div>
  );
};

export default AnimatedBackground;
