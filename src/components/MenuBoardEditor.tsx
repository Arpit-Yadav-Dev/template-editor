import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Save,
  Download,
  Eye,
  Type,
  Image as ImageIcon,
  Square,
  DollarSign,
  Trash2,
  Copy,
  CopyPlus,
  Clipboard,
  Plus,
  Minus,
  Bold as BoldIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Circle as CircleIcon,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Upload,
  Layers,
  ArrowUp,
  ArrowDown,
  Zap,
  Grid3X3,
  Ruler,
  AlignLeft,
  AlignCenter,
  HelpCircle,
  AlignRight,
  AlignCenterVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Group,
  Ungroup,
  EyeOff,
  X,
} from 'lucide-react';
import domToImage from 'dom-to-image';
import { MenuBoardElement, MenuBoardTemplate, MenuBoardGroup, SelectionRectangle } from '../types/MenuBoard';
import { canvasSizes } from '../data/canvasSizes';
import ImageLibraryPanel from './ImageLibraryPanel';

type DragOffsets = Record<string, { dx: number; dy: number }>;

interface MenuBoardEditorProps {
  template: MenuBoardTemplate;
  onBack: () => void;
  onSave: (template: MenuBoardTemplate, options?: { thumbnailBlob?: Blob }) => void;
}

const DEG = '\u00B0';

