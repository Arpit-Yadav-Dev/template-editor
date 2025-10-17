import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowLeft } from 'lucide-react';

interface SaveSuccessModalProps {
  isOpen: boolean;
  action: 'saved' | 'updated';
  onComplete: () => void;
}

export const SaveSuccessModal: React.FC<SaveSuccessModalProps> = ({
  isOpen,
  action,
  onComplete,
}) => {
  const [countdown, setCountdown] = useState(5);
  const [phase, setPhase] = useState<'saving' | 'success'>('saving');

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      setPhase('saving');
      return;
    }

    // Show saving phase for 1 second
    const savingTimer = setTimeout(() => {
      setPhase('success');
    }, 1000);

    return () => clearTimeout(savingTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || phase !== 'success') return;

    // Start countdown
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, phase, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {phase === 'saving' ? (
          // Saving Phase
          <div className="p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {action === 'updated' ? 'Updating Template...' : 'Saving Template...'}
            </h3>
            <p className="text-gray-600">
              {action === 'updated' 
                ? 'Applying your changes and generating new thumbnail'
                : 'Creating your template and generating thumbnail'}
            </p>
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Saving template data...</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <span>Uploading thumbnail...</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                <span>Finalizing...</span>
              </div>
            </div>
          </div>
        ) : (
          // Success Phase
          <div>
            <div className="p-8 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {action === 'updated' ? 'Template Updated!' : 'Template Saved!'}
              </h3>
              <p className="text-gray-600 mb-6">
                {action === 'updated'
                  ? 'Your changes have been saved successfully'
                  : 'Your template has been created successfully'}
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center space-x-2 text-blue-800">
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-semibold">Redirecting to gallery in {countdown}s</span>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-1000 ease-linear"
                      style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <button
                onClick={onComplete}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Go to Gallery Now</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


