import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, AlertTriangle, X, RefreshCw } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  templateName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Generate random captcha code
const generateCaptcha = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like I, 1, O, 0
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  templateName,
  onConfirm,
  onCancel,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  
  // Generate captcha when modal opens
  useEffect(() => {
    if (isOpen) {
      setCaptchaCode(generateCaptcha());
    }
  }, [isOpen]);
  
  const isConfirmValid = confirmText.toUpperCase().trim() === captchaCode;

  // Reset text when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (isConfirmValid) {
      onConfirm();
      setConfirmText('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-200">
          <button
            onClick={() => {
              setConfirmText('');
              onCancel();
            }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Delete Template</h3>
              <p className="text-sm text-gray-500">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> You are about to permanently delete the template:
            </p>
            <p className="text-sm font-semibold text-red-900 mt-2 break-words">
              "{templateName}"
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              To confirm deletion, type the code below:
            </label>
            
            {/* Captcha-style code display */}
            <div className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-lg p-6 mb-3 relative overflow-hidden">
              {/* Background pattern for captcha effect */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.1) 10px, rgba(255,255,255,.1) 20px)',
                }}></div>
              </div>
              
              <div className="relative flex items-center justify-between">
                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Security Code</p>
                  <p className="text-4xl font-bold text-white font-mono tracking-widest select-none" 
                     style={{
                       textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                       letterSpacing: '0.3em',
                     }}>
                    {captchaCode}
                  </p>
                </div>
                
                <button
                  onClick={() => setCaptchaCode(generateCaptcha())}
                  className="ml-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  title="Generate new code"
                  type="button"
                >
                  <RefreshCw className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type the code above..."
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-xl text-center tracking-widest uppercase"
              autoFocus
              maxLength={6}
            />
            
            {confirmText && !isConfirmValid && (
              <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
                <span>✗</span>
                <span>Code doesn't match. Please try again.</span>
              </p>
            )}
            {isConfirmValid && (
              <p className="text-sm text-green-600 mt-2 flex items-center space-x-1 font-semibold">
                <span>✓</span>
                <span>Code verified - Ready to delete</span>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            onClick={() => {
              setConfirmText('');
              onCancel();
            }}
            className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmValid}
            className={`px-6 py-2.5 font-semibold rounded-lg transition-all flex items-center space-x-2 ${
              isConfirmValid
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Template</span>
          </button>
        </div>
      </div>
    </div>
  );
};