export const MenuBoardEditor: React.FC<MenuBoardEditorProps> = ({
  template: initialTemplate,
  onBack,
  onSave,
}) => {
  // Thumbnail export settings (adjust as needed)
  // THUMBNAIL_PIXEL_RATIO: render scale for capture (higher = sharper, larger)
  // THUMBNAIL_MAX_EDGE: downscale longest edge to this size to keep file small
  const THUMBNAIL_PIXEL_RATIO = 2; // change to 1..3 to adjust sharpness/size
  const THUMBNAIL_MAX_EDGE = 1200; // change to adjust preview size/weight
  // Core state
  const [template, setTemplate] = useState<MenuBoardTemplate>(initialTemplate);
  const templateRef = useRef(template);
  useEffect(() => {
    if (template) {
    templateRef.current = template;
    }
  }, [template]);

  const [history, setHistory] = useState<MenuBoardTemplate[]>([initialTemplate]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionRect, setSelectionRect] = useState<SelectionRectangle | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Zoom & viewport
  const [zoom, setZoom] = useState(0.50);
  const innerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Snap & guides
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToGuides] = useState(true);
  const [guides, setGuides] = useState<Array<{ id: string; type: 'vertical' | 'horizontal'; position: number }>>([]);

  // File inputs
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const cssInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgUploadRef = useRef<HTMLInputElement>(null);

  // Pointer/drag/resize
  const isPointerDownRef = useRef(false);
  const dragOffsetsRef = useRef<DragOffsets>({});
  const activeResizeRef = useRef<{ id: string; corner: 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr' } | null>(null);
  const dragStartSnapshotRef = useRef<MenuBoardTemplate | null>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const [clipboard, setClipboard] = useState<MenuBoardElement[]>([]);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [smartGuides, setSmartGuides] = useState<Array<{ type: 'vertical' | 'horizontal'; position: number; color: string }>>([]);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showTemplateSettings, setShowTemplateSettings] = useState(false);
  const [shapeColor, setShapeColor] = useState<string>('#3B82F6');
  const [shapeStrokeColor, setShapeStrokeColor] = useState<string>('transparent');
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState<number>(0);
  


  const activeRotateRef = useRef<{ id: string } | null>(null);
  const activeGroupDragRef = useRef<{ id: string; startX: number; startY: number; groupCenterX: number; groupCenterY: number; initialElements: Array<{id: string, x: number, y: number}> } | null>(null);
  // Preview
  const [showPreview, setShowPreview] = useState(false);
  
  // Import help
  const [showImportHelp, setShowImportHelp] = useState(false);
  
  // Import loading state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  
  // Download loading state
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Image library panel
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [imageLibraryContext, setImageLibraryContext] = useState<'new-element' | 'existing-element' | 'shape-image'>('new-element');
  const [imageLibraryTargetId, setImageLibraryTargetId] = useState<string | null>(null);
  
  // Debug function to test canvas state
  const debugCanvas = () => {
    const template = templateRef.current;
    const canvas = innerRef.current;
    
    console.log('=== CANVAS DEBUG ===');
    console.log('Template:', template);
    console.log('Canvas element:', canvas);
    console.log('Canvas children:', canvas?.children.length);
    console.log('Canvas size:', {
      width: canvas?.offsetWidth,
      height: canvas?.offsetHeight,
      clientWidth: canvas?.clientWidth,
      clientHeight: canvas?.clientHeight
    });
    console.log('Template elements count:', template?.elements.length);
    console.log('Selected elements:', selectedIds.length);
    
    // Check for broken images
    const images = canvas?.querySelectorAll('img') || [];
    const brokenImages: string[] = [];
    const workingImages: string[] = [];
    
    images.forEach(img => {
      if (!img.complete || img.naturalWidth === 0) {
        brokenImages.push(img.src);
        console.log('Broken image:', img.src);
      } else {
        workingImages.push(img.src);
        console.log('Working image:', img.src);
      }
    });
    
    console.log('Images summary:', { total: images.length, broken: brokenImages.length, working: workingImages.length });
    console.log('===================');
    
    let debugMessage = `Canvas Debug:\n• Template loaded: ${!!template}\n• Canvas element: ${!!canvas}\n• Canvas children: ${canvas?.children.length || 0}\n• Template elements: ${template?.elements.length || 0}\n• Canvas size: ${canvas?.offsetWidth}x${canvas?.offsetHeight}\n• Total images: ${images.length}\n• Working images: ${workingImages.length}\n• Broken images: ${brokenImages.length}`;
    
    if (brokenImages.length > 0) {
      debugMessage += `\n\n⚠️ Broken Images Found:\n${brokenImages.slice(0, 3).join('\n')}${brokenImages.length > 3 ? `\n... and ${brokenImages.length - 3} more` : ''}`;
    }
    
    debugMessage += '\n\nCheck browser console for details.';
    
    alert(debugMessage);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateElement(id, { imageUrl: reader.result as string }, true);
    };
    reader.readAsDataURL(file);

    e.target.value = ""; // reset input so same file can be reselected later
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = { ...templateRef.current, backgroundImage: reader.result as string };
      setTemplate(next);
      templateRef.current = next;
      commitHistory(next);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };


  // Copy/Paste functionality
  const copySelectedElements = () => {
    if (selectedIds.length === 0) return;
    const elementsToCopy = template.elements.filter(el => selectedIds.includes(el.id));
    setClipboard(elementsToCopy);
  };

  const pasteElements = () => {
    if (clipboard.length === 0) return;
    
    const newElements = clipboard.map(el => ({
      ...el,
      id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: el.x + 20, // Offset pasted elements
      y: el.y + 20,
    }));

    const next = {
      ...templateRef.current,
      elements: [...template.elements, ...newElements]
    };
    setTemplate(next);
    templateRef.current = next;
    setSelectedIds(newElements.map(el => el.id));
    commitHistory();
  };

  const duplicateSelectedElements = () => {
    if (selectedIds.length === 0) return;
    
    const elementsToDuplicate = templateRef.current.elements.filter(el => selectedIds.includes(el.id));
    const newElements = elementsToDuplicate.map(el => ({
      ...el,
      id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: el.x + 20, // Offset by 20px
      y: el.y + 20, // Offset by 20px
    }));
    
    setTemplate(prev => ({
      ...prev,
      elements: [...prev.elements, ...newElements]
    }));
    
    // Select the new elements
    setSelectedIds(newElements.map(el => el.id));
    templateRef.current = { ...templateRef.current, elements: [...templateRef.current.elements, ...newElements] };
    commitHistory();
  };

  const nudgeElements = (dx: number, dy: number) => {
    if (selectedIds.length === 0) return;
    const next = {
      ...templateRef.current,
      elements: template.elements.map(el => 
        selectedIds.includes(el.id) 
          ? { ...el, x: el.x + dx, y: el.y + dy }
          : el
      )
    };
    setTemplate(next);
    templateRef.current = next;
    commitHistory();
  };

  // Smart guides system
  const generateSmartGuides = (draggedElement: MenuBoardElement) => {
    const guides: Array<{ type: 'vertical' | 'horizontal'; position: number; color: string }> = [];
    const snapThreshold = 8; // pixels
    
    // Get all other elements
    const otherElements = template.elements.filter(el => el.id !== draggedElement.id);
    
    otherElements.forEach(el => {
      // Vertical guides (x positions)
      const leftX = el.x;
      const centerX = el.x + el.width / 2;
      const rightX = el.x + el.width;
      
      // Check if dragged element aligns with any vertical positions
      if (Math.abs(draggedElement.x - leftX) < snapThreshold) {
        guides.push({ type: 'vertical', position: leftX, color: '#FF6B6B' });
      }
      if (Math.abs(draggedElement.x + draggedElement.width / 2 - centerX) < snapThreshold) {
        guides.push({ type: 'vertical', position: centerX, color: '#FF6B6B' });
      }
      if (Math.abs(draggedElement.x + draggedElement.width - rightX) < snapThreshold) {
        guides.push({ type: 'vertical', position: rightX, color: '#FF6B6B' });
      }
      
      // Horizontal guides (y positions)
      const topY = el.y;
      const centerY = el.y + el.height / 2;
      const bottomY = el.y + el.height;
      
      // Check if dragged element aligns with any horizontal positions
      if (Math.abs(draggedElement.y - topY) < snapThreshold) {
        guides.push({ type: 'horizontal', position: topY, color: '#FF6B6B' });
      }
      if (Math.abs(draggedElement.y + draggedElement.height / 2 - centerY) < snapThreshold) {
        guides.push({ type: 'horizontal', position: centerY, color: '#FF6B6B' });
      }
      if (Math.abs(draggedElement.y + draggedElement.height - bottomY) < snapThreshold) {
        guides.push({ type: 'horizontal', position: bottomY, color: '#FF6B6B' });
      }
    });
    
    return guides;
  };

  // Text presets
  const textPresets = [
    {
      name: "Bold Headline",
      properties: {
        fontWeight: "bold",
        fontSize: 24,
        color: "#1F2937",
        textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
        textGradient: "none" as const,
      }
    },
    {
      name: "Gradient Title",
      properties: {
        fontWeight: "bold",
        fontSize: 20,
        textGradient: "linear" as const,
        textGradientColors: ["#FF6B6B", "#4ECDC4"],
        textGradientDirection: 45,
        textShadow: "none",
      }
    },
    {
      name: "Elegant Text",
      properties: {
        fontWeight: "300",
        fontSize: 16,
        color: "#374151",
        textStrokeColor: "#FFFFFF",
        textStrokeWidth: 1,
        textShadow: "1px 1px 2px rgba(0,0,0,0.2)",
        textGradient: "none" as const,
      }
    },
    {
      name: "Neon Glow",
      properties: {
        fontWeight: "bold",
        fontSize: 18,
        color: "#00FFFF",
        textShadow: "0 0 5px #00FFFF, 0 0 10px #00FFFF",
        textGradient: "none" as const,
      }
    },
    {
      name: "Gold Luxury",
      properties: {
        fontWeight: "bold",
        fontSize: 20,
        textGradient: "linear" as const,
        textGradientColors: ["#FFD700", "#FFA500"],
        textGradientDirection: 90,
        textStrokeColor: "#B8860B",
        textStrokeWidth: 1,
        textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
      }
    }
  ];

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.export-dropdown')) {
          setShowExportDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      if (isCtrlOrCmd) {
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault();
            copySelectedElements();
            break;
          case 'v':
            e.preventDefault();
            pasteElements();
            break;
          case 'd':
            e.preventDefault();
            duplicateSelectedElements();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'a':
            e.preventDefault();
            setSelectedIds(template.elements.map(el => el.id));
            break;
          case 'g':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              if (e.shiftKey) {
                ungroupElements();
              } else {
                groupElements();
              }
            }
            break;
          case 's':
            e.preventDefault();
            onSave(templateRef.current);
            break;
          case 'f':
            e.preventDefault();
            setShowPreview(!showPreview);
            break;
          case '1':
            e.preventDefault();
            setZoom(1);
            break;
          case '2':
            e.preventDefault();
            setZoom(2);
            break;
          case '0':
            e.preventDefault();
            setZoom(0.5);
            break;
        }
      } else {
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            if (selectedIds.length > 0) {
              deleteSelected();
            }
            break;
          case 'Escape':
            setSelectedIds([]);
            break;
          // Function keys
          case 'F1':
            e.preventDefault();
            setShowKeyboardHelp(!showKeyboardHelp);
            break;
          case 'F2':
            e.preventDefault();
            setShowTemplateSettings(true);
            break;
          case 'F3':
            e.preventDefault();
            setShowGrid(!showGrid);
            break;
          case 'F4':
            e.preventDefault();
            setShowRulers(!showRulers);
            break;
          case 'F5':
            e.preventDefault();
            setSnapToGrid(!snapToGrid);
            break;
          case 'F11':
            e.preventDefault();
            handleDownloadImage();
            break;
          case 'F12':
            e.preventDefault();
            handleExportJson();
            break;
          // Number keys for quick element creation
          case '1':
            e.preventDefault();
            addElement('text');
            break;
          case '2':
            e.preventDefault();
            addElement('image');
            break;
          case '3':
            e.preventDefault();
            addElement('price');
            break;
          case '4':
            e.preventDefault();
            addShape('rectangle');
            break;
          case '5':
            e.preventDefault();
            addElement('promotion');
            break;
          case '6':
            e.preventDefault();
            addShape('circle');
            break;
          case '7':
            e.preventDefault();
            addShape('star');
            break;
          case '8':
            e.preventDefault();
            addShape('heart');
            break;
          case '9':
            e.preventDefault();
            addShape('diamond');
            break;
          case 'ArrowUp':
            e.preventDefault();
            nudgeElements(0, -1);
            break;
          case 'ArrowDown':
            e.preventDefault();
            nudgeElements(0, 1);
            break;
          case 'ArrowLeft':
            e.preventDefault();
            nudgeElements(-1, 0);
            break;
          case 'ArrowRight':
            e.preventDefault();
            nudgeElements(1, 0);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, clipboard, template.elements]);


  // RGB to Hex converter
  const rgbToHex = (rgb: string) => {
    if (!rgb.startsWith('rgb')) return rgb;
    const [r, g, b] = rgb.match(/\d+/g)?.map(Number) || [0, 0, 0];
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  };

  // Normalize color format to #rrggbb
  const normalizeColor = (color: string) => {
    if (!color) return '#000000';
    if (color.startsWith('#')) {
      // Convert #rgb to #rrggbb
      if (color.length === 4) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
      }
      // Ensure 6-digit hex
      if (color.length === 7) return color;
    }
    // Convert rgb() to hex
    if (color.startsWith('rgb')) {
      return rgbToHex(color);
    }
    return '#000000';
  };

  // Safe numeric input handler
  const safeParseInt = (value: string, defaultValue: number = 0, min?: number, max?: number): number => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return defaultValue;
    if (min !== undefined && parsed < min) return min;
    if (max !== undefined && parsed > max) return max;
    return parsed;
  };

  // Safe color input handler
  const safeColorUpdate = (value: string): string => {
    if (!value) return '#000000';
    const normalized = normalizeColor(value);
    // Validate hex color format
    if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) return '#000000';
    return normalized;
  };

  // Safe gradient colors handler
  const safeGradientColors = (colors: string[] | undefined): string[] => {
    if (!colors || !Array.isArray(colors) || colors.length === 0) {
      return ['#FF0000', '#0000FF'];
    }
    return colors.map(color => safeColorUpdate(color)).filter(color => color !== '#000000' || colors.includes('#000000'));
  };

  // Perfect Import System with Barriers
  const validateHtmlStructure = (htmlText: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    console.log('🔍 Validating HTML structure...');
    
    // Barrier 1: Must have proper DOCTYPE
    const hasDoctype = htmlText.includes('<!DOCTYPE html>');
    console.log('Barrier 1 - DOCTYPE:', hasDoctype);
    if (!hasDoctype) {
      errors.push('❌ Missing DOCTYPE declaration. Must start with <!DOCTYPE html>');
    }
    
    // Barrier 2: Must have viewport meta tag
    const hasViewport = htmlText.includes('meta name="viewport"');
    console.log('Barrier 2 - Viewport:', hasViewport);
    if (!hasViewport) {
      errors.push('❌ Missing viewport meta tag. Must include: <meta name="viewport" content="width=1920, height=1080">');
    }
    
    // Barrier 3: Body must have explicit dimensions
    const hasWidth = htmlText.includes('width:');
    const hasHeight = htmlText.includes('height:');
    console.log('Barrier 3 - Dimensions:', { hasWidth, hasHeight });
    if (!hasWidth || !hasHeight) {
      errors.push('❌ Body must have explicit width and height. Use: style="width:1920px; height:1080px;"');
    }
    
    // Barrier 4 & 5: Must use absolute positioning and have explicit dimensions
    const hasPositionAbsolute = htmlText.includes('position:absolute');
    console.log('Barrier 4 - Position Absolute:', hasPositionAbsolute);
    if (!hasPositionAbsolute) {
      errors.push('❌ Must use absolute positioning. All elements need: style="position:absolute; left:Xpx; top:Ypx;"');
    }
    
    // Barrier 6: Check for unsupported features
    const hasFlexbox = htmlText.includes('display:flex') || htmlText.includes('display:grid');
    // Allow float:right for text alignment within elements, but not for layout
    const hasFloat = htmlText.includes('float:left') || htmlText.includes('float:both') || htmlText.includes('float:inherit');
    console.log('Barrier 6 - Unsupported features:', { hasFlexbox, hasFloat });
    if (hasFlexbox) {
      errors.push('❌ Flexbox and Grid layouts not supported. Use absolute positioning only.');
    }
    
    if (hasFloat) {
      errors.push('❌ Float positioning not supported. Use absolute positioning only.');
    }
    
    console.log('🎯 Validation result:', { isValid: errors.length === 0, errors });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleImportHtml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const htmlFile = e.target.files?.[0];
    if (!htmlFile) return;

    try {
      setIsImporting(true);
      setImportProgress('🔍 Validating HTML structure...');
      
      const htmlText = await htmlFile.text();
      console.log('HTML file loaded, size:', htmlText.length);

      // PERFECT IMPORT BARRIER SYSTEM
      setImportProgress('🚧 Running import barriers...');
      
      const validation = validateHtmlStructure(htmlText);
      if (!validation.isValid) {
        const errorMessage = `❌ HTML Import Failed - Structure Validation\n\n${validation.errors.join('\n\n')}\n\n📋 Required HTML Structure:\n\n<!DOCTYPE html>\n<html>\n<head>\n    <meta name="viewport" content="width=1920, height=1080">\n</head>\n<body style="width:1920px; height:1080px; margin:0;">\n    <div style="position:absolute; left:100px; top:100px; width:300px; height:150px;">\n        Content here\n    </div>\n</body>\n</html>`;
        alert(errorMessage);
        return;
      }

      setImportProgress('✅ HTML structure validated successfully!');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setImportProgress('🔍 Checking for embedded CSS...');
      
      // Check if HTML contains embedded CSS
      const hasEmbeddedCSS = htmlText.includes('<style>') || htmlText.includes('<link');
      let cssText = '';

      if (hasEmbeddedCSS) {
        console.log('Found embedded CSS, skipping separate CSS file');
        setImportProgress('✅ Using embedded CSS...');
      } else {
        setImportProgress('📁 Prompting for CSS file...');
        // Prompt for CSS and wait for it (optional)
      cssInputRef.current?.click();
        cssText = await new Promise<string>((resolve) => {
        const handler = async (ev: Event) => {
          const cssFile = (ev.target as HTMLInputElement).files?.[0];
          cssInputRef.current?.removeEventListener('change', handler);
            if (cssFile) {
              setImportProgress('📖 Reading CSS file...');
              const cssContent = await cssFile.text();
              resolve(cssContent);
            } else {
              resolve(''); // Continue without CSS if user cancels
            }
        };
        cssInputRef.current?.addEventListener('change', handler);
        const timeout = setTimeout(() => {
          cssInputRef.current?.removeEventListener('change', handler);
            resolve(''); // Continue without CSS if timeout
          }, 15000); // 15 second timeout
        return () => clearTimeout(timeout);
      });
      }

      setImportProgress('Parsing HTML structure...');

      // Parse HTML using DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      // Extract canvas dimensions from HTML
      const body = doc.body;
      if (!body) {
        throw new Error('Invalid HTML: No body element found');
      }
      
      const bodyStyle = body.style;
      let canvasWidth = 1920;
      let canvasHeight = 1080;
      
      setImportProgress('Detecting canvas dimensions...');
      
      // Try to get dimensions from body or html element
      if (bodyStyle.width) canvasWidth = parseInt(bodyStyle.width, 10) || 1920;
      if (bodyStyle.height) canvasHeight = parseInt(bodyStyle.height, 10) || 1080;
      
      console.log('Canvas dimensions from body style:', { 
        bodyWidth: bodyStyle.width, 
        bodyHeight: bodyStyle.height,
        parsedWidth: canvasWidth,
        parsedHeight: canvasHeight
      });
      
      // Check for viewport meta tag or other dimension hints
      const viewport = doc.querySelector('meta[name="viewport"]');
      if (viewport) {
        const content = viewport.getAttribute('content');
        if (content) {
          const widthMatch = content.match(/width=(\d+)/);
          const heightMatch = content.match(/height=(\d+)/);
          if (widthMatch) canvasWidth = parseInt(widthMatch[1], 10);
          if (heightMatch) canvasHeight = parseInt(heightMatch[1], 10);
        }
      }

      console.log('Canvas dimensions detected:', { canvasWidth, canvasHeight });

      // Create temporary container for style computation
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = `${canvasWidth}px`;
      tempContainer.style.height = `${canvasHeight}px`;
      tempContainer.style.visibility = 'hidden';
      tempContainer.style.overflow = 'hidden';
      tempContainer.style.backgroundColor = bodyStyle.backgroundColor || 'transparent';
      tempContainer.style.fontFamily = bodyStyle.fontFamily || 'Arial, sans-serif';
      tempContainer.style.fontSize = bodyStyle.fontSize || '16px';
      document.body.appendChild(tempContainer);

      // Inject CSS with better scoping
      let addedStyleElement: HTMLStyleElement | null = null;
      if (cssText) {
        addedStyleElement = document.createElement('style');
        addedStyleElement.id = 'imported-css-' + Date.now();
        addedStyleElement.textContent = cssText;
        document.head.appendChild(addedStyleElement);
      }

      // Copy body content
      tempContainer.innerHTML = body.innerHTML;

      // Wait longer for styles to apply and force multiple reflows
      await new Promise(resolve => setTimeout(resolve, 200));
      tempContainer.offsetHeight; // Force reflow
      await new Promise(resolve => setTimeout(resolve, 100));
      tempContainer.offsetHeight; // Force another reflow

      // Extract canvas properties from body style
      const bodyComputedStyle = window.getComputedStyle(body);
      let backgroundColor = body.style.backgroundColor || rgbToHex(bodyComputedStyle.backgroundColor) || '#1a0b2e';
      let backgroundImage = body.style.backgroundImage || bodyComputedStyle.backgroundImage || '';
      
      // If no background color from body, try to get from tempContainer
      if (!backgroundColor || backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
        backgroundColor = rgbToHex(bodyComputedStyle.backgroundColor) || '#1a0b2e';
      }
      
      console.log('Canvas background extraction:', { backgroundColor, backgroundImage, bodyStyle: body.style.cssText });

      console.log('Canvas Styles:', { canvasWidth, canvasHeight, backgroundColor, backgroundImage });

      setImportProgress('🎯 Perfect element extraction...');

      // PERFECT ELEMENT EXTRACTION SYSTEM
      const elements: MenuBoardElement[] = [];
      const containerRect = tempContainer.getBoundingClientRect();

      // Get all positioned elements (more robust selector)
      const allElements = Array.from(tempContainer.querySelectorAll('*'));
      const positionedElements = allElements.filter(el => {
        const style = el.getAttribute('style') || '';
        const computed = window.getComputedStyle(el);
        // Include elements with absolute positioning OR significant styling
        return (style.includes('position:absolute') || style.includes('position: absolute')) &&
               computed.position === 'absolute';
      });
      
      console.log('🎯 Perfect Import Debug:', {
        totalElements: allElements.length,
        positionedElements: positionedElements.length,
        elementTypes: allElements.map(el => el.tagName),
        positionedTypes: positionedElements.map(el => el.tagName),
        positionedElementsDetails: positionedElements.map(el => ({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          style: el.getAttribute('style')?.substring(0, 100),
          textContent: el.textContent?.substring(0, 50)
        }))
      });
      
      for (let i = 0; i < positionedElements.length; i++) {
        setImportProgress(`🎯 Extracting element ${i + 1}/${positionedElements.length}...`);
        
        const el = positionedElements[i] as HTMLElement;
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        // Calculate position relative to container
        const x = Math.max(0, rect.left - containerRect.left);
        const y = Math.max(0, rect.top - containerRect.top);
        
        // Determine element type and content
        let type: MenuBoardElement['type'] = 'text';
        let content = el.textContent?.trim() || '';
        
        if (el.tagName === 'IMG') {
          type = 'image';
          content = '';
        } else if (content) {
          // Smart type detection
          if (content.match(/^\$?[\d.,]+$/)) type = 'price';
          else if (content.includes('!') || content.includes('SPECIAL') || content.includes('OFF') || content.includes('%')) type = 'promotion';
          else type = 'text';
        }
        
        // Extract rotation from transform
        let rotation = 0;
        const transform = computed.transform;
        if (transform && transform !== 'none') {
          const match = transform.match(/rotate\(([-]?\d+\.?\d*deg)\)/i);
          if (match) rotation = parseFloat(match[1]) || 0;
        }

        // Generate unique ID
        const id = `perfect_${Date.now()}_${i}`;
        
        // Create perfect element
        const newEl: MenuBoardElement = {
          id,
          type,
          x: Math.round(x),
          y: Math.round(y),
          width: Math.max(1, Math.round(rect.width)),
          height: Math.max(1, Math.round(rect.height)),
          content,
          fontSize: parseInt(computed.fontSize, 10) || (type === 'price' ? 24 : type === 'promotion' ? 20 : 16),
          fontWeight: computed.fontWeight || 'normal',
          fontFamily: computed.fontFamily?.replace(/['"]/g, '').split(',')[0] || 'Arial',
          color: rgbToHex(computed.color) || '#000000',
          backgroundColor: rgbToHex(computed.backgroundColor) === '#000000' ? 'transparent' : rgbToHex(computed.backgroundColor),
          borderRadius: parseInt(computed.borderRadius, 10) || 0,
          imageUrl: type === 'image' ? resolveImageUrl(el, doc) || '' : undefined,
          zIndex: i + 1, // Simple z-index based on order
          rotation,
          opacity: parseFloat(computed.opacity) || 1,
          shadow: computed.boxShadow !== 'none' ? computed.boxShadow : undefined,
          textAlign: computed.textAlign as any || 'left',
          strokeColor: rgbToHex(computed.borderColor) || undefined,
          strokeWidth: computed.borderWidth !== '0px' ? parseInt(computed.borderWidth, 10) : undefined,
        };

        // Preload images
        if (type === 'image' && newEl.imageUrl) {
          await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = newEl.imageUrl || '';
            
            const timeout = setTimeout(() => resolve(false), 3000);
            img.onload = () => { clearTimeout(timeout); resolve(true); };
            img.onerror = () => { clearTimeout(timeout); resolve(false); };
          });
        }
        
        console.log(`Perfect element ${i}:`, { 
          id, type, content: content.substring(0, 30),
          x: newEl.x, y: newEl.y, width: newEl.width, height: newEl.height,
          color: newEl.color, backgroundColor: newEl.backgroundColor,
          originalRect: { width: rect.width, height: rect.height },
          originalPosition: { left: rect.left, top: rect.top },
          containerRect: { left: containerRect.left, top: containerRect.top }
        });
        
        elements.push(newEl);
      }

      // Clean up temporary elements
      if (tempContainer.parentNode) {
      document.body.removeChild(tempContainer);
      }
      if (addedStyleElement && addedStyleElement.parentNode) {
        document.head.removeChild(addedStyleElement);
      }

      const importedTemplate: MenuBoardTemplate = {
        id: `imported-${Date.now()}`,
        name: `Imported Design (${canvasWidth}×${canvasHeight})`,
        category: 'custom',
        preview: `Imported from HTML/CSS with ${elements.length} elements`,
        canvasSize: { 
          id: `imported-canvas-${canvasWidth}x${canvasHeight}`,
          name: `Custom Canvas (${canvasWidth}×${canvasHeight})`,
          width: canvasWidth, 
          height: canvasHeight,
          aspectRatio: `${canvasWidth}:${canvasHeight}`,
          category: 'other' as const
        },
        backgroundColor: backgroundColor,
        backgroundImage: backgroundImage || undefined,
        isHorizontal: canvasWidth > canvasHeight,
        elements,
        groups: [],
      };
      
      console.log('🎯 Final imported template:', {
        canvasSize: importedTemplate.canvasSize,
        backgroundColor: importedTemplate.backgroundColor,
        backgroundImage: importedTemplate.backgroundImage,
        elementsCount: importedTemplate.elements.length,
        isHorizontal: importedTemplate.isHorizontal
      });

      setImportProgress('Finalizing import...');

      setImportProgress('✅ Perfect extraction completed!');
      
      console.log('🎯 Perfect Import Results:', {
        totalElements: elements.length,
        text: elements.filter(e => e.type === 'text').length,
        image: elements.filter(e => e.type === 'image').length,
        price: elements.filter(e => e.type === 'price').length,
        promotion: elements.filter(e => e.type === 'promotion').length
      });

      // PERFECT VALIDATION
      if (elements.length === 0) {
        console.error('🎯 Import Debug - No elements found:', {
          positionedElementsCount: positionedElements.length,
          allElementsCount: allElements.length,
          tempContainerHTML: tempContainer.innerHTML.substring(0, 500)
        });
        throw new Error('❌ Perfect Import Failed\n\nNo positioned elements found. Your HTML must use:\n\n• position:absolute for all elements\n• Explicit width and height values\n• Proper HTML structure\n\nExample:\n<div style="position:absolute; left:100px; top:100px; width:300px; height:150px;">\n    Content here\n</div>');
      }
      
      if (elements.length < 3) {
        console.warn('⚠️ Very few elements found. This might indicate an issue with the HTML structure.');
      }

      console.log('Imported Template:', importedTemplate);
      setTemplate(importedTemplate);
      templateRef.current = importedTemplate;
      setHistory([importedTemplate]);
      setHistoryIndex(0);
      setSelectedIds([]);
      
      // Set appropriate zoom for imported template to fit the screen
      const screenWidth = window.innerWidth - 400; // Account for sidebars
      const screenHeight = window.innerHeight - 200; // Account for headers
      const optimalZoom = Math.min(
        screenWidth / canvasWidth,
        screenHeight / canvasHeight,
        1.0 // Don't zoom in beyond 100%
      );
      
      console.log('Setting optimal zoom:', { optimalZoom, canvasWidth, canvasHeight, screenWidth, screenHeight });
      setZoom(Math.max(0.2, optimalZoom)); // Minimum 20% zoom
      
      setImportProgress('🎉 Perfect import completed!');
      
      // Show perfect success message
      const imageCount = elements.filter(e => e.type === 'image').length;
      const textCount = elements.filter(e => e.type === 'text').length;
      const priceCount = elements.filter(e => e.type === 'price').length;
      const promotionCount = elements.filter(e => e.type === 'promotion').length;
      
      alert(`🎯 PERFECT IMPORT SUCCESS!\n\n✨ Your HTML has been imported with 100% accuracy!\n\n📊 Canvas: ${canvasWidth}×${canvasHeight}\n📝 Elements: ${elements.length}\n  • Text: ${textCount}\n  • Images: ${imageCount}\n  • Prices: ${priceCount}\n  • Promotions: ${promotionCount}\n\n🎨 Your design is ready to edit with perfect precision!`);
      
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Import failed!\n\n${errorMessage}\n\n💡 Tips:\n• Use explicit positioning (position: absolute)\n• Set explicit dimensions (width, height)\n• Avoid display: none on elements\n• Check image URLs are accessible\n• Use pixel values instead of percentages`);
    } finally {
      setIsImporting(false);
      setImportProgress('');
    e.target.value = '';
    if (cssInputRef.current) cssInputRef.current.value = '';
    }
  };

  // Helper function to resolve image URLs
  const resolveImageUrl = (img: HTMLElement, doc: Document): string => {
    const src = img.getAttribute('src');
    if (!src) return '';
    
    try {
      // Try to resolve relative URLs
      const url = new URL(src, doc.baseURI);
      return url.href;
    } catch {
      return src; // Fallback to original if resolution fails
    }
  };

  useEffect(() => {
    if (!showPreview) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPreview(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showPreview]);



  const commitHistory = useCallback((next?: MenuBoardTemplate) => {
    const snapshot = next ?? templateRef.current;
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, snapshot];
    });
    setHistoryIndex((idx) => idx + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    setHistoryIndex((idx) => {
      if (idx <= 0) return idx;
      const nextIdx = idx - 1;
      const snap = history[nextIdx];
      setTemplate(snap);
      templateRef.current = snap;
      return nextIdx;
    });
  }, [history]);

  const redo = useCallback(() => {
    setHistoryIndex((idx) => {
      if (idx >= history.length - 1) return idx;
      const nextIdx = idx + 1;
      const snap = history[nextIdx];
      setTemplate(snap);
      templateRef.current = snap;
      return nextIdx;
    });
  }, [history]);

  // ---------- Zoom & viewport ----------
  const zoomIn = () => setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10));
  const zoomOut = () => setZoom((z) => Math.max(0.1, Math.round((z - 0.1) * 10) / 10));

  // ---------- Pointer/drag/resize ----------
  const getCanvasRect = () => {
    if (!innerRef.current) return null;
    const rect = innerRef.current.getBoundingClientRect();
    return rect;
  };

  const clientToCanvasCoords = (clientX: number, clientY: number) => {
    const rect = getCanvasRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;
    return { x, y };
  };

  // Snap to grid helper
  const snapToGridValue = (value: number, gridSize: number = 20) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  // Snap to guides helper
  const snapToGuidesValue = (value: number, threshold: number = 5) => {
    if (!snapToGuides) return value;
    for (const guide of guides) {
      if (Math.abs(value - guide.position) < threshold) {
        return guide.position;
      }
    }
    return value;
  };


  // Remove guide
  const removeGuide = (id: string) => {
    setGuides(prev => prev.filter(g => g.id !== id));
  };

  // Alignment functions
  const alignElements = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedIds.length < 2) return;
    
    // Check if any selected items are groups
    const selectedGroups = templateRef.current.groups?.filter(g => selectedIds.includes(g.id)) || [];
    const selectedElements = templateRef.current.elements.filter(el => selectedIds.includes(el.id));
    
    if (selectedGroups.length > 0) {
      // For groups, align the groups themselves
      const allGroups = [...selectedGroups, ...selectedElements.map(el => {
        const group = templateRef.current.groups?.find(g => g.elementIds.includes(el.id));
        return group;
      }).filter(Boolean)];
      
      const uniqueGroups = allGroups.filter((group, index, self) => 
        index === self.findIndex(g => g.id === group.id)
      );
      
      if (uniqueGroups.length < 2) return;
      
      setTemplate(prev => {
        const next = { ...prev };
        
        uniqueGroups.forEach(group => {
          let newX = group.x;
          let newY = group.y;
          
          switch (alignment) {
            case 'left':
              newX = Math.min(...uniqueGroups.map(g => g.x));
              break;
            case 'right':
              newX = Math.max(...uniqueGroups.map(g => g.x + g.width)) - group.width;
              break;
            case 'center':
              const centerX = (Math.min(...uniqueGroups.map(g => g.x)) + Math.max(...uniqueGroups.map(g => g.x + g.width))) / 2;
              newX = centerX - group.width / 2;
              break;
            case 'top':
              newY = Math.min(...uniqueGroups.map(g => g.y));
              break;
            case 'bottom':
              newY = Math.max(...uniqueGroups.map(g => g.y + g.height)) - group.height;
              break;
            case 'middle':
              const centerY = (Math.min(...uniqueGroups.map(g => g.y)) + Math.max(...uniqueGroups.map(g => g.y + g.height))) / 2;
              newY = centerY - group.height / 2;
              break;
          }
          
          // Update group position
          const groupIndex = next.groups?.findIndex(g => g.id === group.id);
          if (groupIndex !== undefined && groupIndex !== -1 && next.groups) {
            next.groups[groupIndex] = { ...group, x: newX, y: newY };
          }
        });
        
        templateRef.current = next;
        return next;
      });
    } else {
      // For individual elements
      if (selectedElements.length < 2) return;
      
      setTemplate(prev => {
        const list = prev.elements.map(el => {
          if (!selectedIds.includes(el.id)) return el;
          
          let newX = el.x;
          let newY = el.y;
          
          switch (alignment) {
            case 'left':
              newX = Math.min(...selectedElements.map(e => e.x));
              break;
            case 'right':
              newX = Math.max(...selectedElements.map(e => e.x + e.width)) - el.width;
              break;
            case 'center':
              const centerX = (Math.min(...selectedElements.map(e => e.x)) + Math.max(...selectedElements.map(e => e.x + e.width))) / 2;
              newX = centerX - el.width / 2;
              break;
            case 'top':
              newY = Math.min(...selectedElements.map(e => e.y));
              break;
            case 'bottom':
              newY = Math.max(...selectedElements.map(e => e.y + e.height)) - el.height;
              break;
            case 'middle':
              const centerY = (Math.min(...selectedElements.map(e => e.y)) + Math.max(...selectedElements.map(e => e.y + e.height))) / 2;
              newY = centerY - el.height / 2;
              break;
          }
          
          return { ...el, x: newX, y: newY };
        });
        
        const next = { ...prev, elements: list };
        templateRef.current = next;
        return next;
      });
    }
    commitHistory();
  };

  // Distribution functions
  const distributeElements = (direction: 'horizontal' | 'vertical') => {
    if (selectedIds.length < 3) return;
    
    // Check if any selected items are groups
    const selectedGroups = templateRef.current.groups?.filter(g => selectedIds.includes(g.id)) || [];
    const selectedElements = templateRef.current.elements.filter(el => selectedIds.includes(el.id));
    
    if (selectedGroups.length > 0) {
      // For groups, distribute the groups themselves
      const allGroups = [...selectedGroups, ...selectedElements.map(el => {
        const group = templateRef.current.groups?.find(g => g.elementIds.includes(el.id));
        return group;
      }).filter(Boolean)];
      
      const uniqueGroups = allGroups.filter((group, index, self) => 
        index === self.findIndex(g => g.id === group.id)
      );
      
      if (uniqueGroups.length < 3) return;
      
      setTemplate(prev => {
        const next = { ...prev };
        
        if (direction === 'horizontal') {
          const sorted = uniqueGroups.sort((a, b) => a.x - b.x);
          const leftmost = Math.min(...sorted.map(g => g.x));
          const rightmost = Math.max(...sorted.map(g => g.x));
          const totalWidth = rightmost - leftmost;
          const spacing = totalWidth / (sorted.length - 1);
          
          sorted.forEach((group, index) => {
            const newX = leftmost + (index * spacing);
            
            // Update group position
            const groupIndex = next.groups?.findIndex(g => g.id === group.id);
            if (groupIndex !== undefined && groupIndex !== -1 && next.groups) {
              next.groups[groupIndex] = { ...group, x: newX };
            }
          });
        } else {
          const sorted = uniqueGroups.sort((a, b) => a.y - b.y);
          const topmost = Math.min(...sorted.map(g => g.y));
          const bottommost = Math.max(...sorted.map(g => g.y));
          const totalHeight = bottommost - topmost;
          const spacing = totalHeight / (sorted.length - 1);
          
          sorted.forEach((group, index) => {
            const newY = topmost + (index * spacing);
            
            // Update group position
            const groupIndex = next.groups?.findIndex(g => g.id === group.id);
            if (groupIndex !== undefined && groupIndex !== -1 && next.groups) {
              next.groups[groupIndex] = { ...group, y: newY };
            }
          });
        }
        
        templateRef.current = next;
        return next;
      });
    } else {
      // For individual elements
      if (selectedElements.length < 3) return;
      
      setTemplate(prev => {
        const list = prev.elements.map(el => {
          if (!selectedIds.includes(el.id)) return el;
          
          let newX = el.x;
          let newY = el.y;
          
          if (direction === 'horizontal') {
            const sorted = selectedElements.sort((a, b) => a.x - b.x);
            const leftmost = Math.min(...sorted.map(e => e.x));
            const rightmost = Math.max(...sorted.map(e => e.x));
            const totalWidth = rightmost - leftmost;
            const spacing = totalWidth / (sorted.length - 1);
            
            const index = sorted.findIndex(e => e.id === el.id);
            if (index !== -1) {
              newX = leftmost + (index * spacing);
            }
          } else {
            const sorted = selectedElements.sort((a, b) => a.y - b.y);
            const topmost = Math.min(...sorted.map(e => e.y));
            const bottommost = Math.max(...sorted.map(e => e.y));
            const totalHeight = bottommost - topmost;
            const spacing = totalHeight / (sorted.length - 1);
            
            const index = sorted.findIndex(e => e.id === el.id);
            if (index !== -1) {
              newY = topmost + (index * spacing);
            }
          }
          
          return { ...el, x: newX, y: newY };
        });
        
        const next = { ...prev, elements: list };
        templateRef.current = next;
        return next;
      });
    }
    commitHistory();
  };

  // Group elements
  const groupElements = () => {
    if (selectedIds.length < 2) {
      return;
    }
    
    const selectedElements = templateRef.current.elements.filter(el => selectedIds.includes(el.id));
    const selectedGroups = templateRef.current.groups?.filter(g => selectedIds.includes(g.id)) || [];
    
    // Collect all elements that will be in the new group
    const allElementsToGroup = [
      ...selectedElements,
      ...selectedGroups.flatMap(group => 
        templateRef.current.elements.filter(el => group.elementIds.includes(el.id))
      )
    ];
    
    // Remove duplicates
    const uniqueElements = allElementsToGroup.filter((el, index, arr) => 
      arr.findIndex(e => e.id === el.id) === index
    );
    
    if (uniqueElements.length < 2) {
      return;
    }
    
    // Calculate group bounds from all elements
    const minX = Math.min(...uniqueElements.map(el => el.x));
    const minY = Math.min(...uniqueElements.map(el => el.y));
    const maxX = Math.max(...uniqueElements.map(el => el.x + el.width));
    const maxY = Math.max(...uniqueElements.map(el => el.y + el.height));
    
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const group: MenuBoardGroup = {
      id: groupId,
      name: `Group ${(templateRef.current.groups?.length || 0) + 1}`,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      elementIds: uniqueElements.map(el => el.id),
    };
    
    // Add groupId to selected elements and remove from any existing groups
    const next = {
      ...templateRef.current,
      elements: templateRef.current.elements.map(el =>
        uniqueElements.some(e => e.id === el.id) ? { ...el, groupId } : el
      ),
      // Remove the old groups that are being merged into the new group
      groups: [
        ...(templateRef.current.groups || []).filter(g => !selectedIds.includes(g.id)),
        group
      ],
    };
    
    setTemplate(next);
    templateRef.current = next;
    setSelectedIds([groupId]); // Select the new group
    commitHistory();
  };

  const ungroupElements = () => {
    const selectedGroups = templateRef.current.groups?.filter(group => selectedIds.includes(group.id)) || [];
    
    if (selectedGroups.length === 0) {
      return;
    }
    
    // Get all element IDs that will be ungrouped
    const elementIdsToUngroup = selectedGroups.flatMap(group => group.elementIds);
    
    const next = {
      ...templateRef.current,
      elements: templateRef.current.elements.map(el => 
        elementIdsToUngroup.includes(el.id)
          ? { ...el, groupId: undefined }
          : el
      ),
      groups: (templateRef.current.groups || []).filter(group => !selectedIds.includes(group.id))
    };
    
    setTemplate(next);
    templateRef.current = next;
    setSelectedIds([]); // Clear selection after ungrouping
    commitHistory();
  };

  const updateGroup = (groupId: string, updates: Partial<MenuBoardGroup>) => {
    const next = {
      ...templateRef.current,
      groups: (templateRef.current.groups || []).map(group => 
        group.id === groupId ? { ...group, ...updates } : group
      )
    };
    setTemplate(next);
    templateRef.current = next;
    commitHistory();
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const canvas = e.currentTarget as HTMLElement;
    
    // Don't interfere with toolbar buttons
    if (target.closest('[data-toolbar]') || target.closest('button')) {
      return;
    }
    
    // Don't interfere with resize handles or elements
    if (target.dataset.handle === 'resize' || target.dataset.elementId) {
      return;
    }
    
    // Only start selection if clicking on canvas background
    if (target === canvas || canvas.contains(target)) {
      const rect = innerRef.current?.getBoundingClientRect();
      if (rect) {
        const startX = (e.clientX - rect.left) / zoom;
        const startY = (e.clientY - rect.top) / zoom;
        
        setSelectionRect({ x: startX, y: startY, width: 0, height: 0 });
        setIsSelecting(true);
        
        // Clear selection only if not holding modifier keys
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      setSelectedIds([]);
        }
        
        // Start mouse tracking
        isPointerDownRef.current = true;
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);
      }
    }
  };

  const startDrag = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const el = templateRef.current.elements.find((el) => el.id === id);
    if (!el || el.locked) return;

    // Don't allow individual dragging of elements that are part of a group
    if (el.groupId) {
      // Instead, select the group
      const group = templateRef.current.groups?.find(g => g.id === el.groupId);
      if (group) {
        setSelectedIds([group.id]);
      }
      return;
    }

    let nextSelection = selectedIds;
    const multi = e.metaKey || e.ctrlKey;
    if (!selectedIds.includes(id)) {
      nextSelection = multi ? [...selectedIds, id] : [id];
      setSelectedIds(nextSelection);
    }

    const { x: px, y: py } = clientToCanvasCoords(e.clientX, e.clientY);
    const newOffsets: DragOffsets = {};
    nextSelection.forEach((sid) => {
      const sel = templateRef.current.elements.find((t) => t.id === sid);
      if (sel) {
        newOffsets[sid] = { dx: px - sel.x, dy: py - sel.y };
      }
    });

    dragOffsetsRef.current = newOffsets;
    isPointerDownRef.current = true;
    activeResizeRef.current = null;
    dragStartSnapshotRef.current = templateRef.current;

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
  };

  const startResize = (e: React.MouseEvent, id: string, corner: 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr') => {
    e.stopPropagation();
    const el = templateRef.current.elements.find((el) => el.id === id);
    if (!el || el.locked) return;
    setSelectedIds([id]);
    isPointerDownRef.current = true;
    activeResizeRef.current = { id, corner };
    dragStartSnapshotRef.current = templateRef.current;

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
  };

  const startRotate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const el = templateRef.current.elements.find((el) => el.id === id);
    if (!el || el.locked) return;
    setSelectedIds([id]);
    isPointerDownRef.current = true;
    activeRotateRef.current = { id };
    dragStartSnapshotRef.current = templateRef.current;

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
  };

  const startGroupDrag = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    const group = templateRef.current.groups?.find((g) => g.id === groupId);
    if (!group) {
      return;
    }
    
    if (group.locked) {
      return;
    }
    
    setSelectedIds([groupId]);
    isPointerDownRef.current = true;
    dragStartSnapshotRef.current = templateRef.current;

    // Store initial mouse position and group position for smooth dragging
    const { x: startX, y: startY } = clientToCanvasCoords(e.clientX, e.clientY);
    
    // Store initial positions of all elements in the group
    const initialElements = group.elementIds.map(id => {
      const el = templateRef.current.elements.find(e => e.id === id);
      return { id, x: el?.x || 0, y: el?.y || 0 };
    });
    
    activeGroupDragRef.current = { 
      id: groupId, 
      startX, 
      startY, 
      groupCenterX: group.x, // Store group's top-left position
      groupCenterY: group.y, // Store group's top-left position
      initialElements
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
  };

  const onPointerMove = (e: MouseEvent) => {
    if (!isPointerDownRef.current) return;

    // Handle selection rectangle
    if (isSelecting && selectionRect) {
      const rect = innerRef.current?.getBoundingClientRect();
      if (rect) {
        const currentX = (e.clientX - rect.left) / zoom;
        const currentY = (e.clientY - rect.top) / zoom;
        
        const newWidth = currentX - selectionRect.x;
        const newHeight = currentY - selectionRect.y;
        
        
        setSelectionRect(prev => prev ? {
          ...prev,
          width: newWidth,
          height: newHeight
        } : null);
        
        // Find elements and groups that intersect with the selection rectangle
        const selLeft = newWidth < 0 ? selectionRect.x + newWidth : selectionRect.x;
        const selTop = newHeight < 0 ? selectionRect.y + newHeight : selectionRect.y;
        const selRight = selectionRect.x + Math.abs(newWidth);
        const selBottom = selectionRect.y + Math.abs(newHeight);
        
        const elementsInSelection = templateRef.current.elements.filter(el => {
          const elRight = el.x + el.width;
          const elBottom = el.y + el.height;
          
          return !(elRight < selLeft || el.x > selRight || elBottom < selTop || el.y > selBottom);
        });
        
        const groupsInSelection = (templateRef.current.groups || []).filter(group => {
          const groupRight = group.x + group.width;
          const groupBottom = group.y + group.height;
          
          return !(groupRight < selLeft || group.x > selRight || groupBottom < selTop || group.y > selBottom);
        });
        
        const allSelectedIds = [
          ...elementsInSelection.map(el => el.id),
          ...groupsInSelection.map(group => group.id)
        ];
        
        setSelectedIds(allSelectedIds);
      }
      return;
    }

    const resize = activeResizeRef.current;
    const { x: px, y: py } = clientToCanvasCoords(e.clientX, e.clientY);

    if (resize) {
      const id = resize.id;
      setTemplate((prev) => {
        const list = prev.elements.map((el) => {
          if (el.id !== id) return el;
          const minSize = 20;
          let { x, y, width, height } = el;
          const right = x + width;
          const bottom = y + height;

          switch (resize.corner) {
            case 'tl': {
              const newX = Math.min(right - minSize, px);
              const newY = Math.min(bottom - minSize, py);
              width = right - newX;
              height = bottom - newY;
              x = newX;
              y = newY;
              break;
            }
            case 'tr': {
              const newY = Math.min(bottom - minSize, py);
              width = Math.max(minSize, px - x);
              height = bottom - newY;
              y = newY;
              break;
            }
            case 'bl': {
              const newX = Math.min(right - minSize, px);
              width = right - newX;
              height = Math.max(minSize, py - y);
              x = newX;
              break;
            }
            case 'br': {
              width = Math.max(minSize, px - x);
              height = Math.max(minSize, py - y);
              break;
            }
            case 'tm': { // top middle
              const newY = Math.min(bottom - minSize, py);
              height = bottom - newY;
              y = newY;
              break;
            }
            case 'bm': { // bottom middle
              height = Math.max(minSize, py - y);
              break;
            }
            case 'ml': { // middle left
              const newX = Math.min(right - minSize, px);
              width = right - newX;
              x = newX;
              break;
            }
            case 'mr': { // middle right
              width = Math.max(minSize, px - x);
              break;
            }
          }
          return { ...el, x, y, width, height };
        });

        const next = { ...prev, elements: list };
        templateRef.current = next;
        return next;
      });
      return;
    }

    if (activeRotateRef.current) {
      const id = activeRotateRef.current.id;
      const rect = getCanvasRect();
      if (!rect) return;

      const element = templateRef.current.elements.find((el) => el.id === id);
      if (!element) return;

      const centerX = rect.left + (element.x + element.width / 2) * zoom;
      const centerY = rect.top + (element.y + element.height / 2) * zoom;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      // Calculate angle and apply smoothing
      const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const currentRotation = element.rotation || 0;
      
      // Apply rotation sensitivity reduction (divide by 2 for smoother rotation)
      const angleDiff = rawAngle - currentRotation;
      let smoothedAngle = currentRotation + (angleDiff * 0.5);
      
      // Snap to 15-degree increments for smoother rotation
      smoothedAngle = Math.round(smoothedAngle / 15) * 15;

      setTemplate((prev) => {
        const list = prev.elements.map((el) =>
          el.id === id ? { ...el, rotation: smoothedAngle } : el
        );
        const next = { ...prev, elements: list };
        templateRef.current = next;
        return next;
      });

      return;
    }

    if (activeGroupDragRef.current) {
      const { id: groupId, startX, startY, groupCenterX, groupCenterY, initialElements } = activeGroupDragRef.current;
      const { x: px, y: py } = clientToCanvasCoords(e.clientX, e.clientY);
      
      const group = templateRef.current.groups?.find((g) => g.id === groupId);
      if (!group) return;

      // Calculate smooth movement based on initial positions
      const dx = px - startX;
      const dy = py - startY;
      
      console.log('🎯 Group drag:', { groupId, startX, startY, px, py, dx, dy, groupX: group.x, groupY: group.y });

      setTemplate((prev) => {
        // Calculate new group position based on the initial position + drag movement
        const newGroupX = groupCenterX + dx;
        const newGroupY = groupCenterY + dy;
        
        const newGroup = { ...group, x: newGroupX, y: newGroupY };
        
        // Move all elements in the group based on their initial positions + drag movement
        const updatedElements = prev.elements.map((el) => {
          if (group.elementIds.includes(el.id)) {
            const initialEl = initialElements.find(ie => ie.id === el.id);
            if (initialEl) {
              return { ...el, x: initialEl.x + dx, y: initialEl.y + dy };
            }
          }
          return el;
        });

        const updatedGroups = (prev.groups || []).map((g) =>
          g.id === groupId ? newGroup : g
        );

        const next = { ...prev, elements: updatedElements, groups: updatedGroups };
        templateRef.current = next;
        return next;
      });
      return;
    }

    const offsets = dragOffsetsRef.current;
    setTemplate((prev) => {
      const list = prev.elements.map((el) => {
        // Don't move elements that are part of a group (except during group dragging)
        if (el.groupId && !activeGroupDragRef.current) return el;
        if (!selectedIds.includes(el.id)) return el;
        const off = offsets[el.id];
        if (!off) return el;
        const nx = snapToGuidesValue(snapToGridValue(px - off.dx));
        const ny = snapToGuidesValue(snapToGridValue(py - off.dy));
        return { ...el, x: nx, y: ny };
      });
      const next = { ...prev, elements: list };
      templateRef.current = next;
      
      // Generate smart guides for the first selected element
      if (selectedIds.length === 1) {
        const draggedElement = list.find(el => el.id === selectedIds[0]);
        if (draggedElement) {
          const guides = generateSmartGuides(draggedElement);
          setSmartGuides(guides);
        }
      }
      
      return next;
    });
  };

  const onPointerUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    activeResizeRef.current = null;
    dragOffsetsRef.current = {};
    activeRotateRef.current = null;
    activeGroupDragRef.current = null;
    setSmartGuides([]); // Clear smart guides when dragging stops
    
    // Clean up selection rectangle
    if (isSelecting) {
      setIsSelecting(false);
      setSelectionRect(null);
    }
    
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    commitHistory();
  };

  // ---------- Element ops ----------
  const addShape = (shape: 'rectangle' | 'rounded' | 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'star' | 'heart') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const base: MenuBoardElement = {
      id,
      type: 'shape',
      shapeType: shape === 'rounded' ? 'rectangle' : (shape as any),
      x: 80,
      y: 80,
      width: shape === 'circle' ? 140 : 180,
      height: shape === 'circle' ? 140 : 120,
      backgroundColor: shapeColor,
      strokeColor: shapeStrokeColor as any,
      strokeWidth: shapeStrokeWidth as any,
      borderRadius: shape === 'rounded' ? 16 : 0,
      zIndex: templateRef.current.elements.length + 1,
      rotation: 0,
      opacity: 1,
      shadow: 'none',
    } as MenuBoardElement;

    const next = { ...templateRef.current, elements: [...templateRef.current.elements, base] };
    setTemplate(next);
    templateRef.current = next;
    setSelectedIds([id]);
    commitHistory(next);
    setShowShapePicker(false);
  };
  const addElement = (type: MenuBoardElement['type']) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const base: MenuBoardElement = {
      id,
      type,
      shapeType: 'rectangle',
      x: 60,
      y: 60,
      width:
        type === 'text' ? 240 : type === 'image' ? 320 : type === 'price' ? 180 : type === 'promotion' ? 320 : 160,
      height:
        type === 'text' ? 60 : type === 'image' ? 200 : type === 'price' ? 70 : type === 'promotion' ? 100 : 100,
      content:
        type === 'text'
          ? 'New Text'
          : type === 'price'
            ? '$9.99'
            : type === 'promotion'
              ? 'SPECIAL OFFER'
              : '',
      fontSize: type === 'price' ? 32 : 24,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      color: type === 'price' ? '#FFD700' : '#000000',
      backgroundColor: type === 'shape' ? '#3B82F6' : type === 'promotion' ? '#FF6B6B' : 'transparent',
      borderRadius: type === 'shape' || type === 'promotion' ? 12 : 0,
      imageUrl:
        type === 'image' ? 'https://thumbs.dreamstime.com/b/tasty-burger-french-fries-fire-close-up-home-made-flames-137249900.jpg' : undefined,
      zIndex: templateRef.current.elements.length + 1,
      rotation: 0,
      opacity: 1,
      shadow: 'none',
    };
    const next = { ...templateRef.current, elements: [...templateRef.current.elements, base] };
    setTemplate(next);
    templateRef.current = next;
    setSelectedIds([id]);
    commitHistory(next);
  };



  const updateElement = (id: string, updates: Partial<MenuBoardElement>, commit = false) => {
    try {
      // Validate updates before applying
      const validatedUpdates = { ...updates };
      
      // Validate numeric values
      if (typeof validatedUpdates.fontSize === 'number') {
        validatedUpdates.fontSize = Math.max(8, Math.min(200, validatedUpdates.fontSize));
      }
      if (typeof validatedUpdates.rotation === 'number') {
        validatedUpdates.rotation = Math.max(-360, Math.min(360, validatedUpdates.rotation));
      }
      if (typeof validatedUpdates.opacity === 'number') {
        validatedUpdates.opacity = Math.max(0, Math.min(1, validatedUpdates.opacity));
      }
      
      // Validate colors
      if (validatedUpdates.color) {
        validatedUpdates.color = safeColorUpdate(validatedUpdates.color);
      }
      if (validatedUpdates.backgroundColor) {
        validatedUpdates.backgroundColor = safeColorUpdate(validatedUpdates.backgroundColor);
      }
      if (validatedUpdates.textStrokeColor) {
        validatedUpdates.textStrokeColor = safeColorUpdate(validatedUpdates.textStrokeColor);
      }
      if (validatedUpdates.shadowColor) {
        validatedUpdates.shadowColor = safeColorUpdate(validatedUpdates.shadowColor);
      }
      
      // Validate gradient colors
      if (validatedUpdates.textGradientColors) {
        validatedUpdates.textGradientColors = safeGradientColors(validatedUpdates.textGradientColors);
      }
      
    const next = {
      ...templateRef.current,
        elements: templateRef.current.elements.map((el) => (el.id === id ? { ...el, ...validatedUpdates } : el)),
    };
    setTemplate(next);
    templateRef.current = next;
    if (commit) commitHistory(next);
    } catch (error) {
      console.error('Error updating element:', error);
    }
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    const next = {
      ...templateRef.current,
      elements: templateRef.current.elements.filter((el) => !selectedIds.includes(el.id)),
    };
    setTemplate(next);
    templateRef.current = next;
    setSelectedIds([]);
    commitHistory(next);
  };

  const duplicateSelected = () => {
    if (selectedIds.length === 0) return;
    const clones: MenuBoardElement[] = [];
    templateRef.current.elements.forEach((el) => {
      if (selectedIds.includes(el.id)) {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        clones.push({
          ...el,
          id,
          x: el.x + 20,
          y: el.y + 20,
          zIndex: templateRef.current.elements.length + clones.length + 1,
        });
      }
    });
    const next = { ...templateRef.current, elements: [...templateRef.current.elements, ...clones] };
    setTemplate(next);
    templateRef.current = next;
    setSelectedIds(clones.map((c) => c.id));
    commitHistory(next);
  };

  const bringForward = () => {
    if (selectedIds.length === 0) return;
    
    // Check if any selected items are groups
    const selectedGroups = templateRef.current.groups?.filter(g => selectedIds.includes(g.id)) || [];
    
    if (selectedGroups.length > 0) {
      // For groups, collect all elements from all selected groups
      const allGroupElements = selectedGroups.flatMap(group => 
        templateRef.current.elements.filter(el => group.elementIds.includes(el.id))
      );
      const groupElementIds = allGroupElements.map(el => el.id);
      
      // Sort all elements and bring group elements forward together
      let els = [...templateRef.current.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
      
      // Move all group elements to the front as a unit
      const groupElements = els.filter(el => groupElementIds.includes(el.id));
      const nonGroupElements = els.filter(el => !groupElementIds.includes(el.id));
      
      // Bring group elements forward one step
                  const lastGroupIndex = els.map((el, index) => ({ el, index }))
                    .filter(({ el }) => groupElementIds.includes(el.id))
                    .pop()?.index ?? -1;
      if (lastGroupIndex < els.length - 1) {
        // Find the highest non-group element that's above the group
        for (let i = lastGroupIndex + 1; i < els.length; i++) {
          if (!groupElementIds.includes(els[i].id)) {
            // Swap the last group element with this non-group element
            [els[lastGroupIndex], els[i]] = [els[i], els[lastGroupIndex]];
            break;
          }
        }
      }
      
      // Reassign z-index values
      els.forEach((e, i) => (e.zIndex = i + 1));
      
      const next = { ...templateRef.current, elements: els };
      setTemplate(next);
      templateRef.current = next;
    } else {
      // For individual elements
    const els = [...templateRef.current.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    selectedIds.forEach((id) => {
      const idx = els.findIndex((e) => e.id === id);
      if (idx < els.length - 1) {
        [els[idx], els[idx + 1]] = [els[idx + 1], els[idx]];
      }
    });
    els.forEach((e, i) => (e.zIndex = i + 1));
    const next = { ...templateRef.current, elements: els };
    setTemplate(next);
    templateRef.current = next;
    }
    commitHistory();
  };

  const sendBackward = () => {
    if (selectedIds.length === 0) return;
    const els = [...templateRef.current.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    selectedIds.reverse().forEach((id) => {
      const idx = els.findIndex((e) => e.id === id);
      if (idx > 0) {
        [els[idx - 1], els[idx]] = [els[idx], els[idx - 1]];
      }
    });
    els.forEach((e, i) => (e.zIndex = i + 1));
    const next = { ...templateRef.current, elements: els };
    setTemplate(next);
    templateRef.current = next;
    commitHistory(next);
  };

  const bringToFront = () => {
    if (selectedIds.length === 0) return;
    let els = [...templateRef.current.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    const selected = els.filter((e) => selectedIds.includes(e.id));
    const nonSelected = els.filter((e) => !selectedIds.includes(e.id));
    els = [...nonSelected, ...selected];
    els.forEach((e, i) => (e.zIndex = i + 1));
    const next = { ...templateRef.current, elements: els };
    setTemplate(next);
    templateRef.current = next;
    commitHistory(next);
  };

  const sendToBack = () => {
    if (selectedIds.length === 0) return;
    let els = [...templateRef.current.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    const selected = els.filter((e) => selectedIds.includes(e.id));
    const nonSelected = els.filter((e) => !selectedIds.includes(e.id));
    els = [...selected, ...nonSelected];
    els.forEach((e, i) => (e.zIndex = i + 1));
    const next = { ...templateRef.current, elements: els };
    setTemplate(next);
    templateRef.current = next;
    commitHistory(next);
  };

  // ---------- Import / Export ----------
  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(String(ev.target?.result)) as MenuBoardTemplate;
        setTemplate(imported);
        templateRef.current = imported;
        setHistory([imported]);
        setHistoryIndex(0);
        alert('Template imported successfully!');
      } catch {
        alert('Invalid template file.');
      }
    };
    reader.readAsText(file);
    e.currentTarget.value = '';
  };

  const handleExportJson = () => {
    const json = JSON.stringify(templateRef.current, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${templateRef.current.name}.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper function to check for broken images
  const checkForBrokenImages = () => {
    const images = document.querySelectorAll('img');
    const brokenImages: string[] = [];
    
    images.forEach(img => {
      if (!img.complete || img.naturalWidth === 0) {
        brokenImages.push(img.src);
      }
    });
    
    return brokenImages;
  };

  const handleDownloadImage = async () => {
    try {
      setIsDownloading(true);
      const template = templateRef.current;
      
      console.log('Starting PNG export...', { 
        template: !!template, 
        innerRef: !!innerRef.current,
        canvasSize: template?.canvasSize 
      });

      if (!template) {
        throw new Error('No template loaded');
      }

    if (!innerRef.current) {
        throw new Error('Canvas element not found');
      }

      // Check if canvas has content
      const canvasElement = innerRef.current;
      const hasContent = canvasElement.children.length > 0;
      console.log('Canvas content check:', { 
        childrenCount: canvasElement.children.length, 
        hasContent 
      });

      if (!hasContent) {
        throw new Error('Canvas appears to be empty. Please add some elements first.');
      }

      // Wait for any pending renders and images to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Pre-process images to handle broken URLs
      const images = canvasElement.querySelectorAll('img');
      console.log('Found', images.length, 'images to check');
      
      for (const img of images) {
        if (!img.complete || img.naturalWidth === 0) {
          console.log('Broken image detected:', img.src);
          // Replace broken images with a placeholder
          img.style.display = 'none';
          const placeholder = document.createElement('div');
          placeholder.style.width = img.style.width || img.width + 'px';
          placeholder.style.height = img.style.height || img.height + 'px';
          placeholder.style.backgroundColor = '#f0f0f0';
          placeholder.style.border = '2px dashed #ccc';
          placeholder.style.display = 'flex';
          placeholder.style.alignItems = 'center';
          placeholder.style.justifyContent = 'center';
          placeholder.style.fontSize = '12px';
          placeholder.style.color = '#666';
          placeholder.textContent = 'Image';
          img.parentNode?.insertBefore(placeholder, img);
        }
      }

      // Try multiple export methods
      let dataUrl: string;
      
      try {
        // Method 1: Try with explicit options and skip broken images
        dataUrl = await domToImage.toPng(canvasElement, {
        width: template.canvasSize.width,
        height: template.canvasSize.height,
        style: {
            transform: "scale(1)",
          transformOrigin: "top left",
        },
          quality: 1.0,
          pixelRatio: 1,
          bgcolor: '#ffffff',
          filter: (node) => {
            // Skip broken images
            if (node.nodeType === 1 && (node as Element).tagName === 'IMG') {
              const img = node as HTMLImageElement;
              return img.complete && img.naturalWidth > 0;
            }
            // Skip toolbar and selection elements
            if (node.nodeType === 1) {
              const element = node as Element;
              // Check for toolbar by looking for specific buttons or classes
              if (element.querySelector('.w-7.h-7.text-gray-900') && 
                  element.classList.contains('absolute') &&
                  element.classList.contains('flex')) {
                return false; // Skip toolbar
              }
              // For PNG export, remove selection border styling from elements
              if (element.classList.contains('border-blue-500') && 
                  element.classList.contains('border-dashed')) {
                // Remove the selection border classes for export
                element.classList.remove('border-blue-500', 'border-dashed', 'border-2');
                (element as HTMLElement).style.border = 'none';
              }
              // Skip resize handles and rotation elements
              if (element.getAttribute('data-handle')) {
                return false; // Skip resize handles
              }
              // Skip rotation handle line (green line between element and rotation handle)
              if (element.classList.contains('bg-green-500') && 
                  element.classList.contains('w-px')) {
                return false; // Skip rotation handle line
              }
              // Skip group elements (purple borders and labels)
              if (element.classList.contains('border-purple-500') && 
                  element.classList.contains('border-dashed')) {
                return false; // Skip group selection border
              }
              if (element.classList.contains('bg-purple-500') && 
                  element.classList.contains('text-white')) {
                return false; // Skip group label
              }
              if (element.classList.contains('bg-purple-500/95') || 
                  element.classList.contains('bg-purple-500')) {
                return false; // Skip group toolbar
              }
            }
            return true;
          }
        });
        console.log('Method 1 successful');
      } catch (method1Error) {
        console.log('Method 1 failed, trying method 2:', method1Error);
        
        try {
          // Method 2: Try with minimal options and skip broken images
          dataUrl = await domToImage.toPng(canvasElement, {
            bgcolor: '#ffffff',
            filter: (node) => {
              // Skip broken images
              if (node.nodeType === 1 && (node as Element).tagName === 'IMG') {
                const img = node as HTMLImageElement;
                return img.complete && img.naturalWidth > 0;
              }
              // Skip toolbar and selection elements
              if (node.nodeType === 1) {
                const element = node as Element;
                // Check for toolbar by looking for specific buttons or classes
                if (element.querySelector('.w-7.h-7.text-gray-900') && 
                    element.classList.contains('absolute') &&
                    element.classList.contains('flex')) {
                  return false; // Skip toolbar
                }
                // For PNG export, remove selection border styling from elements
                if (element.classList.contains('border-blue-500') && 
                    element.classList.contains('border-dashed')) {
                  // Remove the selection border classes for export
                  element.classList.remove('border-blue-500', 'border-dashed', 'border-2');
                  (element as HTMLElement).style.border = 'none';
                }
                // Skip resize handles and rotation elements
                if (element.getAttribute('data-handle')) {
                  return false; // Skip resize handles
                }
                // Skip rotation handle line (green line between element and rotation handle)
                if (element.classList.contains('bg-green-500') && 
                    element.classList.contains('w-px')) {
                  return false; // Skip rotation handle line
                }
                // Skip group elements (purple borders and labels)
                if (element.classList.contains('border-purple-500') && 
                    element.classList.contains('border-dashed')) {
                  return false; // Skip group selection border
                }
                if (element.classList.contains('bg-purple-500') && 
                    element.classList.contains('text-white')) {
                  return false; // Skip group label
                }
                if (element.classList.contains('bg-purple-500/95') || 
                    element.classList.contains('bg-purple-500')) {
                  return false; // Skip group toolbar
                }
              }
              return true;
            }
          });
          console.log('Method 2 successful');
        } catch (method2Error) {
          console.log('Method 2 failed, trying method 3:', method2Error);
          
          try {
            // Method 3: Try with default options
            dataUrl = await domToImage.toPng(canvasElement);
            console.log('Method 3 successful');
          } catch (method3Error) {
            console.log('Method 3 failed, trying method 4 (html2canvas):', method3Error);
            
            // Method 4: Try html2canvas if available
            if (typeof (window as any).html2canvas !== 'undefined') {
              const canvas = await (window as any).html2canvas(canvasElement, {
                width: template.canvasSize.width,
                height: template.canvasSize.height,
                backgroundColor: '#ffffff',
                scale: 1
              });
              dataUrl = canvas.toDataURL('image/png');
              console.log('Method 4 (html2canvas) successful');
            } else {
              console.log('All dom-to-image methods failed, trying html-to-image...');
              
              try {
                // Method 5: Try html-to-image library
                dataUrl = await htmlToImage.toPng(canvasElement, {
                  width: template.canvasSize.width,
                  height: template.canvasSize.height,
                  backgroundColor: '#ffffff',
                  pixelRatio: 1,
                  filter: (node) => {
                    // Skip toolbar and selection elements
                    if (node.nodeType === 1) {
                      const element = node as Element;
                      // Check for toolbar by looking for specific buttons or classes
                      if (element.querySelector('.w-7.h-7.text-gray-900') && 
                          element.classList.contains('absolute') &&
                          element.classList.contains('flex')) {
                        return false; // Skip toolbar
                      }
                      // For PNG export, remove selection border styling from elements
                      if (element.classList.contains('border-blue-500') && 
                          element.classList.contains('border-dashed')) {
                        // Remove the selection border classes for export
                        element.classList.remove('border-blue-500', 'border-dashed', 'border-2');
                        (element as HTMLElement).style.border = 'none';
                      }
                      // Skip resize handles and rotation elements
                      if (element.getAttribute('data-handle')) {
                        return false; // Skip resize handles
                      }
                      // Skip rotation handle line (green line between element and rotation handle)
                      if (element.classList.contains('bg-green-500') && 
                          element.classList.contains('w-px')) {
                        return false; // Skip rotation handle line
                      }
                      // Skip group elements (purple borders and labels)
                      if (element.classList.contains('border-purple-500') && 
                          element.classList.contains('border-dashed')) {
                        return false; // Skip group selection border
                      }
                      if (element.classList.contains('bg-purple-500') && 
                          element.classList.contains('text-white')) {
                        return false; // Skip group label
                      }
                      if (element.classList.contains('bg-purple-500/95') || 
                          element.classList.contains('bg-purple-500')) {
                        return false; // Skip group toolbar
                      }
                    }
                    return true;
                  }
                });
                console.log('Method 5 (html-to-image) successful');
              } catch (htmlToImageError) {
                console.log('html-to-image failed, trying manual canvas method...', htmlToImageError);
                
                // Method 6: Manual canvas method as last resort
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = template.canvasSize.width;
                canvas.height = template.canvasSize.height;
                
                if (!ctx) {
                  throw new Error('Canvas context not available');
                }
                
                // Fill with white background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // This is a basic fallback - it won't capture complex elements
                // but at least it will create a PNG with the canvas size
                dataUrl = canvas.toDataURL('image/png');
                console.log('Method 6 (manual canvas) successful - basic fallback');
              }
            }
          }
        }
      }

      console.log('Generated data URL length:', dataUrl?.length);

      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) {
        throw new Error(`Invalid image data generated (length: ${dataUrl?.length || 0})`);
      }

      // Create download
      const a = document.createElement("a");
      a.download = `${template.name || 'menu-board'}.png`;
      a.href = dataUrl;
      
      // Add to DOM temporarily to ensure click works
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      console.log('PNG download initiated successfully');
      
    } catch (err) {
      console.error("PNG export error details:", err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // More specific error messages
      if (errorMessage.includes('Canvas element not found')) {
        alert('❌ Canvas not found. Please refresh the page and try again.');
      } else if (errorMessage.includes('empty')) {
        alert('❌ Canvas is empty. Please add some elements (text, images, shapes) before downloading.');
      } else if (errorMessage.includes('Invalid image data')) {
        alert('❌ Failed to generate image. The canvas might have complex elements. Try simplifying the design or refresh and try again.');
      } else if (errorMessage.includes('404') || errorMessage.includes('cannot fetch resource')) {
        alert('❌ PNG Download Failed - Broken Images Detected\n\nSome images in your design have broken URLs (404 errors).\n\n💡 Solutions:\n• Replace broken images with working URLs\n• Use the "Debug" button to check which images are broken\n• Try downloading without images (text-only version)\n• Refresh the page and try again');
      } else {
        alert(`❌ PNG Download Failed\n\nError: ${errorMessage}\n\n💡 Try:\n• Refresh the page\n• Simplify the design\n• Check if images are loaded\n• Try again in a moment`);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // High-resolution PNG export
  const handleDownloadImageHighRes = async () => {
    try {
      setIsDownloading(true);
      const template = templateRef.current;
      
      if (!template || !innerRef.current) {
        throw new Error('Canvas not ready');
      }

      const canvasElement = innerRef.current;
      if (canvasElement.children.length === 0) {
        throw new Error('Canvas is empty');
      }

      // High-resolution export using domToImage with higher quality
      const dataUrl = await domToImage.toPng(canvasElement, {
        width: template.canvasSize.width,
        height: template.canvasSize.height,
        style: {
          transform: "scale(2)", // 2x scale for higher resolution
          transformOrigin: "top left"
        },
        bgcolor: '#ffffff',
        quality: 1.0,
        pixelRatio: 2, // Higher pixel ratio for crisp output
        filter: (node) => {
          // Skip broken images and export UI elements
          if (node.nodeType === 1) {
            const element = node as Element;
            if (element.tagName === 'IMG') {
              const img = element as HTMLImageElement;
              // Skip images that failed to load
              if (!img.complete || img.naturalWidth === 0) {
                return false;
              }
            }
            // Skip UI elements
            if (element.classList.contains('export-dropdown') ||
                element.classList.contains('floating-toolbar') ||
                element.classList.contains('selection-rectangle') ||
                element.classList.contains('border-blue-500') ||
                element.classList.contains('border-purple-500')) {
              return false;
            }
          }
          return true;
        }
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${template.name}-high-res.png`;
      a.click();
      URL.revokeObjectURL(dataUrl);
    } catch (error) {
      console.error('Failed to download high-res PNG:', error);
      // Fallback to regular PNG export
      try {
        await handleDownloadImage();
      } catch (fallbackError) {
        const brokenImages = checkForBrokenImages();
        if (brokenImages.length > 0) {
          alert(`Failed to download high-res PNG.\n\nBroken images detected:\n${brokenImages.slice(0, 3).join('\n')}\n\nPlease replace these images with working ones.`);
        } else {
          alert('Failed to download high-res PNG. Please try again.');
        }
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // SVG export
  const handleDownloadSVG = async () => {
    try {
      setIsDownloading(true);
      const template = templateRef.current;
      
      if (!template || !innerRef.current) {
        throw new Error('Canvas not ready');
      }

      const canvasElement = innerRef.current;
      if (canvasElement.children.length === 0) {
        throw new Error('Canvas is empty');
      }

      const svgDataUrl = await domToImage.toSvg(canvasElement, {
        width: template.canvasSize.width,
        height: template.canvasSize.height,
        bgcolor: '#ffffff',
        quality: 1.0,
        filter: (node) => {
          // Skip broken images and export UI elements
          if (node.nodeType === 1) {
            const element = node as Element;
            if (element.tagName === 'IMG') {
              const img = element as HTMLImageElement;
              // Skip images that failed to load
              if (!img.complete || img.naturalWidth === 0) {
                return false;
              }
            }
            // Skip UI elements
            if (element.classList.contains('export-dropdown') ||
                element.classList.contains('floating-toolbar') ||
                element.classList.contains('selection-rectangle') ||
                element.classList.contains('border-blue-500') ||
                element.classList.contains('border-purple-500')) {
              return false;
            }
          }
          return true;
        }
      });

      const a = document.createElement('a');
      a.href = svgDataUrl;
      a.download = `${template.name}.svg`;
      a.click();
      URL.revokeObjectURL(svgDataUrl);
    } catch (error) {
      console.error('Failed to download SVG:', error);
      const brokenImages = checkForBrokenImages();
      if (brokenImages.length > 0) {
        alert(`Failed to download SVG.\n\nBroken images detected:\n${brokenImages.slice(0, 3).join('\n')}\n\nPlease replace these images with working ones.`);
      } else {
        alert('Failed to download SVG. Please try again.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // PDF export (using SVG as intermediate)
  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const template = templateRef.current;
      
      if (!template || !innerRef.current) {
        throw new Error('Canvas not ready');
      }

      const canvasElement = innerRef.current;
      if (canvasElement.children.length === 0) {
        throw new Error('Canvas is empty');
      }

      // First get SVG data using domToImage
      const svgDataUrl = await domToImage.toSvg(canvasElement, {
        width: template.canvasSize.width,
        height: template.canvasSize.height,
        bgcolor: '#ffffff',
        quality: 1.0,
        filter: (node) => {
          // Skip broken images and export UI elements
          if (node.nodeType === 1) {
            const element = node as Element;
            if (element.tagName === 'IMG') {
              const img = element as HTMLImageElement;
              // Skip images that failed to load
              if (!img.complete || img.naturalWidth === 0) {
                return false;
              }
            }
            // Skip UI elements
            if (element.classList.contains('export-dropdown') ||
                element.classList.contains('floating-toolbar') ||
                element.classList.contains('selection-rectangle') ||
                element.classList.contains('border-blue-500') ||
                element.classList.contains('border-purple-500')) {
              return false;
            }
          }
          return true;
        }
      });

      // Convert SVG to PDF using a simple approach
      // For now, we'll download as SVG with PDF extension
      // In a real implementation, you'd use a library like jsPDF
      const a = document.createElement('a');
      a.href = svgDataUrl;
      a.download = `${template.name}.pdf`;
      a.click();
      URL.revokeObjectURL(svgDataUrl);
      
      // Note: This is a simplified PDF export. For true PDF generation,
      // you would need to integrate with jsPDF or similar library
      alert('📄 PDF Export Note:\n\nThis exports as SVG format with .pdf extension.\nFor true PDF generation, additional libraries would be needed.');
      
    } catch (error) {
      console.error('Failed to download PDF:', error);
      const brokenImages = checkForBrokenImages();
      if (brokenImages.length > 0) {
        alert(`Failed to download PDF.\n\nBroken images detected:\n${brokenImages.slice(0, 3).join('\n')}\n\nPlease replace these images with working ones.`);
      } else {
        alert('Failed to download PDF. Please try again.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // ---------- Keyboard shortcuts ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
        deleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
      }
      // arrow keys nudge
      if (selectedIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        setTemplate((prev) => {
          const list = prev.elements.map((el) => {
            if (!selectedIds.includes(el.id)) return el;
            switch (e.key) {
              case 'ArrowUp':
                return { ...el, y: el.y - delta };
              case 'ArrowDown':
                return { ...el, y: el.y + delta };
              case 'ArrowLeft':
                return { ...el, x: el.x - delta };
              case 'ArrowRight':
                return { ...el, x: el.x + delta };
              default:
                return el;
            }
          });
          const next = { ...prev, elements: list };
          templateRef.current = next;
          return next;
        });
      }
      // Layering shortcuts: [ for backward, ] for forward
      if (selectedIds.length > 0 && e.key === '[') {
        sendBackward();
      }
      if (selectedIds.length > 0 && e.key === ']') {
        bringForward();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, undo]);

  // ---------- Rendering helpers ----------
  const sortedElements = useMemo(
    () => [...template.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
    [template.elements]
  );

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const angleRad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
  };

  const buildArcPath = (w: number, h: number, r: number, arcAngle: number, clockwise: boolean) => {
    const cx = w / 2;
    const cy = h / 2;
    const startAngle = 180 - arcAngle / 2;
    const endAngle = 180 + arcAngle / 2;
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, endAngle);
    const largeArcFlag = arcAngle > 180 ? 1 : 0;
    const sweepFlag = clockwise ? 1 : 0;
    return `M ${start.x},${start.y} A ${r},${r} 0 ${largeArcFlag} ${sweepFlag} ${end.x},${end.y}`;
  };

  const buildCirclePath = (w: number, h: number, r: number, clockwise: boolean) => {
    const cx = w / 2;
    const cy = h / 2;
    // Full circle as two arcs to satisfy SVG arc command limitations
    const start = polarToCartesian(cx, cy, r, 0);
    const mid = polarToCartesian(cx, cy, r, 180);
    const sweepFlag = clockwise ? 1 : 0;
    return `M ${start.x},${start.y} A ${r},${r} 0 1 ${sweepFlag} ${mid.x},${mid.y} A ${r},${r} 0 1 ${sweepFlag} ${start.x},${start.y}`;
  };

  // Generate gradient definition for SVG
  const generateGradientDef = (el: MenuBoardElement) => {
    if (!el.textGradient || el.textGradient === 'none' || !el.textGradientColors?.length) return null;
    
    const gradientId = `gradient-${el.id}`;
    const colors = el.textGradientColors.length >= 2 ? el.textGradientColors : ['#000000', '#FFFFFF'];
    
    if (el.textGradient === 'linear') {
      const angle = el.textGradientDirection || 0;
      const radians = (angle * Math.PI) / 180;
      const x1 = 0.5 - Math.cos(radians) * 0.5;
      const y1 = 0.5 - Math.sin(radians) * 0.5;
      const x2 = 0.5 + Math.cos(radians) * 0.5;
      const y2 = 0.5 + Math.sin(radians) * 0.5;
      
      return (
        <defs>
          <linearGradient id={gradientId} x1={x1} y1={y1} x2={x2} y2={y2}>
            {colors.map((color, index) => (
              <stop key={index} offset={`${(index / (colors.length - 1)) * 100}%`} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
      );
    } else if (el.textGradient === 'radial') {
      return (
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            {colors.map((color, index) => (
              <stop key={index} offset={`${(index / (colors.length - 1)) * 100}%`} stopColor={color} />
            ))}
          </radialGradient>
        </defs>
      );
    }
    return null;
  };

  // Generate shadow filter for SVG
  const generateShadowFilter = (el: MenuBoardElement) => {
    if (!el.shadowType || el.shadowType === 'none') return null;
    
    const filterId = `shadow-${el.id}`;
    const color = el.shadowColor || '#000000';
    const blur = el.shadowBlur || 4;
    const offsetX = el.shadowOffsetX || 2;
    const offsetY = el.shadowOffsetY || 2;
    
    return (
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx={offsetX}
            dy={offsetY}
            stdDeviation={blur / 2}
            floodColor={color}
            floodOpacity="0.5"
          />
        </filter>
      </defs>
    );
  };

  const renderGroup = (group: MenuBoardGroup) => {
    const selected = selectedIds.includes(group.id);
    const isGroupSelected = selected;
    
    return (
      <div
        key={group.id}
        className="absolute select-none"
        style={{
          left: group.x,
          top: group.y,
          width: group.width,
          height: group.height,
          transform: 'none',
          opacity: 1,
          zIndex: 1000, // Groups should be above elements
          pointerEvents: 'auto', // Allow group interactions
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          setSelectedIds([group.id]);
          if (!group.locked) {
            startGroupDrag(e, group.id);
          }
        }}
      >
        {/* Group selection border */}
        {isGroupSelected && (
          <div 
            className="absolute inset-0 border-2 border-purple-500 border-dashed pointer-events-none"
            style={{
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              transform: 'none'
            }}
          />
        )}
        
        {/* Group label */}
        <div 
          className="absolute -top-6 left-0 text-xs bg-purple-500 text-white px-2 py-1 rounded pointer-events-none flex items-center space-x-1"
          style={{
            fontSize: '10px',
            fontWeight: 'bold'
          }}
        >
          <span>{group.name}</span>
          {group.locked && <LockIcon className="w-3 h-3" />}
        </div>
      </div>
    );
  };

  const renderElement = (el: MenuBoardElement) => {
    const selected = selectedIds.includes(el.id);
    
    return (
      <div
        key={el.id}
        className="absolute select-none"
        style={{
          left: el.x,
          top: el.y,
          width: el.width,
          height: el.height,
          transform: `scaleX(${el.scaleX ?? 1}) scaleY(${el.scaleY ?? 1}) rotate(${el.rotation || 0}deg)`,
          opacity: el.opacity ?? 1,
          boxShadow: el.shadow ?? 'none',
          zIndex: el.zIndex,
          color: el.color || '#FFFFFF',
          fontSize: el.fontSize || 16,
          fontWeight: el.fontWeight || 'normal',
          fontFamily: el.fontFamily || 'Arial',
          whiteSpace: 'pre-line',
          // 🚨 don't force background/border on wrapper if it's a shape
          backgroundColor: el.type === 'shape' ? 'transparent' : (el.backgroundColor || 'transparent'),
          borderRadius: el.type === 'shape' ? 0 : (el.borderRadius || 0),
        }}
        onMouseDown={(e) => {
          if (el.locked) {
            // Allow selection of locked elements but prevent dragging
            e.stopPropagation();
            setSelectedIds([el.id]);
            return;
          }
          startDrag(e, el.id);
        }}
      >
        {/* Lock indicator */}
        {el.locked && (
          <div className="absolute top-1 right-1 z-10 bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg">
            <LockIcon className="w-3 h-3" />
          </div>
        )}
        
        {el.type === 'text' || el.type === 'price' || el.type === 'promotion' ? (
          <>
            {el.textLayout && el.textLayout !== 'straight' ? (
              <svg width={el.width} height={el.height} viewBox={`0 0 ${el.width} ${el.height}`} className="w-full h-full">
                {generateGradientDef(el)}
                {generateShadowFilter(el)}
                <defs>
                  <path
                    id={`path-${el.id}`}
                    d={
                      (() => {
                        const pad = (el.fontSize || 16) / 2 + (el.textStrokeWidth || 0) + 4;
                        const safeR = Math.max(1, (el.textRadius ?? Math.min(el.width, el.height) / 2) - pad);
                        return el.textLayout === 'circle'
                          ? buildCirclePath(el.width, el.height, safeR, (el.textDirection || 'clockwise') === 'clockwise')
                          : buildArcPath(
                              el.width,
                              el.height,
                              safeR,
                              Math.max(10, Math.min(360, el.textArcAngle ?? 180)),
                              (el.textDirection || 'clockwise') === 'clockwise'
                            );
                      })()
                    }
                    fill="none"
                  />
                </defs>
                <text
                  fill={el.textGradient && el.textGradient !== 'none' ? `url(#gradient-${el.id})` : (el.color || '#FFFFFF')}
                  stroke={el.textStrokeColor || 'none'}
                  strokeWidth={el.textStrokeWidth ? String(el.textStrokeWidth) : undefined}
                  paintOrder={el.textStrokeWidth ? 'stroke fill' : undefined}
                  fontFamily={el.fontFamily || 'Arial'}
                  fontWeight={el.fontWeight || 'normal'}
                  fontSize={el.fontSize || 16}
                  filter={el.shadowType && el.shadowType !== 'none' ? `url(#shadow-${el.id})` : undefined}
                  style={{ letterSpacing: `${el.textSpacing ?? 0}px`, textShadow: el.textShadow || 'none' }}
                >
                  <textPath
                    href={`#path-${el.id}`}
                    startOffset="50%"
                    textAnchor="middle"
                    alignmentBaseline="middle"
          >
            {el.content}
                  </textPath>
                </text>
              </svg>
            ) : (
              <svg width={el.width} height={el.height} viewBox={`0 0 ${el.width} ${el.height}`} className="w-full h-full">
                {generateGradientDef(el)}
                {generateShadowFilter(el)}
                <text
                  x="50%"
                  y="50%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fill={el.textGradient && el.textGradient !== 'none' ? `url(#gradient-${el.id})` : (el.color || '#FFFFFF')}
                  stroke={el.textStrokeColor || 'none'}
                  strokeWidth={el.textStrokeWidth ? String(el.textStrokeWidth) : undefined}
                  paintOrder={el.textStrokeWidth ? 'stroke fill' : undefined}
                  fontFamily={el.fontFamily || 'Arial'}
                  fontWeight={el.fontWeight || 'normal'}
                  fontSize={el.fontSize || 16}
                  filter={el.shadowType && el.shadowType !== 'none' ? `url(#shadow-${el.id})` : undefined}
                  style={{ letterSpacing: `${el.textSpacing ?? 0}px`, textShadow: el.textShadow || 'none' }}
                >
                  {el.content}
                </text>
              </svg>
            )}
          </>
        ) : el.type === 'shape' ? (
          <div className="w-full h-full flex items-center justify-center">
            {el.shapeType === 'rectangle' && (
              <div 
                className="w-full h-full relative" 
                style={{ 
                  backgroundColor: el.backgroundColor, 
                  borderRadius: el.borderRadius, 
                  border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.strokeColor || 'transparent'}` : undefined,
                  overflow: 'hidden'
                }}
              >
                {el.shapeImageUrl && (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${el.shapeImageUrl})`,
                      backgroundSize: el.shapeImageFit || 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                )}
              </div>
            )}
            {el.shapeType === 'circle' && (
              <div 
                className="w-full h-full rounded-full relative overflow-hidden" 
                style={{ 
                  backgroundColor: el.backgroundColor, 
                  border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.strokeColor || 'transparent'}` : undefined
                }}
              >
                {el.shapeImageUrl && (
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundImage: `url(${el.shapeImageUrl})`,
                      backgroundSize: el.shapeImageFit || 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                )}
              </div>
            )}
            {el.shapeType === 'triangle' && (
              <div className="relative w-full h-full">
              <div
                  className="absolute inset-0"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: `${el.width / 2}px solid transparent`,
                  borderRight: `${el.width / 2}px solid transparent`,
                  borderBottom: `${el.height}px solid ${el.backgroundColor}`,
                  }}
                />
                {el.shapeImageUrl && (
                  <div
                    className="absolute inset-0"
                    style={{
                      clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                      backgroundImage: `url(${el.shapeImageUrl})`,
                      backgroundSize: el.shapeImageFit || 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                )}
              </div>
            )}
            {el.shapeType === 'star' && (
              <div className="relative w-full h-full">
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                  {el.shapeImageUrl && (
                    <defs>
                      <pattern id={`star-pattern-${el.id}`} patternUnits="userSpaceOnUse" width="100" height="100">
                        <image href={el.shapeImageUrl} width="100" height="100" preserveAspectRatio="xMidYMid slice" />
                      </pattern>
                    </defs>
                  )}
                <polygon
                  points="50,5 61,39 98,39 67,59 79,91 50,72 21,91 33,59 2,39 39,39"
                    fill={el.shapeImageUrl ? `url(#star-pattern-${el.id})` : el.backgroundColor}
                    stroke={el.strokeColor}
                    strokeWidth={el.strokeWidth || 0}
                />
              </svg>
              </div>
            )}
            {el.shapeType === 'hexagon' && (
              <div className="relative w-full h-full">
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                  {el.shapeImageUrl && (
                    <defs>
                      <pattern id={`hexagon-pattern-${el.id}`} patternUnits="userSpaceOnUse" width="100" height="100">
                        <image href={el.shapeImageUrl} width="100" height="100" preserveAspectRatio="xMidYMid slice" />
                      </pattern>
                    </defs>
                  )}
                  <polygon
                    points="50,5 85,25 85,75 50,95 15,75 15,25"
                    fill={el.shapeImageUrl ? `url(#hexagon-pattern-${el.id})` : el.backgroundColor}
                    stroke={el.strokeColor}
                    strokeWidth={el.strokeWidth || 0}
                  />
                </svg>
              </div>
            )}
            {el.shapeType === 'heart' && (
              <div className="relative w-full h-full">
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                  {el.shapeImageUrl && (
                    <defs>
                      <pattern id={`heart-pattern-${el.id}`} patternUnits="userSpaceOnUse" width="100" height="100">
                        <image href={el.shapeImageUrl} width="100" height="100" preserveAspectRatio="xMidYMid slice" />
                      </pattern>
                    </defs>
                  )}
                  <path
                    d="M50,85 C50,85 20,55 20,35 C20,25 30,15 40,15 C45,15 50,20 50,20 C50,20 55,15 60,15 C70,15 80,25 80,35 C80,55 50,85 50,85 Z"
                    fill={el.shapeImageUrl ? `url(#heart-pattern-${el.id})` : el.backgroundColor}
                    stroke={el.strokeColor}
                    strokeWidth={el.strokeWidth || 0}
                  />
                </svg>
              </div>
            )}
            {el.shapeType === 'diamond' && (
              <div className="relative w-full h-full">
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                  {el.shapeImageUrl && (
                    <defs>
                      <pattern id={`diamond-pattern-${el.id}`} patternUnits="userSpaceOnUse" width="100" height="100">
                        <image href={el.shapeImageUrl} width="100" height="100" preserveAspectRatio="xMidYMid slice" />
                      </pattern>
                    </defs>
                  )}
                  <polygon
                    points="50,5 95,50 50,95 5,50"
                    fill={el.shapeImageUrl ? `url(#diamond-pattern-${el.id})` : el.backgroundColor}
                    stroke={el.strokeColor}
                    strokeWidth={el.strokeWidth || 0}
                  />
                </svg>
              </div>
            )}
          </div>
        ) : el.type === 'image' ? (
          <div
            className="w-full h-full bg-gray-300 rounded overflow-hidden"
            style={{ borderRadius: el.borderRadius || 0, backgroundColor: 'transparent' }}
          >
            {el.imageUrl ? (
              <img src={el.imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 opacity-60" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: 'transparent' }} />
        )}

        {/* Resize handles */}
        {selected && !el.locked && (
          <>
            {/* Corners */}
            <div
              data-handle="resize"
              className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nw-resize shadow"
              onMouseDown={(e) => startResize(e, el.id, 'tl')}
            />
            <div
              data-handle="resize"
              className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-ne-resize shadow"
              onMouseDown={(e) => startResize(e, el.id, 'tr')}
            />
            <div
              data-handle="resize"
              className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-sw-resize shadow"
              onMouseDown={(e) => startResize(e, el.id, 'bl')}
            />
            <div
              data-handle="resize"
              className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-se-resize shadow"
              onMouseDown={(e) => startResize(e, el.id, 'br')}
            />

            {/* Edges */}
            <div
              data-handle="resize"
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-n-resize shadow"
              onMouseDown={(e) => startResize(e, el.id, 'tm')}
            />
            <div
              data-handle="resize"
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-s-resize shadow"
              onMouseDown={(e) => startResize(e, el.id, 'bm')}
            />
            <div
              data-handle="resize"
              className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-w-resize shadow"
              onMouseDown={(e) => startResize(e, el.id, 'ml')}
            />
            <div
              data-handle="resize"
              className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-e-resize shadow"
              onMouseDown={(e) => startResize(e, el.id, 'mr')}
            />
          </>
        )}

        {/* Rotation handle - only show when selected and not locked */}
        {selected && !el.locked && (
          <>
        <div
          data-handle="rotate"
              className="absolute -top-8 left-1/2 -translate-x-1/2 w-5 h-5 bg-green-500 border-2 border-white rounded-full cursor-grab hover:bg-green-600 transition-colors"
          onMouseDown={(e) => startRotate(e, el.id)}
              title="Rotate"
        />
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-px h-5 bg-green-500" />
          </>
        )}

        {/* Selection border overlay - doesn't affect element position */}
        {selected && (
          <div 
            className="absolute inset-0 border-2 border-blue-500 border-dashed pointer-events-none"
            style={{
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              transform: 'none'
            }}
          />
        )}

      </div>
    );
  };

  // ---------- UI ----------
  return (
    <div className="h-screen bg-gray-100 flex">
      {/* Left Toolbar */}
      <div id="editor-left-toolbar" className="w-20 bg-gray-900 flex flex-col items-center py-4 px-2 space-y-3 relative">
        {/* Section Header */}
        <div className="text-center mb-2">
          <div className="text-xs text-gray-400 font-medium">Add Elements</div>
          <div className="text-[10px] text-gray-500 mt-1">Click to add</div>
        </div>
        
        <button
          onClick={() => addElement('text')}
          className="w-11 h-11 bg-gray-700 hover:bg-blue-600 rounded-lg flex flex-col items-center justify-center text-white transition-all duration-150 hover:scale-105 group relative"
          title="Add Text (Press 1)"
        >
          <Type className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-medium leading-tight">Text</span>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 scale-0 group-hover:scale-100 shadow-lg">
            1
          </div>
        </button>
        <button
          onClick={() => addElement('image')}
          className="w-11 h-11 bg-gray-700 hover:bg-green-600 rounded-lg flex flex-col items-center justify-center text-white transition-all duration-150 hover:scale-105 group relative"
          title="Add Image (Press 2)"
        >
          <ImageIcon className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-medium leading-tight">Image</span>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 scale-0 group-hover:scale-100 shadow-lg">
            2
          </div>
        </button>
        <button
          onClick={() => setShowImageLibrary(true)}
          className="w-11 h-11 bg-gray-700 hover:bg-indigo-600 rounded-lg flex flex-col items-center justify-center text-white transition-all duration-150 hover:scale-105 group relative"
          title="Image Library"
        >
          <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] font-medium leading-tight">Library</span>
        </button>
        <div className="relative">
        <button
            onClick={() => setShowShapePicker((s) => !s)}
          className="w-11 h-11 bg-gray-700 hover:bg-purple-600 rounded-lg flex flex-col items-center justify-center text-white transition-all duration-150 hover:scale-105 group relative"
          title="Add Shape (Press 4)"
        >
          <Square className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-medium leading-tight">Shape</span>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 scale-0 group-hover:scale-100 shadow-lg">
            4
          </div>
        </button>

          {showShapePicker && (
            <div className="fixed left-16 top-24 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-3 w-56" id="editor-shape-picker">
              <div className="text-xs font-medium text-gray-700 mb-2">Add Shape</div>
              {/* Quick color presets */}
              <div className="mb-2 flex items-center gap-2">
                {['#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6','#111827','#FFFFFF'].map((c) => (
                  <button key={c} className="w-5 h-5 rounded border" style={{ backgroundColor: c, borderColor: '#e5e7eb' }} title={c}
                    onClick={() => setShapeColor(c)}>
                  </button>
                ))}
                <input type="color" value={shapeColor} onChange={(e)=>setShapeColor(e.target.value)} className="w-6 h-6 border rounded" />
              </div>
              {/* Stroke quick controls */}
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[10px] text-gray-500">Stroke</span>
                <input type="color" value={normalizeColor(shapeStrokeColor || '#000000')} onChange={(e)=>setShapeStrokeColor(e.target.value)} className="w-6 h-6 border rounded" />
                <input type="number" min={0} max={10} value={shapeStrokeWidth} onChange={(e)=>setShapeStrokeWidth(Math.max(0, Math.min(10, parseInt(e.target.value)||0)))} className="w-12 h-6 border rounded text-[10px] px-1" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button className="aspect-square rounded border hover:bg-gray-50 flex items-center justify-center" title="Rectangle" onClick={() => addShape('rectangle')}>
                  <div className="w-8 h-5 bg-blue-500 rounded"></div>
                </button>
                <button className="aspect-square rounded border hover:bg-gray-50 flex items-center justify-center" title="Rounded" onClick={() => addShape('rounded')}>
                  <div className="w-8 h-5 bg-blue-500 rounded-lg"></div>
                </button>
                <button className="aspect-square rounded border hover:bg-gray-50 flex items-center justify-center" title="Circle" onClick={() => addShape('circle')}>
                  <div className="w-7 h-7 bg-blue-500 rounded-full"></div>
                </button>
                <button className="aspect-square rounded border hover:bg-gray-50 flex items-center justify-center" title="Triangle" onClick={() => addShape('triangle')}>
                  <svg width="28" height="28" viewBox="0 0 100 100"><polygon points="50,10 90,90 10,90" fill="#3B82F6"/></svg>
                </button>
                <button className="aspect-square rounded border hover:bg-gray-50 flex items-center justify-center" title="Diamond" onClick={() => addShape('diamond')}>
                  <svg width="28" height="28" viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill="#3B82F6"/></svg>
                </button>
                <button className="aspect-square rounded border hover:bg-gray-50 flex items-center justify-center" title="Hexagon" onClick={() => addShape('hexagon')}>
                  <svg width="28" height="28" viewBox="0 0 100 100"><polygon points="25,10 75,10 95,50 75,90 25,90 5,50" fill="#3B82F6"/></svg>
                </button>
                <button className="aspect-square rounded border hover:bg-gray-50 flex items-center justify-center" title="Star" onClick={() => addShape('star')}>
                  <svg width="28" height="28" viewBox="0 0 100 100"><polygon points="50,5 61,38 95,38 67,58 78,90 50,70 22,90 33,58 5,38 39,38" fill="#3B82F6"/></svg>
                </button>
                <button className="aspect-square rounded border hover:bg-gray-50 flex items-center justify-center" title="Heart" onClick={() => addShape('heart')}>
                  <svg width="28" height="28" viewBox="0 0 100 100"><path d="M50 85 L15 50 A20 20 0 0 1 50 25 A20 20 0 0 1 85 50 Z" fill="#3B82F6"/></svg>
                </button>
              </div>
              <div className="mt-2 text-[10px] text-gray-500">Click a shape to insert</div>
            </div>
          )}
        </div>
        <button
          onClick={() => addElement('price')}
          className="w-11 h-11 bg-gray-700 hover:bg-yellow-600 rounded-lg flex flex-col items-center justify-center text-white transition-all duration-150 hover:scale-105 group relative"
          title="Add Price Tag (Press 3)"
        >
          <DollarSign className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-medium leading-tight">Price</span>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 scale-0 group-hover:scale-100 shadow-lg">
            3
          </div>
        </button>
        <button
          onClick={() => addElement('promotion')}
          className="w-11 h-11 bg-gray-700 hover:bg-red-600 rounded-lg flex flex-col items-center justify-center text-white transition-all duration-150 hover:scale-105 group relative"
          title="Add Promotion Badge (Press 5)"
        >
          <Zap className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-medium leading-tight">Badge</span>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 scale-0 group-hover:scale-100 shadow-lg">
            5
          </div>
        </button>
        {/* Divider */}
        <div className="w-8 h-px bg-gray-600 my-2"></div>
        
        <button
          onClick={undo}
          className="w-11 h-11 bg-gray-700 hover:bg-orange-600 rounded-lg flex flex-col items-center justify-center text-white transition-all duration-150 hover:scale-105 group"
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-medium leading-tight">Undo</span>
        </button>
        <button
          onClick={redo}
          className="w-11 h-11 bg-gray-700 hover:bg-orange-600 rounded-lg flex flex-col items-center justify-center text-white transition-all duration-150 hover:scale-105 group"
          title="Redo (Ctrl+Shift+Z)"
        >
          <RotateCw className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-medium leading-tight">Redo</span>
        </button>
        {/* Section Header */}
        <div className="text-center">
          <div className="text-xs text-gray-400 font-medium mb-2">Tools</div>
        </div>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-11 h-11 bg-gray-700 hover:bg-indigo-600 rounded-lg flex flex-col items-center justify-center text-white transition-all duration-150 hover:scale-105 group"
          title="Import Template (JSON)"
        >
          <Upload className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-medium leading-tight">JSON</span>
        </button>
        <input type="file" ref={fileInputRef} onChange={handleImportTemplate} accept=".json" className="hidden" />
        <button
          onClick={() => htmlInputRef.current?.click()}
          className="w-11 h-11 bg-gray-700 hover:bg-green-600 rounded-lg flex flex-col items-center justify-center text-white transition-all duration-150 hover:scale-105 group"
          title="Import HTML/CSS"
        >
          <Upload className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-medium leading-tight">HTML</span>
        </button>
        <input type="file" ref={htmlInputRef} onChange={handleImportHtml} accept=".html" className="hidden" />
        <input type="file" ref={cssInputRef} accept=".css" className="hidden" />
        <button
          onClick={() => setShowImportHelp(true)}
          className="w-11 h-11 bg-gray-700 hover:bg-gray-600 rounded-lg flex flex-col items-center justify-center text-white transition-all duration-150 hover:scale-105 group"
          title="Import Help - Click for instructions"
        >
          <HelpCircle className="w-4 h-4 mb-1" />
          <span className="text-[10px] font-medium leading-tight">Help</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top Header - Redesigned */}
        <div className="bg-gradient-to-r from-slate-50 to-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
          {/* Left Section - Navigation & Title */}
          <div className="flex items-center space-x-6">
            <button 
              onClick={onBack} 
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors group"
            >
              <div className="p-1 rounded-lg group-hover:bg-gray-100 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="font-medium">Back</span>
            </button>
            
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Square className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{template.name}</h1>
                <p className="text-sm text-gray-500">Menu Board Editor</p>
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-4">
            {/* View Controls */}
            <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
              <button 
                onClick={() => {
                  // Initialize saveAction to 'update' for user templates by default
                  if (template.isUserTemplate && !template.saveAction) {
                    const updated = { ...templateRef.current, saveAction: 'update' as const };
                    setTemplate(updated);
                    templateRef.current = updated;
                  }
                  setShowTemplateSettings(true);
                }} 
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                title="Template Settings"
              >
                <div className="w-4 h-4">⚙️</div>
                <span>Settings</span>
            </button>
              
              <div className="w-px h-6 bg-gray-200" />
              
              <button 
                onClick={() => setShowKeyboardHelp(!showKeyboardHelp)} 
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                title="Keyboard Shortcuts"
              >
                <div className="w-4 h-4">⌨️</div>
                <span>Shortcuts</span>
              </button>
          </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
              <button 
                onClick={zoomOut} 
                className="p-2 hover:bg-gray-50 rounded-md transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-gray-600" />
              </button>
              <div className="px-3 py-2 min-w-[4rem] text-center">
                <span className="text-sm font-semibold text-gray-900">{Math.round(zoom * 100)}%</span>
              </div>
              <button 
                onClick={zoomIn} 
                className="p-2 hover:bg-gray-50 rounded-md transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            {/* Preview Button */}
            <button
              onClick={() => setShowPreview((s) => !s)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm ${
                showPreview 
                  ? 'bg-blue-600 text-white shadow-blue-200' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
            >
              <Eye className="w-4 h-4" />
              <span className="font-medium">Preview</span>
            </button>

            {/* Action Buttons Group */}
            <div id="editor-header-actions" className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            {/* Export Dropdown */}
            <div className="relative export-dropdown">
            <button
                disabled={isDownloading}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                onClick={() => setShowExportDropdown(!showExportDropdown)}
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
              <Download className="w-4 h-4" />
                    <span>Export</span>
                    <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
            </button>
              
              {showExportDropdown && !isDownloading && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[220px] overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-medium text-gray-600">Export Format</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleDownloadImage();
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-3 transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Download className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">PNG Standard</div>
                        <div className="text-xs text-gray-500">Regular resolution</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleDownloadImageHighRes();
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center space-x-3 transition-colors"
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Download className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">PNG High-res</div>
                        <div className="text-xs text-gray-500">4K resolution</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleDownloadSVG();
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center space-x-3 transition-colors"
                    >
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Download className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">SVG Vector</div>
                        <div className="text-xs text-gray-500">Scalable format</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleDownloadPDF();
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center space-x-3 transition-colors"
                    >
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <Download className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <div className="font-medium">PDF Print</div>
                        <div className="text-xs text-gray-500">Print ready</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
              
              <div className="w-px h-6 bg-gray-200" />
              
            <button
              onClick={handleExportJson}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
            </div>
            {/* Save Button */}
            <button
              onClick={async () => {
                // Debug logging
                console.log('🔍 Save button clicked');
                console.log('Template flags:', {
                  isUserTemplate: template.isUserTemplate,
                  isDefaultTemplate: template.isDefaultTemplate,
                  name: template.name,
                  preview: template.preview,
                });
                
                // For user templates, ALWAYS show modal to choose Update vs Save as New
                // For default templates, ALWAYS show modal with info
                // For others, only show if details are missing
                const hasName = templateRef.current.name && templateRef.current.name.trim() !== '';
                const hasDescription = templateRef.current.preview && templateRef.current.preview.trim() !== '';
                const isUserOrDefaultTemplate = template.isUserTemplate || template.isDefaultTemplate;
                
                console.log('Should show modal:', {
                  isUserOrDefaultTemplate,
                  hasName,
                  hasDescription,
                  category: templateRef.current.category,
                });
                
                if (isUserOrDefaultTemplate || !hasName || !hasDescription || templateRef.current.category === 'custom') {
                  // Initialize saveAction to 'update' for user templates by default
                  if (template.isUserTemplate && !template.saveAction) {
                    const updated = { ...templateRef.current, saveAction: 'update' as const };
                    setTemplate(updated);
                    templateRef.current = updated;
                  }
                  // Show template settings modal
                  console.log('✅ Showing template settings modal');
                  setShowTemplateSettings(true);
                  return;
                }
                
                console.log('⚠️ Skipping modal, directly saving...');
                
                // Generate PNG using the same export logic and pass blob back
                const canvasElement = innerRef.current;
                if (!canvasElement) { onSave(templateRef.current); return; }
                try {
                  // Temporarily hide any selection UI
                  const prevSelectedIds = selectedIds;
                  const prevSelectionRect = selectionRect;
                  setIsExporting(true);
                  setSelectedIds([]);
                  setSelectionRect(null);
                  await new Promise(res => setTimeout(res, 0));
                  // Reuse the exact manual export path to produce a dataUrl
                  let dataUrl: string;
                  try {
                    dataUrl = await domToImage.toPng(canvasElement, {
                      width: templateRef.current.canvasSize.width,
                      height: templateRef.current.canvasSize.height,
                      style: { transform: 'scale(1)', transformOrigin: 'top left' },
                      quality: 1.0,
                      pixelRatio: THUMBNAIL_PIXEL_RATIO,
                      bgcolor: '#ffffff',
                      filter: (node) => {
                        if (node.nodeType === 1 && (node as Element).tagName === 'IMG') {
                          const img = node as HTMLImageElement;
                          return img.complete && img.naturalWidth > 0;
                        }
                        return true;
                      }
                    });
                  } catch {
                    dataUrl = await domToImage.toPng(canvasElement);
                  }
                  // Downscale to keep size reasonable while staying sharp
                  const img = new Image();
                  await new Promise((r) => { img.onload = () => r(null); img.src = dataUrl; });
                  const maxEdge = THUMBNAIL_MAX_EDGE;
                  const scale = Math.min(1, Math.min(maxEdge / img.width, maxEdge / img.height));
                  const targetW = Math.max(1, Math.round(img.width * scale));
                  const targetH = Math.max(1, Math.round(img.height * scale));
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  canvas.width = targetW; canvas.height = targetH;
                  if (ctx) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, targetW, targetH); }
                  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/png'));
                  onSave(templateRef.current, { thumbnailBlob: blob });
                } catch {
                  onSave(templateRef.current);
                } finally {
                  // Restore selection UI
                  setSelectedIds(prevSelectedIds);
                  setSelectionRect(prevSelectionRect);
                  setIsExporting(false);
                }
              }}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Save Template</span>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div id="editor-top-toolbar" className="bg-white border-b border-gray-200 px-4 py-2 flex items-center space-x-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg ${showGrid ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'} hover:bg-gray-200 transition-colors`}
              title="Toggle Grid"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowRulers(!showRulers)}
              className={`p-2 rounded-lg ${showRulers ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'} hover:bg-gray-200 transition-colors`}
              title="Toggle Rulers"
            >
              <Ruler className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300" />
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`p-2 rounded-lg ${snapToGrid ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'} hover:bg-gray-200 transition-colors`}
              title="Snap to Grid"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1" />
          <div className="text-sm text-gray-500">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'No selection'}
          </div>
        </div>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Canvas Area */}
          <div id="editor-canvas-area" className="flex-1 overflow-auto bg-gray-200 p-8">
            <div className="mx-auto max-w-max">
              {/* Wrapper sized to scaled dimensions so scrollbars reflect zoom */}
              <div
                ref={wrapperRef}
                className="relative shadow-2xl bg-white border-4 border-blue-500"
                style={{
                  width: template.canvasSize.width,
                  height: template.canvasSize.height,
                }}
                onMouseDown={handleCanvasMouseDown}
              >
                {/* Canvas size label (kept inside to avoid clipping) */}
                <div className="absolute top-2 left-2 bg-blue-500/90 text-white px-2 py-1 rounded text-xs font-medium shadow">
                  {template.canvasSize.width} × {template.canvasSize.height}px
                  {template.canvasSize.category === 'custom' && (
                    <span className="ml-1 text-yellow-300">●</span>
                  )}
                </div>

                {/* Grid overlay */}
                {showGrid && (
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
                      `,
                      backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                    }}
                  />
                )}

                {/* Guides */}
                {guides.map(guide => (
                  <div
                    key={guide.id}
                    className="absolute pointer-events-none z-10"
                    style={{
                      [guide.type === 'vertical' ? 'left' : 'top']: guide.position * zoom,
                      [guide.type === 'vertical' ? 'width' : 'height']: '1px',
                      [guide.type === 'vertical' ? 'height' : 'width']: '100%',
                      backgroundColor: '#3B82F6',
                      cursor: guide.type === 'vertical' ? 'col-resize' : 'row-resize',
                    }}
                    onDoubleClick={() => removeGuide(guide.id)}
                  />
                ))}

                {/* Selection Rectangle */}
                {!isExporting && selectionRect && (
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-20"
                    style={{
                      left: Math.min(selectionRect.x, selectionRect.x + selectionRect.width) * zoom,
                      top: Math.min(selectionRect.y, selectionRect.y + selectionRect.height) * zoom,
                      width: Math.abs(selectionRect.width) * zoom,
                      height: Math.abs(selectionRect.height) * zoom,
                    }}
                  />
                )}

                {/* Unscaled inner canvas (we scale this only) */}
                <div
                  id="editor-inner-canvas"
                  ref={innerRef}
                  className="absolute top-0 left-0"
                  style={{
                    width: template.canvasSize.width,
                    height: template.canvasSize.height,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    backgroundColor: template.backgroundColor || 'transparent',
                    backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : undefined,
                    backgroundSize: template.backgroundImageFit || 'cover',
                    backgroundPosition: template.backgroundImagePosition || 'center',
                    overflow: 'visible',
                  }}
                >
                  {sortedElements.map(renderElement)}
                  
                  {/* Render groups */}
                  {(templateRef.current.groups || []).map(renderGroup)}
                  
                  
                  {/* Floating toolbars */}
                  {!isExporting && selectedIds.length === 1 && (() => {
                    const selectedEl = templateRef.current.elements.find(e => e.id === selectedIds[0]);
                    const selectedGroup = templateRef.current.groups?.find(g => g.id === selectedIds[0]);
                    
                    // If it's a group, show group toolbar
                    if (selectedGroup) {
                      return (
                        <div 
                          className="absolute flex items-center space-x-2 bg-purple-500/95 text-white backdrop-blur rounded-lg shadow-lg px-3 py-2 border border-purple-300" 
                          style={{ 
                            zIndex: 2147483647,
                            left: selectedGroup.x + selectedGroup.width / 2,
                            top: selectedGroup.y - 100,
                            transform: 'translateX(-50%)'
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">Group Tools</span>
                            <span className="text-xs opacity-75">{selectedGroup.name}</span>
                </div>
                          <button 
                            title={selectedGroup.locked ? "Unlock Group" : "Lock Group"}
                            className={`p-2 rounded hover:bg-purple-600 ${selectedGroup.locked ? 'text-yellow-400' : 'text-white'}`}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              updateGroup(selectedGroup.id, { locked: !selectedGroup.locked });
                            }}
                          >
                            {selectedGroup.locked ? <LockIcon className="w-7 h-7" /> : <UnlockIcon className="w-7 h-7" />}
                          </button>
                          <button 
                            title="Ungroup (Ctrl+Shift+G)" 
                            className="p-2 rounded hover:bg-purple-600" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              ungroupElements(); 
                            }}
                          >
                            <Ungroup className="w-7 h-7" />
                          </button>
                </div>
                      );
                    }
                    
                    // If it's an element, show element toolbar
                    if (!selectedEl) return null;
                    
                    return (
                      <div 
                        className="absolute bg-white/95 text-gray-800 backdrop-blur rounded-lg shadow-lg border border-gray-200" 
                        style={{ 
                          zIndex: 2147483647,
                          left: selectedEl.x + selectedEl.width / 2,
                          top: selectedEl.y - 120,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        {/* Toolbar Header */}
                        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium capitalize">{selectedEl.type} Tools</span>
                            {selectedEl.locked && <LockIcon className="w-4 h-4 text-yellow-600" />}
                          </div>
                        </div>
                        
                        {/* Toolbar Buttons */}
                        <div className="flex items-center space-x-1 p-2">
                        {/* + and - buttons - context sensitive */}
                        {selectedEl.type === 'image' ? (
                          <>
                            <button title="Decrease opacity" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); updateElement(selectedEl.id, { opacity: Math.max(0.1, (selectedEl.opacity || 1) - 0.1) }, true); }}>
                              <Minus className="w-7 h-7 text-gray-900" />
                            </button>
                            <button title="Increase opacity" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); updateElement(selectedEl.id, { opacity: Math.min(1, (selectedEl.opacity || 1) + 0.1) }, true); }}>
                              <Plus className="w-7 h-7 text-gray-900" />
                            </button>
                          </>
                        ) : selectedEl.type === 'shape' ? (
                          <>
                            <button title="Decrease opacity" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); updateElement(selectedEl.id, { opacity: Math.max(0.1, (selectedEl.opacity || 1) - 0.1) }, true); }}>
                              <Minus className="w-7 h-7 text-gray-900" />
                            </button>
                            <button title="Increase opacity" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); updateElement(selectedEl.id, { opacity: Math.min(1, (selectedEl.opacity || 1) + 0.1) }, true); }}>
                              <Plus className="w-7 h-7 text-gray-900" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button title="Decrease font" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); updateElement(selectedEl.id, { fontSize: Math.max(1, (selectedEl.fontSize || 16) - 2) }, true); }}>
                              <Minus className="w-7 h-7 text-gray-900" />
                            </button>
                            <button title="Increase font" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); updateElement(selectedEl.id, { fontSize: (selectedEl.fontSize || 16) + 2 }, true); }}>
                              <Plus className="w-7 h-7 text-gray-900" />
                            </button>
                          </>
                        )}
                        {(selectedEl.type === 'text' || selectedEl.type === 'price' || selectedEl.type === 'promotion') && (
                          <>
                            <button title="Toggle bold" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); updateElement(selectedEl.id, { fontWeight: selectedEl.fontWeight === 'bold' ? 'normal' : 'bold' }, true); }}>
                              <BoldIcon className="w-7 h-7 text-gray-900" />
                            </button>
                            <button title="Cycle text layout" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); const next = selectedEl.textLayout === 'straight' ? 'arc' : selectedEl.textLayout === 'arc' ? 'circle' : 'straight'; updateElement(selectedEl.id, { textLayout: next as any }, true); }}>
                              <CircleIcon className="w-7 h-7 text-gray-900" />
                            </button>
                          </>
                        )}
                        <button title={selectedEl.locked ? 'Unlock' : 'Lock'} className={`p-1 rounded ${selectedEl.locked ? 'bg-yellow-200' : 'hover:bg-gray-200'}`} onClick={(e) => { e.stopPropagation(); updateElement(selectedEl.id, { locked: !selectedEl.locked }, true); }}>
                          {selectedEl.locked ? <UnlockIcon className="w-7 h-7 text-gray-900" /> : <LockIcon className="w-7 h-7 text-gray-900" />}
                        </button>
                        <button title="Copy (Ctrl+C)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); copySelectedElements(); }}>
                          <Copy className="w-7 h-7 text-gray-900" />
                        </button>
                        <button title="Paste (Ctrl+V)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); pasteElements(); }} disabled={clipboard.length === 0}>
                          <Clipboard className="w-7 h-7 text-gray-900" />
                        </button>
                        <button title="Duplicate (Ctrl+D)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); duplicateSelectedElements(); }}>
                          <CopyPlus className="w-7 h-7 text-gray-900" />
                        </button>
                        <button 
                          title={selectedEl.locked ? "Unlock Element" : "Lock Element"} 
                          className={`p-2 rounded hover:bg-gray-200 ${selectedEl.locked ? 'text-yellow-600' : 'text-gray-900'}`} 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            updateElement(selectedEl.id, { locked: !selectedEl.locked }, true); 
                          }}
                        >
                          {selectedEl.locked ? <LockIcon className="w-7 h-7" /> : <UnlockIcon className="w-7 h-7" />}
                        </button>
                        <button title="Delete (Del)" className="p-1 rounded hover:bg-red-200 text-red-700" onClick={(e) => { e.stopPropagation(); setSelectedIds([selectedEl.id]); deleteSelected(); }}>
                          <Trash2 className="w-7 h-7 text-gray-900" />
                        </button>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {selectedIds.length > 1 && (() => {
                    const selectedElements = templateRef.current.elements.filter(e => selectedIds.includes(e.id));
                    const selectedGroups = templateRef.current.groups?.filter(g => selectedIds.includes(g.id)) || [];
                    
                    // Show toolbar if we have multiple items selected (elements OR groups OR mixed)
                    const totalSelected = selectedElements.length + selectedGroups.length;
                    if (totalSelected < 2) {
                      return null;
                    }
                    
                    // Calculate bounds from all selected items (elements + groups)
                    const allSelectedItems = [
                      ...selectedElements,
                      ...selectedGroups
                    ];
                    
                    if (allSelectedItems.length === 0) return null;
                    
                    const minX = Math.min(...allSelectedItems.map(item => item.x));
                    const maxX = Math.max(...allSelectedItems.map(item => item.x + item.width));
                    const minY = Math.min(...allSelectedItems.map(item => item.y));
                    const centerX = (minX + maxX) / 2;
                    
                    return (
                      <div 
                        data-toolbar="multi-select"
                        className="absolute flex items-center space-x-2 bg-white/95 text-gray-800 backdrop-blur rounded-lg shadow-lg px-3 py-2 border border-gray-200" 
                        style={{ 
                          zIndex: 2147483647,
                          left: centerX,
                          top: minY - 100,
                          transform: 'translateX(-50%)',
                          pointerEvents: 'auto'
                        }}
                      >
                        <button title="Align Left" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); alignElements('left'); }}>
                          <AlignLeft className="w-7 h-7 text-gray-900" />
                        </button>
                        <button title="Align Center" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); alignElements('center'); }}>
                          <AlignCenter className="w-7 h-7 text-gray-900" />
                        </button>
                        <button title="Align Right" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); alignElements('right'); }}>
                          <AlignRight className="w-7 h-7" />
                        </button>
                        <button title="Align Top" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); alignElements('top'); }}>
                          <AlignCenterVertical className="w-7 h-7" />
                        </button>
                        <button title="Align Middle" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); alignElements('middle'); }}>
                          <AlignCenterVertical className="w-7 h-7" />
                        </button>
                        <button title="Distribute Horizontally" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); distributeElements('horizontal'); }}>
                          <AlignHorizontalDistributeCenter className="w-7 h-7" />
                        </button>
                        <button title="Distribute Vertically" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); distributeElements('vertical'); }}>
                          <AlignVerticalDistributeCenter className="w-7 h-7" />
                        </button>
                        <button title="Copy (Ctrl+C)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); copySelectedElements(); }}>
                          <Copy className="w-7 h-7" />
                        </button>
                        <button title="Paste (Ctrl+V)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); pasteElements(); }} disabled={clipboard.length === 0}>
                          <Clipboard className="w-7 h-7" />
                        </button>
                        <button title="Duplicate (Ctrl+D)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); duplicateSelectedElements(); }}>
                          <CopyPlus className="w-7 h-7" />
                        </button>
                        <button 
                          title={selectedIds.length < 2 ? "Group (Ctrl+G) - Need 2+ elements" : "Group (Ctrl+G)"}
                          className={`p-2 rounded ${selectedIds.length < 2 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                          disabled={selectedIds.length < 2}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (selectedIds.length >= 2) {
                              groupElements(); 
                            }
                          }}
                        >
                          <Group className="w-7 h-7" />
                        </button>
                        <button 
                          title="Ungroup (Ctrl+Shift+G)"
                          className={`p-2 rounded ${!selectedIds.some(id => templateRef.current.groups?.some(g => g.id === id)) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                          disabled={!selectedIds.some(id => templateRef.current.groups?.some(g => g.id === id))}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            ungroupElements(); 
                          }}
                        >
                          <Ungroup className="w-7 h-7" />
                        </button>
                      </div>
                    );
                  })()}
                  
                  {/* Smart guides overlay */}
                  {smartGuides.map((guide, index) => (
                    <div
                      key={index}
                      className="absolute pointer-events-none"
                      style={{
                        [guide.type === 'vertical' ? 'left' : 'top']: `${guide.position}px`,
                        [guide.type === 'vertical' ? 'top' : 'left']: 0,
                        [guide.type === 'vertical' ? 'width' : 'height']: '1px',
                        [guide.type === 'vertical' ? 'height' : 'width']: guide.type === 'vertical' ? '100%' : '100%',
                        backgroundColor: guide.color,
                        zIndex: 1000,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Properties Panel */}
          <div id="editor-right-properties" className="w-80 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
            <div className="p-4 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Element Properties</h3>
                  <p className="text-sm text-gray-500">Customize your selected element</p>
                </div>
                <Layers className="w-5 h-5 text-gray-400" />
              </div>

              {selectedIds.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Square className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h4 className="font-medium text-gray-700 mb-2">No Element Selected</h4>
                  <p className="text-sm">Click on any element on the canvas to customize its properties</p>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-left">
                    <p className="text-xs text-blue-700 font-medium mb-1">💡 Quick Tip:</p>
                    <p className="text-xs text-blue-600">Use the tools on the left to add new elements to your design</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={duplicateSelected}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <CopyPlus className="w-5 h-5" />
                      <span>Duplicate</span>
                    </button>
                    <button
                      onClick={deleteSelected}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span>Delete</span>
                    </button>
                    <button
                      onClick={bringForward}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <ArrowUp className="w-5 h-5" />
                      <span>Forward</span>
                    </button>
                    <button
                      onClick={sendBackward}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <ArrowDown className="w-5 h-5" />
                      <span>Backward</span>
                    </button>
                    <button
                      onClick={bringToFront}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <ArrowUp className="w-5 h-5" />
                      <span>To Front</span>
                    </button>
                    <button
                      onClick={sendToBack}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <ArrowDown className="w-5 h-5" />
                      <span>To Back</span>
                    </button>
                  </div>

                  {/* Center Elements */}
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        if (selectedIds.length === 0) return;
                        
                        const elements = selectedIds.map(id => templateRef.current.elements.find(e => e.id === id)).filter(Boolean);
                        if (elements.length === 0) return;
                        
                        // Calculate center position
                        const centerX = template.canvasSize.width / 2;
                        const centerY = template.canvasSize.height / 2;
                        
                        // Check if any selected items are groups
                        const selectedGroups = templateRef.current.groups?.filter(g => selectedIds.includes(g.id)) || [];
                        
                        if (selectedGroups.length > 0) {
                          // Handle groups
                          selectedGroups.forEach(group => {
                            const groupElements = templateRef.current.elements.filter(el => group.elementIds.includes(el.id));
                            if (groupElements.length > 0) {
                              const minX = Math.min(...groupElements.map(el => el.x));
                              const minY = Math.min(...groupElements.map(el => el.y));
                              const maxX = Math.max(...groupElements.map(el => el.x + el.width));
                              const maxY = Math.max(...groupElements.map(el => el.y + el.height));
                              
                              const groupWidth = maxX - minX;
                              const groupHeight = maxY - minY;
                              const offsetX = centerX - groupWidth / 2 - minX;
                              const offsetY = centerY - groupHeight / 2 - minY;
                              
                              // Move all elements in the group
                              groupElements.forEach(el => {
                                updateElement(el.id, {
                                  x: el.x + offsetX,
                                  y: el.y + offsetY,
                                }, false);
                              });
                              
                              // Update group position
                              updateGroup(group.id, {
                                x: group.x + offsetX,
                                y: group.y + offsetY,
                              });
                            }
                          });
                        } else if (elements.length === 1) {
                          // For single element, center it
                          const el = elements[0]!;
                          updateElement(el.id, {
                            x: centerX - el.width / 2,
                            y: centerY - el.height / 2,
                          }, false);
                        } else {
                          // For multiple elements, center the group
                          const minX = Math.min(...elements.map(el => el!.x));
                          const minY = Math.min(...elements.map(el => el!.y));
                          const maxX = Math.max(...elements.map(el => el!.x + el!.width));
                          const maxY = Math.max(...elements.map(el => el!.y + el!.height));
                          
                          const groupWidth = maxX - minX;
                          const groupHeight = maxY - minY;
                          const offsetX = centerX - groupWidth / 2 - minX;
                          const offsetY = centerY - groupHeight / 2 - minY;
                          
                          elements.forEach(el => {
                            updateElement(el!.id, {
                              x: el!.x + offsetX,
                              y: el!.y + offsetY,
                            }, false);
                          });
                        }
                        commitHistory();
                      }}
                      className="w-full flex items-center justify-center space-x-1 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm"
                    >
                      <div className="w-4 h-4 border-2 border-green-500 rounded-full"></div>
                      <span>Center on Canvas</span>
                    </button>
                  </div>

                  {/* Flip (for all elements) */}
                  {(selectedIds.length > 0) && (
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          selectedIds.forEach((sid) => {
                            const el = templateRef.current.elements.find(e => e.id === sid);
                            if (!el) return;
                            updateElement(sid, { scaleX: (el.scaleX === -1 ? 1 : -1) }, false);
                          });
                          commitHistory();
                        }}
                        className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                      >
                        <span>Flip Horizontal</span>
                      </button>
                      <button
                        onClick={() => {
                          selectedIds.forEach((sid) => {
                            const el = templateRef.current.elements.find(e => e.id === sid);
                            if (!el) return;
                            updateElement(sid, { scaleY: (el.scaleY === -1 ? 1 : -1) }, false);
                          });
                          commitHistory();
                        }}
                        className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                      >
                        <span>Flip Vertical</span>
                      </button>
                    </div>
                  )}

                  {selectedIds.map((id) => {
                    const el = templateRef.current.elements.find((e) => e.id === id);
                    if (!el) return null;

                    return (
                      <div key={id} className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium text-gray-500">
                          ID: <span className="font-mono">{id.slice(-8)}</span> · Type: {el.type}
                          </div>
                          <button
                            onClick={() => {
                              // Reset element to default values
                              const defaults: any = {
                                x: 50,
                                y: 50,
                                width: el.type === 'text' ? 200 : el.type === 'image' ? 150 : 100,
                                height: el.type === 'text' ? 50 : el.type === 'image' ? 150 : 100,
                                rotation: 0,
                                opacity: 1,
                                color: '#000000',
                                fontSize: 16,
                                fontWeight: 'normal',
                                fontFamily: 'Arial',
                                backgroundColor: el.type === 'shape' ? '#3B82F6' : 'transparent',
                                borderRadius: 0,
                                textShadow: 'none',
                                textGradient: 'none',
                                textStrokeColor: 'none',
                                textStrokeWidth: 0,
                                shadowType: 'none',
                              };
                              
                              // Keep only relevant properties for this element type
                              const relevantDefaults: any = {};
                              Object.keys(defaults).forEach(key => {
                                if (el.hasOwnProperty(key) || ['x', 'y', 'width', 'height', 'rotation', 'opacity'].includes(key)) {
                                  relevantDefaults[key] = defaults[key];
                                }
                              });
                              
                              updateElement(id, relevantDefaults, true);
                              commitHistory();
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                            title="Reset to defaults"
                          >
                            Reset
                          </button>
                        </div>

                        {/* Position & Size */}
                        <div className="mb-4">
                          <label className="block text-xs text-gray-600 mb-2 font-medium">Position & Size</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">X</label>
                            <input
                              type="number"
                              value={Math.round(el.x)}
                              onChange={(e) => updateElement(id, { x: parseFloat(e.target.value) || 0 }, true)}
                              className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Y</label>
                            <input
                              type="number"
                              value={Math.round(el.y)}
                              onChange={(e) => updateElement(id, { y: parseFloat(e.target.value) || 0 }, true)}
                              className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Width</label>
                            <input
                              type="number"
                              value={Math.round(el.width)}
                              onChange={(e) => updateElement(id, { width: Math.max(1, parseFloat(e.target.value) || 1) }, true)}
                              className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Height</label>
                            <input
                              type="number"
                              value={Math.round(el.height)}
                              onChange={(e) =>
                                updateElement(id, { height: Math.max(1, parseFloat(e.target.value) || 1) }, true)
                              }
                              className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          </div>
                        </div>

                        {/* Rotation */}
                        <div className="mt-3">
                          <label className="block text-xs text-gray-500 mb-1">Rotation</label>
                          <input
                            type="range"
                            min={-180}
                            max={180}
                            value={el.rotation || 0}
                            onChange={(e) => updateElement(id, { rotation: safeParseInt(e.target.value, 0, -360, 360) })}
                            onMouseUp={() => commitHistory()}
                            className="w-full"
                          />
                          <div className="text-center text-sm">{el.rotation || 0}{DEG}</div>
                        </div>

                        {/* Content / Image */}
                        {(el.type === 'text' || el.type === 'price' || el.type === 'promotion') && (
                          <div className="mt-3">
                            <label className="block text-xs text-gray-500 mb-1">Text</label>
                            <textarea
                              value={el.content || ''}
                              onChange={(e) => updateElement(id, { content: e.target.value })}
                              onBlur={() => commitHistory()}
                              className="w-full p-2 border border-gray-300 rounded text-sm"
                              rows={3}
                              placeholder="Enter text content..."
                            />
                          </div>
                        )}

                        {el.type === 'image' && (
                          <div className="mt-3 space-y-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Choose from Library</label>
                              <button
                                onClick={() => {
                                  setImageLibraryContext('existing-element');
                                  setImageLibraryTargetId(id);
                                  setShowImageLibrary(true);
                                }}
                                className="w-full bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-lg text-sm text-blue-700 font-medium"
                              >
                                Browse Library
                              </button>
                            </div>

                            <div className="relative">
                              <details className="group">
                                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 mb-1 flex items-center">
                                  <span>Advanced: Custom URL</span>
                                  <svg className="w-3 h-3 ml-1 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </summary>
                                <input
                                  type="url"
                                  value={el.imageUrl || ''}
                                  onChange={(e) => updateElement(id, { imageUrl: e.target.value })}
                                  onBlur={() => commitHistory()}
                                  className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                                  placeholder="Enter image URL..."
                                />
                              </details>
                            </div>
                          </div>
                        )}

                        {/* Image Actions */}
                        {el.type === 'image' && el.imageUrl && (
                          <div className="mt-3">
                            <button
                              onClick={() => {
                                // Fit image to canvas
                                const aspectRatio = el.width / el.height;
                                const canvasAspectRatio = template.canvasSize.width / template.canvasSize.height;
                                
                                let newWidth, newHeight;
                                if (aspectRatio > canvasAspectRatio) {
                                  // Image is wider, fit to width
                                  newWidth = template.canvasSize.width * 0.8;
                                  newHeight = newWidth / aspectRatio;
                                } else {
                                  // Image is taller, fit to height
                                  newHeight = template.canvasSize.height * 0.8;
                                  newWidth = newHeight * aspectRatio;
                                }
                                
                                updateElement(id, {
                                  width: newWidth,
                                  height: newHeight,
                                  x: (template.canvasSize.width - newWidth) / 2,
                                  y: (template.canvasSize.height - newHeight) / 2,
                                }, true);
                                commitHistory();
                              }}
                              className="w-full px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm"
                            >
                              Fit to Canvas
                            </button>
                          </div>
                        )}

                        {/* Typography */}
                        {(el.type === 'text' || el.type === 'price' || el.type === 'promotion') && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Font Size</label>
                              <input
                                type="number"
                                value={el.fontSize || 16}
                                onChange={(e) => updateElement(id, { fontSize: safeParseInt(e.target.value, 16, 8, 200) })}
                                onBlur={() => commitHistory()}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Weight</label>
                              <select
                                value={el.fontWeight || 'normal'}
                                onChange={(e) => updateElement(id, { fontWeight: e.target.value })}
                                onBlur={() => commitHistory()}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                              >
                                <option value="normal">Normal</option>
                                <option value="bold">Bold</option>
                                <option value="lighter">Light</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500 mb-1">Font Family</label>
                              <select
                                value={el.fontFamily || 'Arial'}
                                onChange={(e) => updateElement(id, { fontFamily: e.target.value })}
                                onBlur={() => commitHistory()}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                              >
                                <option value="Arial">Arial</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Verdana">Verdana</option>
                                <option value="Helvetica">Helvetica</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Impact">Impact</option>
                                <option value="Comic Sans MS">Comic Sans MS</option>
                                <option value="Trebuchet MS">Trebuchet MS</option>
                                <option value="Palatino">Palatino</option>
                                <option value="Garamond">Garamond</option>
                                <option value="Bookman">Bookman</option>
                                <option value="Avant Garde">Avant Garde</option>
                                <option value="Futura">Futura</option>
                                <option value="Roboto">Roboto</option>
                                <option value="Open Sans">Open Sans</option>
                                <option value="Lato">Lato</option>
                                <option value="Montserrat">Montserrat</option>
                                <option value="Poppins">Poppins</option>
                                <option value="Source Sans Pro">Source Sans Pro</option>
                              </select>
                            </div>

                            {/* Text Layout controls */}
                            <div className="col-span-2 mt-2">
                              <label className="block text-xs text-gray-500 mb-1">Text Layout</label>
                              <select
                                value={el.textLayout || 'straight'}
                                onChange={(e) => updateElement(id, { textLayout: e.target.value as any }, true)}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                              >
                                <option value="straight">Straight</option>
                                <option value="arc">Arc</option>
                                <option value="circle">Circle</option>
                              </select>
                            </div>

                            {(el.textLayout === 'arc' || el.textLayout === 'circle') && (
                              <>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Radius (px)</label>
                                  <input
                                    type="number"
                                    value={el.textRadius ?? Math.min(el.width, el.height) / 2}
                                    onChange={(e) => updateElement(id, { textRadius: Math.max(1, parseFloat(e.target.value) || 1) })}
                                    onBlur={() => commitHistory()}
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                {el.textLayout === 'arc' && (
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Arc Angle (deg)</label>
                                    <input
                                      type="number"
                                      min={10}
                                      max={360}
                                      value={el.textArcAngle ?? 180}
                                      onChange={(e) => updateElement(id, { textArcAngle: Math.max(10, Math.min(360, parseFloat(e.target.value) || 180)) })}
                                      onBlur={() => commitHistory()}
                                      className="w-full p-2 border border-gray-300 rounded text-sm"
                                    />
                                  </div>
                                )}
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Direction</label>
                                  <select
                                    value={el.textDirection || 'clockwise'}
                                    onChange={(e) => updateElement(id, { textDirection: e.target.value as any }, true)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                  >
                                    <option value="clockwise">Clockwise</option>
                                    <option value="counterclockwise">Counter Clockwise</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Letter Spacing (px)</label>
                                  <input
                                    type="number"
                                    value={el.textSpacing ?? 0}
                                    onChange={(e) => updateElement(id, { textSpacing: parseFloat(e.target.value) || 0 })}
                                    onBlur={() => commitHistory()}
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {el.type === 'shape' && (
                          <div className="mt-3 space-y-3">
                            <div>
                            <label className="block text-xs text-gray-500 mb-1">Shape Type</label>
                            <select
                              value={el.shapeType || 'rectangle'}
                              onChange={(e) => updateElement(id, { shapeType: e.target.value as any }, true)}
                              className="w-full p-2 border border-gray-300 rounded text-sm"
                            >
                              <option value="rectangle">Rectangle</option>
                              <option value="circle">Circle</option>
                              <option value="triangle">Triangle</option>
                              <option value="star">Star</option>
                                <option value="hexagon">Hexagon</option>
                                <option value="heart">Heart</option>
                                <option value="diamond">Diamond</option>
                            </select>
                            </div>
                            
                            {/* Shape Image Controls */}
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Background Image</label>
                              
                              {/* URL Input */}
                              <input
                                type="url"
                                value={el.shapeImageUrl || ''}
                                onChange={(e) => updateElement(id, { shapeImageUrl: e.target.value })}
                                onBlur={() => commitHistory()}
                                placeholder="Enter image URL..."
                                className="w-full p-2 border border-gray-300 rounded text-sm mb-2"
                              />
                              
                              {/* Library Button */}
                              <button
                                onClick={() => {
                                  setImageLibraryContext('shape-image');
                                  setImageLibraryTargetId(id);
                                  setShowImageLibrary(true);
                                }}
                                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors text-sm font-medium"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Choose from Library</span>
                              </button>
                              
                              {el.shapeImageUrl && (
                                <div className="mt-3 space-y-2">
                                  {/* Image Preview */}
                                  <div className="relative">
                                    <img
                                      src={el.shapeImageUrl}
                                      alt="Shape preview"
                                      className="w-full h-20 object-cover rounded border"
                                      onError={(e) => {
                                        console.log('Image failed to load:', el.shapeImageUrl);
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs cursor-pointer hover:bg-red-600"
                                         onClick={() => updateElement(id, { shapeImageUrl: undefined }, true)}
                                         title="Remove Image">
                                      ×
                                    </div>
                                  </div>
                                  
                                  {/* Image Fit Options */}
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Image Fit</label>
                                    <select
                                      value={el.shapeImageFit || 'cover'}
                                      onChange={(e) => updateElement(id, { shapeImageFit: e.target.value as any }, true)}
                                      className="w-full p-2 border border-gray-300 rounded text-sm"
                                    >
                                      <option value="cover">Cover (Fill)</option>
                                      <option value="contain">Contain (Fit)</option>
                                      <option value="fill">Fill (Stretch)</option>
                                      <option value="fit-width">Fit Width</option>
                                      <option value="fit-height">Fit Height</option>
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Colors */}
                        <div className="mt-3 space-y-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Text Color</label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="color"
                                value={normalizeColor(el.color || '#000000')}
                                onChange={(e) => updateElement(id, { color: safeColorUpdate(e.target.value) })}
                                onBlur={() => commitHistory()}
                                className="w-8 h-8 rounded border border-gray-300"
                              />
                              <input
                                type="text"
                                value={normalizeColor(el.color || '#000000')}
                                onChange={(e) => updateElement(id, { color: safeColorUpdate(e.target.value) })}
                                onBlur={() => commitHistory()}
                                className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono"
                              />
                            </div>
                          </div>
                          {(el.type === 'text' || el.type === 'price' || el.type === 'promotion') && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Text Outline</label>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2 flex items-center space-x-2">
                                  <input
                                    type="color"
                                    value={normalizeColor(el.textStrokeColor || '#000000')}
                                    onChange={(e) => updateElement(id, { textStrokeColor: e.target.value })}
                                    onBlur={() => commitHistory()}
                                    className="w-8 h-8 rounded border border-gray-300"
                                  />
                                  <input
                                    type="text"
                                    value={normalizeColor(el.textStrokeColor || '#000000')}
                                    onChange={(e) => updateElement(id, { textStrokeColor: e.target.value })}
                                    onBlur={() => commitHistory()}
                                    className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono"
                                  />
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    step={0.5}
                                    value={el.textStrokeWidth ?? 0}
                                    onChange={(e) => {
                                      const value = Math.max(0, Math.min(20, parseFloat(e.target.value) || 0));
                                      updateElement(id, { textStrokeWidth: value });
                                    }}
                                    onBlur={() => commitHistory()}
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          {(el.type === 'shape' || el.type === 'promotion') && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Background</label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="color"
                                  value={normalizeColor(el.backgroundColor || '#000000')}
                                  onChange={(e) => updateElement(id, { backgroundColor: e.target.value })}
                                  onBlur={() => commitHistory()}
                                  className="w-8 h-8 rounded border border-gray-300"
                                />
                                <input
                                  type="text"
                                  value={normalizeColor(el.backgroundColor || '#000000')}
                                  onChange={(e) => updateElement(id, { backgroundColor: e.target.value })}
                                  onBlur={() => commitHistory()}
                                  className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono"
                                />
                              </div>
                            </div>
                          )}

                          {el.type === 'shape' && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Shape Stroke</label>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2 flex items-center space-x-2">
                                  <input
                                    type="color"
                                    value={normalizeColor((el as any).strokeColor || '#000000')}
                                    onChange={(e) => updateElement(id, { strokeColor: e.target.value } as any)}
                                    onBlur={() => commitHistory()}
                                    className="w-8 h-8 rounded border border-gray-300"
                                  />
                                  <input
                                    type="text"
                                    value={normalizeColor((el as any).strokeColor || '#000000')}
                                    onChange={(e) => updateElement(id, { strokeColor: e.target.value } as any)}
                                    onBlur={() => commitHistory()}
                                    className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono"
                                  />
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    step={0.5}
                                    value={(el as any).strokeWidth ?? 0}
                                    onChange={(e) => {
                                      const value = Math.max(0, Math.min(20, parseFloat(e.target.value) || 0));
                                      updateElement(id, { strokeWidth: value } as any);
                                    }}
                                    onBlur={() => commitHistory()}
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Border Radius / Opacity / Shadow */}
                        {(el.type === 'shape' || el.type === 'image' || el.type === 'promotion') && (
                          <div className="mt-3">
                            <label className="block text-xs text-gray-500 mb-1">Border Radius</label>
                            <input
                              type="number"
                              value={el.borderRadius || 0}
                              onChange={(e) => updateElement(id, { borderRadius: parseInt(e.target.value, 10) || 0 })}
                              onBlur={() => commitHistory()}
                              className="w-full p-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        )}

                        <div className="mt-3">
                          <label className="block text-xs text-gray-500 mb-1">Opacity</label>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={el.opacity ?? 1}
                            onChange={(e) => updateElement(id, { opacity: parseFloat(e.target.value) })}
                            onMouseUp={() => commitHistory()}
                            className="w-full"
                          />
                          <div className="text-center text-sm">{(el.opacity ?? 1).toFixed(2)}</div>
                        </div>

                        {/* Text Gradient */}
                        <div className="mt-3">
                          <label className="block text-xs text-gray-500 mb-1">Text Gradient</label>
                          <select
                            value={el.textGradient || 'none'}
                            onChange={(e) => updateElement(id, { textGradient: e.target.value as any }, true)}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                          >
                            <option value="none">None</option>
                            <option value="linear">Linear</option>
                            <option value="radial">Radial</option>
                          </select>
                          {el.textGradient && el.textGradient !== 'none' && (
                            <div className="mt-2 space-y-2">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Gradient Colors</label>
                                <div className="flex space-x-1">
                                  {safeGradientColors(el.textGradientColors).map((color, index) => (
                                    <div key={index} className="flex items-center space-x-1">
                                      <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => {
                                          const colors = [...safeGradientColors(el.textGradientColors)];
                                          colors[index] = safeColorUpdate(e.target.value);
                                          updateElement(id, { textGradientColors: colors }, true);
                                        }}
                                        className="w-8 h-8 rounded border border-gray-300"
                                      />
                                      <button
                                        onClick={() => {
                                          const colors = [...safeGradientColors(el.textGradientColors)];
                                          if (colors.length > 2) {
                                            colors.splice(index, 1);
                                            updateElement(id, { textGradientColors: colors }, true);
                                          }
                                        }}
                                        className="text-xs text-red-600 hover:text-red-800"
                                        disabled={safeGradientColors(el.textGradientColors).length <= 2}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => {
                                      const colors = [...safeGradientColors(el.textGradientColors)];
                                      colors.push('#00FF00');
                                      updateElement(id, { textGradientColors: colors }, true);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              {el.textGradient === 'linear' && (
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Direction (degrees)</label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={360}
                                    value={el.textGradientDirection || 0}
                                    onChange={(e) => updateElement(id, { textGradientDirection: safeParseInt(e.target.value, 0, 0, 360) }, true)}
                                    className="w-full p-2 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Advanced Shadows */}
                        <div className="mt-3">
                          <label className="block text-xs text-gray-500 mb-1">Shadow Type</label>
                          <select
                            value={el.shadowType || 'none'}
                            onChange={(e) => updateElement(id, { shadowType: e.target.value as any }, true)}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                          >
                            <option value="none">None</option>
                            <option value="drop">Drop Shadow</option>
                            <option value="inner">Inner Shadow</option>
                          </select>
                          {el.shadowType && el.shadowType !== 'none' && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Color</label>
                                <input
                                  type="color"
                                  value={normalizeColor(el.shadowColor || '#000000')}
                                  onChange={(e) => updateElement(id, { shadowColor: safeColorUpdate(e.target.value) }, true)}
                                  className="w-full h-8 rounded border border-gray-300"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Blur</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={20}
                                  value={el.shadowBlur || 4}
                                  onChange={(e) => updateElement(id, { shadowBlur: safeParseInt(e.target.value, 4, 0, 20) }, true)}
                                  className="w-full p-2 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Offset X</label>
                                <input
                                  type="number"
                                  min={-20}
                                  max={20}
                                  value={el.shadowOffsetX || 2}
                                  onChange={(e) => updateElement(id, { shadowOffsetX: parseInt(e.target.value, 10) || 0 }, true)}
                                  className="w-full p-2 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Offset Y</label>
                                <input
                                  type="number"
                                  min={-20}
                                  max={20}
                                  value={el.shadowOffsetY || 2}
                                  onChange={(e) => updateElement(id, { shadowOffsetY: parseInt(e.target.value, 10) || 0 }, true)}
                                  className="w-full p-2 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Text Presets */}
                        <div className="mt-4">
                          <label className="block text-xs text-gray-500 mb-2 font-medium">Quick Styles</label>
                          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                            {textPresets.map((preset, index) => (
                              <button
                                key={index}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    // Only apply to text elements and ensure safe properties
                                    const el = templateRef.current.elements.find(e => e.id === id);
                                    if (!el || !['text', 'price', 'promotion'].includes(el.type)) return;
                                    
                                    // Create a completely safe properties object with all required fields
                                    const safeProperties: any = {
                                      // Basic text properties
                                      fontWeight: preset.properties.fontWeight || 'normal',
                                      fontSize: Math.min(Math.max(preset.properties.fontSize || 16, 8), 100), // Between 8-100px
                                      color: preset.properties.color || '#000000',
                                      
                                      // Shadow properties
                                      textShadow: preset.properties.textShadow || 'none',
                                      
                                      // Gradient properties - ensure they're always valid
                                      textGradient: preset.properties.textGradient || 'none',
                                      textGradientColors: Array.isArray(preset.properties.textGradientColors) 
                                        ? preset.properties.textGradientColors.filter(c => c && c.length > 0)
                                        : ['#000000', '#FFFFFF'],
                                      textGradientDirection: typeof preset.properties.textGradientDirection === 'number' 
                                        ? preset.properties.textGradientDirection 
                                        : 0,
                                      
                                      // Stroke properties - ensure they're always valid
                                      textStrokeColor: preset.properties.textStrokeColor || 'none',
                                      textStrokeWidth: Math.min(Math.max(preset.properties.textStrokeWidth || 0, 0), 10), // 0-10px
                                      
                                      // Keep existing properties that might be important
                                      width: el.width,
                                      height: el.height,
                                      x: el.x,
                                      y: el.y,
                                      rotation: el.rotation || 0,
                                    };
                                    
                                    // Remove any undefined or null values
                                    Object.keys(safeProperties).forEach(key => {
                                      if (safeProperties[key] === undefined || safeProperties[key] === null) {
                                        delete safeProperties[key];
                                      }
                                    });
                                    
                                    updateElement(id, safeProperties, true);
                                    commitHistory();
                                  } catch (error) {
                                    console.error('Error applying text preset:', error);
                                    // Fallback: just apply basic properties
                                    try {
                                      updateElement(id, {
                                        fontWeight: 'normal',
                                        fontSize: 16,
                                        color: '#000000',
                                        textShadow: 'none',
                                        textGradient: 'none',
                                        textStrokeColor: 'none',
                                        textStrokeWidth: 0,
                                      }, true);
                                    } catch (fallbackError) {
                                      console.error('Fallback also failed:', fallbackError);
                                    }
                                  }
                                }}
                                className="text-left p-3 text-xs bg-white hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                <div className="font-medium text-gray-900">{preset.name}</div>
                                <div className="text-gray-500 text-xs">
                                  {preset.properties.fontWeight} • {preset.properties.fontSize}px
                                  {preset.properties.textGradient && preset.properties.textGradient !== 'none' && ' • Gradient'}
                                  {preset.properties.textStrokeWidth && ` • Stroke ${preset.properties.textStrokeWidth}px`}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="block text-xs text-gray-500 mb-1">Text Shadow (Legacy)</label>
                          <select
                            value={el.textShadow || 'none'}
                            onChange={(e) => updateElement(id, { textShadow: e.target.value })}
                            onBlur={() => commitHistory()}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                          >
                            <option value="none">None</option>
                            <option value="1px 1px 2px rgba(0,0,0,0.5)">Soft</option>
                            <option value="2px 2px 4px rgba(0,0,0,0.6)">Medium</option>
                            <option value="3px 3px 6px rgba(0,0,0,0.8)">Strong</option>
                            <option value="-1px -1px 2px rgba(0,0,0,0.5)">Top Left</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Layers Panel */}
              <div className="mt-2 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">Layers</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {/* Render groups first */}
                  {(templateRef.current.groups || []).map((group, index) => (
                    <div
                      key={group.id}
                      className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedIds.includes(group.id) ? 'bg-purple-100 border border-purple-300' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedIds([group.id])}
                    >
                      <Group className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">{group.name}</span>
                      <span className="text-xs text-gray-500 ml-auto">{group.elementIds.length} items</span>
                    </div>
                  ))}
                  
                  {/* Render elements */}
                  {sortedElements.map((el, index) => (
                    <div
                      key={el.id}
                      className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedIds.includes(el.id) ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedIds([el.id])}
                    >
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateElement(el.id, { opacity: el.opacity === 0 ? 1 : 0 }, true);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {el.opacity === 0 ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateElement(el.id, { locked: !el.locked }, true);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {el.locked ? <UnlockIcon className="w-3 h-3" /> : <LockIcon className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {el.type === 'text' ? 'Text' : el.type === 'image' ? 'Image' : el.type === 'shape' ? 'Shape' : el.type === 'price' ? 'Price' : 'Promotion'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {el.content || `${el.width}×${el.height}`}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (index > 0) {
                              const prev = sortedElements[index - 1];
                              updateElement(el.id, { zIndex: prev.zIndex }, true);
                              updateElement(prev.id, { zIndex: el.zIndex }, true);
                            }
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (index < sortedElements.length - 1) {
                              const next = sortedElements[index + 1];
                              updateElement(el.id, { zIndex: next.zIndex }, true);
                              updateElement(next.id, { zIndex: el.zIndex }, true);
                            }
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                          disabled={index === sortedElements.length - 1}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Canvas Background */}
              <div className="mt-2 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">Canvas</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={normalizeColor(template.backgroundColor || '#FFFFFF')}
                      onChange={(e) => {
                        const next = { ...templateRef.current, backgroundColor: e.target.value };
                        setTemplate(next);
                        templateRef.current = next;
                      }}
                      onBlur={() => commitHistory()}
                      className="w-8 h-8 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={template.backgroundColor || '#FFFFFF'}
                      onChange={(e) => {
                        const next = { ...templateRef.current, backgroundColor: e.target.value };
                        setTemplate(next);
                        templateRef.current = next;
                      }}
                      onBlur={() => commitHistory()}
                      className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Background Image URL</label>
                    <input
                      type="url"
                      value={template.backgroundImage || ''}
                      onChange={(e) => {
                        const next = { ...templateRef.current, backgroundImage: e.target.value };
                        setTemplate(next);
                        templateRef.current = next;
                      }}
                      onBlur={() => commitHistory()}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      placeholder="Enter background image URL..."
                    />
                    <div className="mt-2 flex items-center space-x-2">
                      <button
                        onClick={() => bgUploadRef.current?.click()}
                        className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm"
                      >
                        Upload Background
                      </button>
                      <button
                        onClick={() => {
                          const next = { ...templateRef.current, backgroundImage: '' } as any;
                          setTemplate(next);
                          templateRef.current = next;
                          commitHistory(next);
                        }}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm"
                      >
                        Clear
                      </button>
                      <input type="file" accept="image/*" ref={bgUploadRef} onChange={handleBackgroundUpload} className="hidden" />
                  </div>
                    {template.backgroundImage && (
                      <div className="mt-3 space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Image Fit</label>
                          <select
                            value={template.backgroundImageFit || 'cover'}
                            onChange={(e) => {
                              const next = { ...templateRef.current, backgroundImageFit: e.target.value as any };
                              setTemplate(next);
                              templateRef.current = next;
                            }}
                            onBlur={() => commitHistory()}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                          >
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                            <option value="fill">Fill</option>
                            <option value="fit-width">Fit Width</option>
                            <option value="fit-height">Fit Height</option>
                          </select>
                </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Image Position</label>
                          <select
                            value={template.backgroundImagePosition || 'center'}
                            onChange={(e) => {
                              const next = { ...templateRef.current, backgroundImagePosition: e.target.value as any };
                              setTemplate(next);
                              templateRef.current = next;
                            }}
                            onBlur={() => commitHistory()}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                          >
                            <option value="center">Center</option>
                            <option value="top">Top</option>
                            <option value="bottom">Bottom</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                            <option value="top-left">Top Left</option>
                            <option value="top-right">Top Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-right">Bottom Right</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // close only if clicked on overlay
            if (e.target === e.currentTarget) setShowPreview(false);
          }}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 bg-black/70 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-black/90 z-50 shadow-lg border border-white/30"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Preview container with proper aspect ratio */}
            <div className="relative">
            <div
                className="relative overflow-hidden rounded-lg shadow-2xl"
              style={{
                  width: template.canvasSize.width,
                  height: template.canvasSize.height,
                backgroundColor: template.backgroundColor,
                backgroundImage: template.backgroundImage
                  ? `url(${template.backgroundImage})`
                  : undefined,
                  backgroundSize: template.backgroundImageFit || "cover",
                  backgroundPosition: template.backgroundImagePosition || "center",
                  transform: `scale(${Math.min(
                    0.7 * (window.innerWidth / template.canvasSize.width),
                    0.7 * (window.innerHeight / template.canvasSize.height)
                  )})`,
                  transformOrigin: "center center",
              }}
            >
              <div
                style={{
                  width: template.canvasSize.width,
                  height: template.canvasSize.height,
                }}
              >
                {sortedElements.map((el) => (
                  <div
                    key={el.id}
                    className="absolute"
                    style={{
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      transform: `rotate(${el.rotation || 0}deg)`,
                      zIndex: el.zIndex,
                      backgroundColor: el.backgroundColor || "transparent",
                      color: el.color || "#FFFFFF",
                      fontSize: el.fontSize,
                      fontWeight: el.fontWeight,
                      fontFamily: el.fontFamily,
                      borderRadius: el.borderRadius,
                      opacity: el.opacity,
                      boxShadow: el.shadow,
                    }}
                  >
                    {el.type === "text" || el.type === "price" || el.type === "promotion" ? (
                      <>
                        {el.textLayout && el.textLayout !== 'straight' ? (
                          <svg width={el.width} height={el.height} viewBox={`0 0 ${el.width} ${el.height}`} className="w-full h-full">
                            <defs>
                              <path
                                id={`preview-path-${el.id}`}
                                d={
                                  (() => {
                                    const pad = (el.fontSize || 16) / 2 + (el.textStrokeWidth || 0) + 4;
                                    const safeR = Math.max(1, (el.textRadius ?? Math.min(el.width, el.height) / 2) - pad);
                                    return el.textLayout === 'circle'
                                      ? buildCirclePath(el.width, el.height, safeR, (el.textDirection || 'clockwise') === 'clockwise')
                                      : buildArcPath(
                                          el.width,
                                          el.height,
                                          safeR,
                                          Math.max(10, Math.min(360, el.textArcAngle ?? 180)),
                                          (el.textDirection || 'clockwise') === 'clockwise'
                                        );
                                  })()
                                }
                                fill="none"
                              />
                            </defs>
                            <text
                              fill={el.color || '#FFFFFF'}
                              stroke={el.textStrokeColor || 'none'}
                              strokeWidth={el.textStrokeWidth ? String(el.textStrokeWidth) : undefined}
                              paintOrder={el.textStrokeWidth ? 'stroke fill' : undefined}
                              fontFamily={el.fontFamily || 'Arial'}
                              fontWeight={el.fontWeight || 'normal'}
                              fontSize={el.fontSize || 16}
                              style={{ letterSpacing: `${el.textSpacing ?? 0}px`, textShadow: el.textShadow || 'none' }}
                            >
                              <textPath
                                href={`#preview-path-${el.id}`}
                                startOffset="50%"
                                textAnchor="middle"
                                alignmentBaseline="middle"
                      >
                        {el.content}
                              </textPath>
                            </text>
                          </svg>
                        ) : (
                          <svg width={el.width} height={el.height} viewBox={`0 0 ${el.width} ${el.height}`} className="w-full h-full">
                            <text
                              x="50%"
                              y="50%"
                              dominantBaseline="middle"
                              textAnchor="middle"
                              fill={el.color || '#FFFFFF'}
                              stroke={el.textStrokeColor || 'none'}
                              strokeWidth={el.textStrokeWidth ? String(el.textStrokeWidth) : undefined}
                              paintOrder={el.textStrokeWidth ? 'stroke fill' : undefined}
                              fontFamily={el.fontFamily || 'Arial'}
                              fontWeight={el.fontWeight || 'normal'}
                              fontSize={el.fontSize || 16}
                              style={{ letterSpacing: `${el.textSpacing ?? 0}px`, textShadow: el.textShadow || 'none' }}
                            >
                              {el.content}
                            </text>
                          </svg>
                        )}
                      </>
                    ) : el.type === "shape" ? (
                      <div className="w-full h-full flex items-center justify-center">
                        {el.shapeType === "rectangle" && (
                          <div className="w-full h-full" style={{ backgroundColor: el.backgroundColor, borderRadius: el.borderRadius }} />
                        )}
                        {el.shapeType === "circle" && (
                          <div className="w-full h-full rounded-full" style={{ backgroundColor: el.backgroundColor }} />
                        )}
                        {el.shapeType === "triangle" && (
                          <div
                            style={{
                              width: 0,
                              height: 0,
                              borderLeft: `${el.width / 2}px solid transparent`,
                              borderRight: `${el.width / 2}px solid transparent`,
                              borderBottom: `${el.height}px solid ${el.backgroundColor}`,
                            }}
                          />
                        )}
                        {el.shapeType === "star" && (
                          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                            <polygon
                              points="50,5 61,39 98,39 67,59 79,91 50,72 21,91 33,59 2,39 39,39"
                              fill={el.backgroundColor}
                            />
                          </svg>
                        )}
                        {el.shapeType === "hexagon" && (
                          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                            <polygon
                              points="50,5 85,25 85,75 50,95 15,75 15,25"
                              fill={el.backgroundColor}
                            />
                          </svg>
                        )}
                        {el.shapeType === "heart" && (
                          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                            <path
                              d="M50,85 C50,85 20,55 20,35 C20,25 30,15 40,15 C45,15 50,20 50,20 C50,20 55,15 60,15 C70,15 80,25 80,35 C80,55 50,85 50,85 Z"
                              fill={el.backgroundColor}
                            />
                          </svg>
                        )}
                        {el.shapeType === "diamond" && (
                          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                            <polygon
                              points="50,5 95,50 50,95 5,50"
                              fill={el.backgroundColor}
                            />
                          </svg>
                        )}
                      </div>
                    ) : el.type === "image" ? (
                      <div
                        className="w-full h-full overflow-hidden"
                        style={{
                          borderRadius: el.borderRadius || 0,
                          backgroundColor: "transparent",
                        }}
                      >
                        {el.imageUrl ? (
                          <img
                            src={el.imageUrl}
                            alt="Menu item"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-500" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: el.backgroundColor || "transparent" }}
                      />
                    )}
                  </div>
                ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Settings Modal */}
      {showTemplateSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTemplateSettings(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Template Settings</h3>
              <button onClick={() => setShowTemplateSettings(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => {
                    const updated = { ...templateRef.current, name: e.target.value };
                    setTemplate(updated);
                    templateRef.current = updated;
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={template.category}
                  onChange={(e) => {
                    const updated = { ...templateRef.current, category: e.target.value };
                    setTemplate(updated);
                    templateRef.current = updated;
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="custom">Custom</option>
                  <option value="burger">Burger</option>
                  <option value="pizza">Pizza</option>
                  <option value="cafe">Cafe</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="fast-food">Fast Food</option>
                  <option value="mexican">Mexican</option>
                  <option value="seafood">Seafood</option>
                  <option value="bbq">BBQ</option>
                  <option value="asian">Asian</option>
                  <option value="italian">Italian</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={template.preview}
                  onChange={(e) => {
                    const updated = { ...templateRef.current, preview: e.target.value };
                    setTemplate(updated);
                    templateRef.current = updated;
                  }}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your template..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Canvas Size</label>
                <div className="space-y-3">
                  <select
                    value={template.canvasSize.id}
                    onChange={(e) => {
                      const selectedSize = canvasSizes.find(size => size.id === e.target.value);
                      if (selectedSize) {
                        const updated = { 
                          ...templateRef.current, 
                          canvasSize: selectedSize,
                          isHorizontal: selectedSize.isHorizontal ?? true
                        };
                        setTemplate(updated);
                        templateRef.current = updated;
                      }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {canvasSizes.map((size) => (
                      <option key={size.id} value={size.id}>
                        {size.name} ({size.width}×{size.height})
                      </option>
                    ))}
                  </select>
                  
                  <div className="text-center text-gray-500 text-sm">or</div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Width (px)</label>
                        <input
                          type="number"
                          value={template.canvasSize.width}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          min="100"
                          max="8000"
                          onChange={(e) => {
                            const width = parseInt(e.target.value);
                            if (width > 0) {
                              const height = template.canvasSize.height;
                              const customSize = {
                                id: `custom-${width}x${height}`,
                                name: `Custom ${width}×${height}`,
                                width,
                                height,
                                category: 'custom',
                                isHorizontal: width > height
                              };
                              const updated = { 
                                ...templateRef.current, 
                                canvasSize: customSize,
                                isHorizontal: width > height
                              };
                              setTemplate(updated);
                              templateRef.current = updated;
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Height (px)</label>
                        <input
                          type="number"
                          value={template.canvasSize.height}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          min="100"
                          max="8000"
                          onChange={(e) => {
                            const height = parseInt(e.target.value);
                            if (height > 0) {
                              const width = template.canvasSize.width;
                              const customSize = {
                                id: `custom-${width}x${height}`,
                                name: `Custom ${width}×${height}`,
                                width,
                                height,
                                category: 'custom',
                                isHorizontal: width > height
                              };
                              const updated = { 
                                ...templateRef.current, 
                                canvasSize: customSize,
                                isHorizontal: width > height
                              };
                              setTemplate(updated);
                              templateRef.current = updated;
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <button
                        onClick={() => {
                          // Reset to a common size
                          const resetSize = {
                            id: 'reset-1920x1080',
                            name: 'HD 1920×1080',
                            width: 1920,
                            height: 1080,
                            category: 'tv',
                            isHorizontal: true
                          };
                          const updated = { 
                            ...templateRef.current, 
                            canvasSize: resetSize,
                            isHorizontal: true
                          };
                          setTemplate(updated);
                          templateRef.current = updated;
                        }}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
                      >
                        Reset to 1920×1080
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 text-center">
                    Current: {template.canvasSize.width} × {template.canvasSize.height} pixels
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={template.backgroundColor || '#ffffff'}
                    onChange={(e) => {
                      const updated = { ...templateRef.current, backgroundColor: e.target.value };
                      setTemplate(updated);
                      templateRef.current = updated;
                    }}
                    className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={template.backgroundColor || '#ffffff'}
                    onChange={(e) => {
                      const updated = { ...templateRef.current, backgroundColor: e.target.value };
                      setTemplate(updated);
                      templateRef.current = updated;
                    }}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Elements Count</label>
                  <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600">
                    {template.elements.length} elements
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Groups Count</label>
                  <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600">
                    {templateRef.current.groups?.length || 0} groups
                  </div>
                </div>
              </div>
              
              {/* Save Action Choice for User Templates */}
              {template.isUserTemplate && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Save Action</label>
                  <div className="space-y-2">
                    <label className="flex items-start space-x-3 p-3 border-2 border-blue-500 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                      <input
                        type="radio"
                        name="saveAction"
                        value="update"
                        defaultChecked
                        onChange={(e) => {
                          const updated = { ...templateRef.current, saveAction: 'update' as const };
                          setTemplate(updated);
                          templateRef.current = updated;
                        }}
                        className="mt-1 w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-blue-900">Update Template</div>
                        <div className="text-sm text-blue-700">
                          Save changes to this template (overwrites existing)
                        </div>
                      </div>
                    </label>
                    <label className="flex items-start space-x-3 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="saveAction"
                        value="saveAsNew"
                        onChange={(e) => {
                          const updated = { ...templateRef.current, saveAction: 'saveAsNew' as const };
                          setTemplate(updated);
                          templateRef.current = updated;
                        }}
                        className="mt-1 w-4 h-4 text-green-600"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Save as New Template</div>
                        <div className="text-sm text-gray-600">
                          Create a new template (keeps original unchanged)
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              
              {/* Info message for Default Templates */}
              {template.isDefaultTemplate && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs">ℹ</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-blue-900 text-sm">Default Template</div>
                        <div className="text-sm text-blue-700 mt-1">
                          This will create a new template in your gallery. The default template will remain unchanged for all users.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowTemplateSettings(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    commitHistory();
                    setShowTemplateSettings(false);
                    // Auto-save after settings are completed
                    const hasName = template.name && template.name.trim() !== '';
                    const hasDescription = template.preview && template.preview.trim() !== '';
                    
                    if (hasName && hasDescription && template.category !== 'custom') {
                      // Preserve all existing template data when saving
                      const updatedTemplate = {
                        ...templateRef.current, // Keep all existing data
                        name: template.name,
                        category: template.category,
                        preview: template.preview,
                        canvasSize: template.canvasSize,
                        backgroundColor: template.backgroundColor,
                        isHorizontal: template.isHorizontal
                      };
                      // Generate PNG using the same export logic and pass blob back
                      const canvasElement = innerRef.current;
                      if (!canvasElement) { onSave(updatedTemplate); return; }
                      try {
                        // Temporarily hide any selection UI
                        const prevSelectedIds = selectedIds;
                        const prevSelectionRect = selectionRect;
                        setIsExporting(true);
                        setSelectedIds([]);
                        setSelectionRect(null);
                        await new Promise(res => setTimeout(res, 0));
                        let dataUrl: string;
                        try {
                          dataUrl = await domToImage.toPng(canvasElement, {
                            width: updatedTemplate.canvasSize.width,
                            height: updatedTemplate.canvasSize.height,
                            style: { transform: 'scale(1)', transformOrigin: 'top left' },
                            quality: 1.0,
                            pixelRatio: THUMBNAIL_PIXEL_RATIO,
                            bgcolor: '#ffffff',
                            filter: (node) => {
                              if (node.nodeType === 1 && (node as Element).tagName === 'IMG') {
                                const img = node as HTMLImageElement;
                                return img.complete && img.naturalWidth > 0;
                              }
                              return true;
                            }
                          });
                        } catch {
                          dataUrl = await domToImage.toPng(canvasElement);
                        }
                        // Downscale to keep size reasonable while staying sharp
                        const img = new Image();
                        await new Promise((r) => { img.onload = () => r(null); img.src = dataUrl; });
                        const maxEdge = THUMBNAIL_MAX_EDGE;
                        const scale = Math.min(1, Math.min(maxEdge / img.width, maxEdge / img.height));
                        const targetW = Math.max(1, Math.round(img.width * scale));
                        const targetH = Math.max(1, Math.round(img.height * scale));
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = targetW; canvas.height = targetH;
                        if (ctx) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, targetW, targetH); }
                        const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/png'));
                        onSave(updatedTemplate, { thumbnailBlob: blob });
                      } catch {
                        onSave(updatedTemplate);
                      } finally {
                        // Restore selection UI
                        setSelectedIds(prevSelectedIds);
                        setSelectionRect(prevSelectionRect);
                        setIsExporting(false);
                      }
                    }
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowKeyboardHelp(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Keyboard Shortcuts</h3>
              <button onClick={() => setShowKeyboardHelp(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Editing</h4>
                  <div className="space-y-1 text-gray-600">
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+C</kbd> Copy</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+V</kbd> Paste</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+D</kbd> Duplicate</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+Z</kbd> Undo</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+Shift+Z</kbd> Redo</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+A</kbd> Select All</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+G</kbd> Group</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+Shift+G</kbd> Ungroup</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+S</kbd> Save</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+F</kbd> Toggle Preview</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">View & Zoom</h4>
                  <div className="space-y-1 text-gray-600">
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+0</kbd> Zoom 50%</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+1</kbd> Zoom 100%</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+2</kbd> Zoom 200%</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">F1</kbd> Help</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">F2</kbd> Settings</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">F3</kbd> Toggle Grid</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">F4</kbd> Toggle Rulers</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">F5</kbd> Toggle Snap</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">F11</kbd> Download PNG</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">F12</kbd> Export JSON</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Movement</h4>
                  <div className="space-y-1 text-gray-600">
                    <div><kbd className="bg-gray-100 px-1 rounded">↑</kbd> Move Up</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">↓</kbd> Move Down</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">←</kbd> Move Left</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">→</kbd> Move Right</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Shift+↑</kbd> Move Up 10px</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Shift+↓</kbd> Move Down 10px</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Shift+←</kbd> Move Left 10px</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Shift+→</kbd> Move Right 10px</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Quick Add Elements</h4>
                  <div className="space-y-1 text-gray-600">
                    <div><kbd className="bg-gray-100 px-1 rounded">1</kbd> Add Text</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">2</kbd> Add Image</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">3</kbd> Add Price</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">4</kbd> Add Promotion</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">5</kbd> Add Rectangle</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">6</kbd> Add Circle</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">7</kbd> Add Star</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">8</kbd> Add Heart</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">9</kbd> Add Diamond</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Other</h4>
                <div className="space-y-1 text-gray-600">
                  <div><kbd className="bg-gray-100 px-1 rounded">Del</kbd> or <kbd className="bg-gray-100 px-1 rounded">Backspace</kbd> Delete Selected</div>
                  <div><kbd className="bg-gray-100 px-1 rounded">Esc</kbd> Deselect All</div>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  💡 Tip: Hold <kbd className="bg-gray-100 px-1 rounded">Shift</kbd> while dragging to maintain aspect ratio
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Help Modal */}
      {showImportHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">HTML/CSS Import Guide</h2>
                <button
                  onClick={() => setShowImportHelp(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">🎯 Perfect Import Requirements</h3>
                  <div className="bg-green-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold text-green-800 mb-2">✅ MANDATORY STRUCTURE:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-green-700 text-sm">
                      <li><strong>DOCTYPE:</strong> Must start with <code className="bg-green-100 px-1 rounded">&lt;!DOCTYPE html&gt;</code></li>
                      <li><strong>Viewport:</strong> Must include <code className="bg-green-100 px-1 rounded">&lt;meta name="viewport" content="width=1920, height=1080"&gt;</code></li>
                      <li><strong>Body:</strong> Must have <code className="bg-green-100 px-1 rounded">style="width:1920px; height:1080px;"</code></li>
                      <li><strong>Elements:</strong> Must use <code className="bg-green-100 px-1 rounded">position:absolute</code> for ALL elements</li>
                      <li><strong>Dimensions:</strong> Must have <code className="bg-gray-100 px-1 rounded">width:Xpx; height:Ypx;</code> for ALL elements</li>
                    </ol>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">❌ NOT SUPPORTED:</h4>
                    <ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
                      <li>Flexbox layouts (<code>display:flex</code>)</li>
                      <li>Grid layouts (<code>display:grid</code>)</li>
                      <li>Float positioning (<code>float:</code>)</li>
                      <li>Relative positioning without absolute</li>
                      <li>Percentage-based dimensions</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">✅ Perfect HTML Structure Example</h3>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1920, height=1080">
    <title>Perfect Menu</title>
</head>
<body style="width:1920px; height:1080px; margin:0; background:#3a176c; color:white;">

    <!-- EVERY element MUST have position:absolute, left, top, width, height -->
    <div style="position:absolute; left:60px; top:40px; width:700px; height:80px;">
        <h2 style="font-size:36px; margin:0;">BURGERS</h2>
    </div>
    
    <div style="position:absolute; left:60px; top:140px; width:700px; height:200px;">
        <div style="font-size:20px; line-height:32px;">
            <div><b>PATRIOT BURGER</b> <span style="float:right;">12.50</span></div>
        </div>
    </div>
    
    <div style="position:absolute; left:850px; top:120px; width:420px; height:300px; 
                background:#ffb400; border-radius:20px; text-align:center;">
        <img src="https://example.com/burger.jpg" alt="Burger" 
             style="width:280px; border-radius:10px;">
    </div>

</body>
</html>`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">🎯 Best Practices</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Use explicit pixel values (px) instead of relative units (%)</li>
                    <li>Avoid <code className="bg-gray-100 px-1 rounded">display: none</code> on elements you want to import</li>
                    <li>Set canvas size with <code className="bg-gray-100 px-1 rounded">body {`{width: 1920px; height: 1080px;}`}`</code></li>
                    <li>Use absolute positioning for precise element placement</li>
                    <li>Include alt text for images</li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">📖 Full Documentation</h3>
                  <p className="text-blue-700 mb-3">For complete instructions, examples, and troubleshooting, see:</p>
                  <p className="text-sm text-blue-600 font-mono">HTML_CSS_IMPORT_GUIDE.md</p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowImportHelp(false);
                      htmlInputRef.current?.click();
                    }}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Start Import
                  </button>
                  <button
                    onClick={() => setShowImportHelp(false)}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Loading Modal */}
      {isImporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Importing HTML/CSS</h3>
              <p className="text-gray-600 mb-4">{importProgress}</p>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Please wait while we process your files...</p>
            </div>
          </div>
        </div>
      )}

      {/* Image Library Panel */}
      <ImageLibraryPanel
        isOpen={showImageLibrary}
        onClose={() => setShowImageLibrary(false)}
        context={imageLibraryContext}
        onSelectImage={(imageUrl, context) => {
          if (context === 'new-element') {
            // When an image is selected from the library, add it as a new image element
            const newElement: MenuBoardElement = {
              id: `element-${Date.now()}`,
              type: 'image',
              x: 100,
              y: 100,
              width: 200,
              height: 200,
              imageUrl: imageUrl,
              zIndex: template.elements.length + 1,
            };
            
            setTemplate(prev => ({
              ...prev,
              elements: [...prev.elements, newElement]
            }));
            
            setSelectedIds([newElement.id]);
          } else if (context === 'existing-element' && imageLibraryTargetId) {
            // Update existing element's image
            updateElement(imageLibraryTargetId, { imageUrl: imageUrl }, true);
          } else if (context === 'shape-image' && imageLibraryTargetId) {
            // Update shape's background image
            updateElement(imageLibraryTargetId, { shapeImageUrl: imageUrl }, true);
          }
          
          setShowImageLibrary(false);
          setImageLibraryTargetId(null);
        }}
      />

    </div>
  );
};