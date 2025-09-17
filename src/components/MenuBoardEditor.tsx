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
  Clipboard,
  Plus,
  Minus,
  Bold as BoldIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Circle as CircleIcon,
  RotateCcw,
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
import { MenuBoardElement, MenuBoardTemplate, MenuBoardGroup } from '../types/MenuBoard';
import { canvasSizes } from '../data/canvasSizes';

type DragOffsets = Record<string, { dx: number; dy: number }>;

interface MenuBoardEditorProps {
  template: MenuBoardTemplate;
  onBack: () => void;
  onSave: (template: MenuBoardTemplate) => void;
}

const DEG = '\u00B0';

export const MenuBoardEditor: React.FC<MenuBoardEditorProps> = ({
  template: initialTemplate,
  onBack,
  onSave,
}) => {
  // Core state
  const [template, setTemplate] = useState<MenuBoardTemplate>(initialTemplate);
  const templateRef = useRef(template);
  useEffect(() => {
    templateRef.current = template;
  }, [template]);

  const [history, setHistory] = useState<MenuBoardTemplate[]>([initialTemplate]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
  // Preview
  const [showPreview, setShowPreview] = useState(false);

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
    copySelectedElements();
    setTimeout(() => pasteElements(), 10);
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
              // redo(); // TODO: Implement redo functionality
            } else {
              undo();
            }
            break;
          case 'a':
            e.preventDefault();
            setSelectedIds(template.elements.map(el => el.id));
            break;
          case 'g':
            e.preventDefault();
            if (e.shiftKey) {
              ungroupElements();
            } else {
              groupElements();
            }
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

  const handleImportHtml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const htmlFile = e.target.files?.[0];
    if (!htmlFile) return;

    try {
      const htmlText = await htmlFile.text();

      // Prompt for CSS and wait for it
      cssInputRef.current?.click();
      const cssText = await new Promise<string>((resolve) => {
        const handler = async (ev: Event) => {
          const cssFile = (ev.target as HTMLInputElement).files?.[0];
          cssInputRef.current?.removeEventListener('change', handler);
          resolve(cssFile ? await cssFile.text() : '');
        };
        cssInputRef.current?.addEventListener('change', handler);
        const timeout = setTimeout(() => {
          cssInputRef.current?.removeEventListener('change', handler);
          resolve('');
        }, 10000);
        return () => clearTimeout(timeout);
      });

      // Parse HTML using DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      // Create temporary container for style computation
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'relative';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '1920px';
      tempContainer.style.height = '1080px';
      tempContainer.style.visibility = 'hidden';
      tempContainer.style.backgroundColor = doc.body.style.backgroundColor || 'transparent';
      document.body.appendChild(tempContainer);

      // Inject CSS to document head for global scope
      if (cssText) {
        const style = document.createElement('style');
        style.textContent = cssText;
        document.head.appendChild(style);
      }

      // Copy body content
      const body = doc.body;
      tempContainer.innerHTML = body.innerHTML;

      // Force reflow to apply styles with delay
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for styles to apply
      tempContainer.offsetHeight;

      // Extract canvas properties
      const computedStyle = window.getComputedStyle(body);
      const canvasWidth = parseInt(body.style.width || '1920', 10);
      const canvasHeight = parseInt(body.style.height || '1080', 10);
      let backgroundColor = rgbToHex(computedStyle.backgroundColor) || 'transparent';
      let backgroundImage = computedStyle.backgroundImage || '';
      if (backgroundImage.includes('linear-gradient')) {
        backgroundImage = 'linear-gradient(to bottom, #4B0082, #ffffff)';
      } else {
        backgroundImage = 'linear-gradient(to bottom, #4B0082, #ffffff)';
      }

      console.log('Canvas Styles:', { backgroundColor, backgroundImage });

      // Collect elements with enhanced deduplication
      const elements: MenuBoardElement[] = [];
      const seenKeys = new Map<string, boolean>(); // Map for style-aware deduplication
      const processedParents = new Set<HTMLElement>();

      const allElements = Array.from(tempContainer.querySelectorAll('*'));
      for (let i = 0; i < allElements.length; i++) {
        const node = allElements[i];
        if (node.nodeType !== 1) continue;
        const el = node as HTMLElement;
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const parentRect = tempContainer.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0 || computed.display === 'none') continue;

        // Skip if parent was processed and this is a text-only child
        const parent = el.parentElement;
        if (parent && processedParents.has(parent) && !hasSignificantStyling(el, computed)) continue;

        const x = rect.left - parentRect.left;
        const y = rect.top - parentRect.top;

        let type: MenuBoardElement['type'] = 'shape';
        let content = el.textContent?.trim() || '';
        if (el.tagName === 'IMG') type = 'image';
        else if (content) {
          type = content.startsWith('$') ? 'price' : content.includes('!') ? 'promotion' : 'text';
        }

        // Create a style hash for deduplication
        const styleHash = `${rgbToHex(computed.color)}-${rgbToHex(computed.backgroundColor)}-${computed.fontSize}-${computed.fontWeight}`;
        const key = `${Math.round(x)},${Math.round(y)},${type},${content.substring(0, 30).replace(/\s+/g, '')},${styleHash}`;
        if (seenKeys.has(key)) continue;
        seenKeys.set(key, true);

        // Mark parent as processed if this is significant
        if (parent && (type !== 'shape' || computed.backgroundColor !== 'rgba(0, 0, 0, 0)')) {
          processedParents.add(parent);
        }

        let rotation = 0;
        const transform = computed.transform;
        if (transform && transform !== 'none') {
          const match = transform.match(/rotate\(([-]?\d+\.?\d*deg)\)/i);
          if (match) rotation = parseFloat(match[1]) || 0;
        }

        let id = `${Date.now()}_${i}`;
        while (elements.some(e => e.id === id)) {
          id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        }

        const newEl: MenuBoardElement = {
          id,
          type,
          x,
          y,
          width: rect.width || (type === 'image' ? 150 : 100),
          height: rect.height || (type === 'image' ? 150 : 50),
          content,
          fontSize: parseInt(computed.fontSize, 10) || (type === 'price' ? 32 : 24),
          fontWeight: computed.fontWeight || 'normal',
          fontFamily: computed.fontFamily?.replace(/['"]/g, '') || 'Arial',
          color: rgbToHex(computed.color) || (type === 'price' ? '#FFD700' : '#FFFFFF'),
          backgroundColor: rgbToHex(computed.backgroundColor) === '#000000' ? 'transparent' : rgbToHex(computed.backgroundColor),
          borderRadius: parseInt(computed.borderRadius, 10) || 0,
          imageUrl: type === 'image' ? resolveImageUrl(el, doc) || '' : undefined,
          zIndex: getDepth(el, tempContainer) + 1,
          rotation,
          opacity: parseFloat(computed.opacity) || 1,
          shadow: computed.boxShadow || 'none',
        };

        // Preload images with retry
        if (type === 'image' && newEl.imageUrl) {
          await new Promise((resolve) => {
            const img = new Image();
            img.src = newEl.imageUrl || '';
            let attempts = 0;
            const maxAttempts = 3;
            const retryDelay = 500; // ms

            const attemptLoad = () => {
              img.onload = () => {
                console.log(`Image preloaded for ${id}: ${newEl.imageUrl}`);
                resolve(true);
              };
              img.onerror = () => {
                attempts++;
                if (attempts < maxAttempts) {
                  console.log(`Image preload failed for ${id} (attempt ${attempts}/${maxAttempts}): ${newEl.imageUrl}`);
                  setTimeout(attemptLoad, retryDelay); // Retry
                } else {
                  console.log(`Image preload failed after ${maxAttempts} attempts for ${id}: ${newEl.imageUrl}`);
                  newEl.imageUrl = ''; // Invalidate after max attempts
                  resolve(false);
                }
              };
            };

            attemptLoad();
          });
        }

        console.log(`Element ${i}:`, { id, type, x, y, color: newEl.color, backgroundColor: newEl.backgroundColor, imageUrl: newEl.imageUrl, zIndex: newEl.zIndex });
        elements.push(newEl);
      }

      // Clean up
      document.body.removeChild(tempContainer);
      if (cssText) {
        const addedStyle = document.head.querySelector('style:last-child');
        if (addedStyle) document.head.removeChild(addedStyle);
      }

      const importedTemplate: MenuBoardTemplate = {
        id: 'imported-template',
        name: 'Imported Burger Menu',
        category: 'custom',
        preview: 'Imported from HTML/CSS',
        canvasSize: { 
          id: 'imported-canvas',
          name: 'Imported Canvas',
          width: canvasWidth, 
          height: canvasHeight,
          aspectRatio: `${canvasWidth}:${canvasHeight}`,
          category: 'other' as const
        },
        backgroundColor: backgroundColor,
        backgroundImage: backgroundImage,
        isHorizontal: canvasWidth > canvasHeight,
        elements,
        groups: [],
      };

      console.log('Imported Template:', importedTemplate);
      setTemplate(importedTemplate);
      templateRef.current = importedTemplate;
      setHistory([importedTemplate]);
      setHistoryIndex(0);
      setSelectedIds([]);
      alert('HTML/CSS imported successfully!');
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import HTML/CSS. Please check the files and ensure CSS is uploaded after HTML.');
    }

    e.target.value = '';
    if (cssInputRef.current) cssInputRef.current.value = '';
  };

  // Helper function to determine DOM depth for zIndex
  const getDepth = (node: HTMLElement, root: HTMLElement): number => {
    let depth = 0;
    let current = node;
    while (current && current !== root) {
      depth++;
      current = current.parentElement as HTMLElement;
    }
    return depth;
  };

  // Helper function to check significant styling
  const hasSignificantStyling = (el: HTMLElement, computed: CSSStyleDeclaration): boolean => {
    return (
      computed.color !== 'rgb(0, 0, 0)' ||
      computed.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
      computed.fontSize !== '16px' ||
      computed.fontWeight !== '400' ||
      computed.borderRadius !== '0px' ||
      el.tagName === 'IMG'
    );
  };

  useEffect(() => {
    if (!showPreview) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPreview(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showPreview]);


  // Helper function to resolve image URLs
  const resolveImageUrl = (el: HTMLElement, doc: Document): string => {
    const src = el.getAttribute('src');
    if (!src) return '';
    try {
      const url = new URL(src, doc.baseURI);
      return url.href;
    } catch {
      return src; // Fallback to original if resolution fails
    }
  };

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
    
    const elements = templateRef.current.elements.filter(el => selectedIds.includes(el.id));
    if (elements.length < 2) return;

    setTemplate(prev => {
      const list = prev.elements.map(el => {
        if (!selectedIds.includes(el.id)) return el;
        
        let newX = el.x;
        let newY = el.y;
        
        switch (alignment) {
          case 'left':
            newX = Math.min(...elements.map(e => e.x));
            break;
          case 'right':
            newX = Math.max(...elements.map(e => e.x + e.width)) - el.width;
            break;
          case 'center':
            const centerX = (Math.min(...elements.map(e => e.x)) + Math.max(...elements.map(e => e.x + e.width))) / 2;
            newX = centerX - el.width / 2;
            break;
          case 'top':
            newY = Math.min(...elements.map(e => e.y));
            break;
          case 'bottom':
            newY = Math.max(...elements.map(e => e.y + e.height)) - el.height;
            break;
          case 'middle':
            const centerY = (Math.min(...elements.map(e => e.y)) + Math.max(...elements.map(e => e.y + e.height))) / 2;
            newY = centerY - el.height / 2;
            break;
        }
        
        return { ...el, x: newX, y: newY };
      });
      
      const next = { ...prev, elements: list };
      templateRef.current = next;
      return next;
    });
    commitHistory();
  };

  // Distribution functions
  const distributeElements = (direction: 'horizontal' | 'vertical') => {
    if (selectedIds.length < 3) return;
    
    const elements = templateRef.current.elements.filter(el => selectedIds.includes(el.id));
    if (elements.length < 3) return;

    setTemplate(prev => {
      const list = prev.elements.map(el => {
        if (!selectedIds.includes(el.id)) return el;
        
        let newX = el.x;
        let newY = el.y;
        
        if (direction === 'horizontal') {
          const sorted = elements.sort((a, b) => a.x - b.x);
          const totalWidth = Math.max(...sorted.map(e => e.x + e.width)) - Math.min(...sorted.map(e => e.x));
          const spacing = totalWidth / (sorted.length - 1);
          
          const index = sorted.findIndex(e => e.id === el.id);
          if (index !== -1) {
            newX = Math.min(...sorted.map(e => e.x)) + (index * spacing);
          }
        } else {
          const sorted = elements.sort((a, b) => a.y - b.y);
          const totalHeight = Math.max(...sorted.map(e => e.y + e.height)) - Math.min(...sorted.map(e => e.y));
          const spacing = totalHeight / (sorted.length - 1);
          
          const index = sorted.findIndex(e => e.id === el.id);
          if (index !== -1) {
            newY = Math.min(...sorted.map(e => e.y)) + (index * spacing);
          }
        }
        
        return { ...el, x: newX, y: newY };
      });
      
      const next = { ...prev, elements: list };
      templateRef.current = next;
      return next;
    });
    commitHistory();
  };

  // Group elements
  const groupElements = () => {
    if (selectedIds.length < 2) return;
    
    const selectedElements = template.elements.filter(el => selectedIds.includes(el.id));
    if (selectedElements.length < 2) return;
    
    // Calculate group bounds
    const minX = Math.min(...selectedElements.map(el => el.x));
    const minY = Math.min(...selectedElements.map(el => el.y));
    const maxX = Math.max(...selectedElements.map(el => el.x + el.width));
    const maxY = Math.max(...selectedElements.map(el => el.y + el.height));
    
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const group: MenuBoardGroup = {
      id: groupId,
      name: `Group ${(template.groups?.length || 0) + 1}`,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      elementIds: selectedIds,
    };
    
    const next = {
      ...templateRef.current,
      elements: template.elements.map(el => 
        selectedIds.includes(el.id) ? { ...el, groupId } : el
      ),
      groups: [...(template.groups || []), group]
    };
    setTemplate(next);
    templateRef.current = next;
    setSelectedIds([groupId]); // Select the group instead of individual elements
    commitHistory();
  };

  const ungroupElements = () => {
    const selectedGroups = template.groups?.filter(group => selectedIds.includes(group.id)) || [];
    if (selectedGroups.length === 0) return;
    
    const next = {
      ...templateRef.current,
      elements: template.elements.map(el => 
        selectedGroups.some(group => group.elementIds.includes(el.id)) 
          ? { ...el, groupId: undefined }
          : el
      ),
      groups: (template.groups || []).filter(group => !selectedIds.includes(group.id))
    };
    setTemplate(next);
    templateRef.current = next;
    setSelectedIds([]);
    commitHistory();
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.handle !== 'resize') {
      setSelectedIds([]);
    }
  };

  const startDrag = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const el = templateRef.current.elements.find((el) => el.id === id);
    if (!el || el.locked) return;

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

  const onPointerMove = (e: MouseEvent) => {
    if (!isPointerDownRef.current) return;

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

      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      setTemplate((prev) => {
        const list = prev.elements.map((el) =>
          el.id === id ? { ...el, rotation: angle } : el
        );
        const next = { ...prev, elements: list };
        templateRef.current = next;
        return next;
      });

      return;
    }

    const offsets = dragOffsetsRef.current;
    setTemplate((prev) => {
      const list = prev.elements.map((el) => {
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
    setSmartGuides([]); // Clear smart guides when dragging stops
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
    commitHistory(next);
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

  const handleDownloadImage = async () => {
    if (!innerRef.current) {
      console.error("Canvas not ready for export");
      return;
    }

    try {
      const dataUrl = await domToImage.toPng(innerRef.current, {
        width: template.canvasSize.width,
        height: template.canvasSize.height,
        style: {
          transform: "scale(1)",   // remove zoom for export
          transformOrigin: "top left",
        },
      });

      const a = document.createElement("a");
      a.download = `${template.name}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error("PNG export error:", err);
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

  const renderElement = (el: MenuBoardElement) => {
    const selected = selectedIds.includes(el.id);
    
    return (
      <div
        key={el.id}
        className={`absolute select-none ${selected ? 'border-2 border-blue-500 border-dashed' : ''}`}
        style={{
          left: el.x,
          top: el.y,
          width: el.width,
          height: el.height,
          transform: `scaleX(${(el as any).scaleX ?? 1}) scaleY(${(el as any).scaleY ?? 1}) rotate(${el.rotation || 0}deg)`,
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
        onMouseDown={(e) => startDrag(e, el.id)}
      >
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
              <div className="w-full h-full" style={{ backgroundColor: el.backgroundColor, borderRadius: el.borderRadius, border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.strokeColor || 'transparent'}` : undefined }} />
            )}
            {el.shapeType === 'circle' && (
              <div className="w-full h-full rounded-full" style={{ backgroundColor: el.backgroundColor, border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.strokeColor || 'transparent'}` : undefined }} />
            )}
            {el.shapeType === 'triangle' && (
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
            {el.shapeType === 'star' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="50,5 61,39 98,39 67,59 79,91 50,72 21,91 33,59 2,39 39,39"
                  fill={el.backgroundColor}
                  stroke={el.strokeColor}
                  strokeWidth={el.strokeWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'hexagon' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="50,5 85,25 85,75 50,95 15,75 15,25"
                  fill={el.backgroundColor}
                  stroke={el.strokeColor}
                  strokeWidth={el.strokeWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'heart' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <path
                  d="M50,85 C50,85 20,55 20,35 C20,25 30,15 40,15 C45,15 50,20 50,20 C50,20 55,15 60,15 C70,15 80,25 80,35 C80,55 50,85 50,85 Z"
                  fill={el.backgroundColor}
                  stroke={el.strokeColor}
                  strokeWidth={el.strokeWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'diamond' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="50,5 95,50 50,95 5,50"
                  fill={el.backgroundColor}
                  stroke={el.strokeColor}
                  strokeWidth={el.strokeWidth || 0}
                />
              </svg>
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

        {/* Quick tools bar */}
        {selected && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-white/95 text-gray-800 backdrop-blur rounded-lg shadow-lg px-3 py-2 border border-gray-200">
            <button title="Decrease font" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); updateElement(el.id, { fontSize: Math.max(1, (el.fontSize || 16) - 2) }, true); }}>
              <Minus className="w-5 h-5 text-gray-900" />
            </button>
            <button title="Increase font" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); updateElement(el.id, { fontSize: (el.fontSize || 16) + 2 }, true); }}>
              <Plus className="w-5 h-5 text-gray-900" />
            </button>
            {(el.type === 'text' || el.type === 'price' || el.type === 'promotion') && (
              <>
                <button title="Toggle bold" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); updateElement(el.id, { fontWeight: el.fontWeight === 'bold' ? 'normal' : 'bold' }, true); }}>
                  <BoldIcon className="w-5 h-5 text-gray-900" />
                </button>
                <button title="Cycle text layout" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); const next = el.textLayout === 'straight' ? 'arc' : el.textLayout === 'arc' ? 'circle' : 'straight'; updateElement(el.id, { textLayout: next as any }, true); }}>
                  <CircleIcon className="w-5 h-5 text-gray-900" />
                </button>
              </>
            )}
            <button title={el.locked ? 'Unlock' : 'Lock'} className={`p-1 rounded ${el.locked ? 'bg-yellow-200' : 'hover:bg-gray-200'}`} onClick={(e) => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }, true); }}>
              {el.locked ? <UnlockIcon className="w-5 h-5 text-gray-900" /> : <LockIcon className="w-5 h-5 text-gray-900" />}
            </button>
            <button title="Copy (Ctrl+C)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); copySelectedElements(); }}>
              <Copy className="w-5 h-5 text-gray-900" />
            </button>
            <button title="Paste (Ctrl+V)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); pasteElements(); }} disabled={clipboard.length === 0}>
              <Clipboard className="w-5 h-5 text-gray-900" />
            </button>
            <button title="Duplicate (Ctrl+D)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); duplicateSelectedElements(); }}>
              <Copy className="w-5 h-5 text-gray-900" />
            </button>
            <button title="Delete (Del)" className="p-1 rounded hover:bg-red-200 text-red-700" onClick={(e) => { e.stopPropagation(); setSelectedIds([el.id]); deleteSelected(); }}>
              <Trash2 className="w-5 h-5 text-gray-900" />
            </button>
          </div>
        )}

        {/* Multi-select quick tools */}
        {selectedIds.length > 1 && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-white/95 text-gray-800 backdrop-blur rounded-lg shadow-lg px-3 py-2 border border-gray-200">
            <button title="Align Left" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); alignElements('left'); }}>
              <AlignLeft className="w-5 h-5 text-gray-900" />
            </button>
            <button title="Align Center" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); alignElements('center'); }}>
              <AlignCenter className="w-5 h-5 text-gray-900" />
            </button>
            <button title="Align Right" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); alignElements('right'); }}>
              <AlignRight className="w-5 h-5" />
            </button>
            <button title="Align Top" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); alignElements('top'); }}>
              <AlignCenterVertical className="w-5 h-5" />
            </button>
            <button title="Align Middle" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); alignElements('middle'); }}>
              <AlignCenterVertical className="w-5 h-5" />
            </button>
            <button title="Distribute Horizontally" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); distributeElements('horizontal'); }}>
              <AlignHorizontalDistributeCenter className="w-5 h-5" />
            </button>
            <button title="Distribute Vertically" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); distributeElements('vertical'); }}>
              <AlignVerticalDistributeCenter className="w-5 h-5" />
            </button>
            <button title="Copy (Ctrl+C)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); copySelectedElements(); }}>
              <Copy className="w-5 h-5" />
            </button>
            <button title="Paste (Ctrl+V)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); pasteElements(); }} disabled={clipboard.length === 0}>
              <Clipboard className="w-5 h-5" />
            </button>
            <button title="Duplicate (Ctrl+D)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); duplicateSelectedElements(); }}>
              <Copy className="w-5 h-5" />
            </button>
            <button title="Group (Ctrl+G)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); groupElements(); }}>
              <Group className="w-5 h-5" />
            </button>
            <button title="Ungroup (Ctrl+Shift+G)" className="p-2 rounded hover:bg-gray-200" onClick={(e) => { e.stopPropagation(); ungroupElements(); }}>
              <Ungroup className="w-5 h-5" />
            </button>
          </div>
        )}

      </div>
    );
  };

  // ---------- UI ----------
  return (
    <div className="h-screen bg-gray-100 flex">
      {/* Left Toolbar */}
      <div className="w-16 bg-gray-900 flex flex-col items-center py-4 space-y-4 relative">
        <button
          onClick={() => addElement('text')}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors"
          title="Add Text"
        >
          <Type className="w-5 h-5" />
        </button>
        <button
          onClick={() => addElement('image')}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors"
          title="Add Image"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <div className="relative">
        <button
            onClick={() => setShowShapePicker((s) => !s)}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors"
          title="Add Shape"
        >
          <Square className="w-5 h-5" />
        </button>

          {showShapePicker && (
            <div className="fixed left-16 top-24 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-3 w-56">
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
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors"
          title="Add Price Tag"
        >
          <DollarSign className="w-5 h-5" />
        </button>
        <button
          onClick={() => addElement('promotion')}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors"
          title="Add Promotion Badge"
        >
          <Zap className="w-5 h-5" />
        </button>
        <button
          onClick={undo}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors"
          title="Undo"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors"
          title="Import Template"
        >
          <Upload className="w-5 h-5" />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleImportTemplate} accept=".json" className="hidden" />
        <button
          onClick={() => htmlInputRef.current?.click()}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors"
          title="Import HTML/CSS"
        >
          <Upload className="w-5 h-5" />
        </button>
        <input type="file" ref={htmlInputRef} onChange={handleImportHtml} accept=".html" className="hidden" />
        <input type="file" ref={cssInputRef} accept=".css" className="hidden" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-lg font-semibold text-gray-900">{template.name}</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowTemplateSettings(true)} 
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
              title="Template Settings"
            >
              ⚙️ Settings
            </button>
            <button 
              onClick={() => setShowKeyboardHelp(!showKeyboardHelp)} 
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
              title="Keyboard Shortcuts"
            >
              ⌨️ Shortcuts
            </button>
            <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button onClick={zoomOut} className="p-1 hover:bg-gray-200 rounded">
                  <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium px-2">{Math.round(zoom * 100)}%</span>
              <button onClick={zoomIn} className="p-1 hover:bg-gray-200 rounded">
                  <ZoomIn className="w-5 h-5" />
              </button>
              </div>
            </div>
            <button
              onClick={() => setShowPreview((s) => !s)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${showPreview ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              <Eye className="w-5 h-5" />
              <span>Preview</span>
            </button>
            <button
              onClick={handleDownloadImage}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download PNG</span>
            </button>
            <button
              onClick={handleExportJson}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => {
                // Check if template has proper details
                const hasName = templateRef.current.name && templateRef.current.name.trim() !== '';
                const hasDescription = templateRef.current.preview && templateRef.current.preview.trim() !== '';
                
                if (!hasName || !hasDescription || templateRef.current.category === 'custom') {
                  // Show template settings modal if details are missing
                  setShowTemplateSettings(true);
                  return;
                }
                
                onSave(templateRef.current);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Save className="w-5 h-5" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center space-x-4 flex-shrink-0">
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
          <div className="flex-1 overflow-auto bg-gray-200 p-4">
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

                {/* Unscaled inner canvas (we scale this only) */}
                <div
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
                    overflow: 'hidden',
                  }}
                >
                  {sortedElements.map(renderElement)}
                  
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
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
            <div className="p-4 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Properties</h3>
                <Layers className="w-5 h-5 text-gray-400" />
              </div>

              {selectedIds.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Square className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select an element to edit its properties</p>
                  <p className="text-sm mt-2">Or use the toolbar to add new elements</p>
                </div>
              ) : (
                <>
                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={duplicateSelected}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Copy className="w-5 h-5" />
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
                        
                        const elements = selectedIds.map(id => template.elements.find(e => e.id === id)).filter(Boolean);
                        if (elements.length === 0) return;
                        
                        // Calculate center position
                        const centerX = template.canvasSize.width / 2;
                        const centerY = template.canvasSize.height / 2;
                        
                        // For single element, center it
                        if (elements.length === 1) {
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

                  {/* Flip (for images and shapes) */}
                  {(selectedIds.length > 0) && (
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          selectedIds.forEach((sid) => {
                            const el = template.elements.find(e => e.id === sid);
                            if (!el || (el.type !== 'image' && el.type !== 'shape')) return;
                            updateElement(sid, { scaleX: (el as any).scaleX === -1 ? 1 : -1 } as any, false);
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
                            const el = template.elements.find(e => e.id === sid);
                            if (!el || (el.type !== 'image' && el.type !== 'shape')) return;
                            updateElement(sid, { scaleY: (el as any).scaleY === -1 ? 1 : -1 } as any, false);
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
                    const el = template.elements.find((e) => e.id === id);
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
                              <label className="block text-xs text-gray-500 mb-1">Image URL</label>
                              <input
                                type="url"
                                value={el.imageUrl || ''}
                                onChange={(e) => updateElement(id, { imageUrl: e.target.value })}
                                onBlur={() => commitHistory()}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                placeholder="Enter image URL..."
                              />
                            </div>

                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Or Upload Image</label>
                              <button
                                onClick={() => imageUploadRef.current?.click()}
                                className="w-full bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm"
                              >
                                Choose File
                              </button>
                              <input
                                type="file"
                                accept="image/*"
                                ref={imageUploadRef}
                                className="hidden"
                                onChange={(e) => handleImageUpload(e, id)}
                              />
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
                          <div className="mt-3">
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
                                    const el = template.elements.find(e => e.id === id);
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
                    {template.groups.length} groups
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowTemplateSettings(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
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
                      onSave(updatedTemplate);
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
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Editing</h4>
                  <div className="space-y-1 text-gray-600">
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+C</kbd> Copy</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+V</kbd> Paste</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+D</kbd> Duplicate</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+Z</kbd> Undo</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+Shift+Z</kbd> Redo</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+A</kbd> Select All</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Del</kbd> Delete</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Esc</kbd> Deselect</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Navigation</h4>
                  <div className="space-y-1 text-gray-600">
                    <div><kbd className="bg-gray-100 px-1 rounded">↑</kbd> Move Up</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">↓</kbd> Move Down</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">←</kbd> Move Left</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">→</kbd> Move Right</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+G</kbd> Group</div>
                    <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+Shift+G</kbd> Ungroup</div>
                  </div>
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

    </div>
  );
};