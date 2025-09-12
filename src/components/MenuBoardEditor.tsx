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
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Upload,
  Layers,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import domToImage from 'dom-to-image';
import { MenuBoardElement, MenuBoardTemplate } from '../types/MenuBoard';

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

  // File inputs
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const cssInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pointer/drag/resize
  const isPointerDownRef = useRef(false);
  const dragOffsetsRef = useRef<DragOffsets>({});
  const activeResizeRef = useRef<{ id: string; corner: 'tl' | 'tr' | 'bl' | 'br' } | null>(null);
  const dragStartSnapshotRef = useRef<MenuBoardTemplate | null>(null);

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // RGB to Hex converter
  const rgbToHex = (rgb: string) => {
    if (!rgb.startsWith('rgb')) return rgb;
    const [r, g, b] = rgb.match(/\d+/g)?.map(Number) || [0, 0, 0];
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
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
        if (processedParents.has(parent) && !hasSignificantStyling(el, computed)) continue;

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
        if (type !== 'shape' || computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
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
          imageUrl: type === 'image' ? resolveImageUrl(el, doc) : undefined,
          zIndex: getDepth(el, tempContainer) + 1,
          rotation,
          opacity: parseFloat(computed.opacity) || 1,
          shadow: computed.boxShadow || 'none',
        };

        // Preload images with retry
        if (type === 'image' && newEl.imageUrl) {
          await new Promise((resolve) => {
            const img = new Image();
            img.src = newEl.imageUrl;
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
        name: 'Imported Burger Menu',
        canvasSize: { width: canvasWidth, height: canvasHeight },
        backgroundColor: backgroundColor,
        backgroundImage: backgroundImage,
        elements,
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
  const zoomIn = () => setZoom((z) => Math.min(3, Math.round((z + 0.1) * 10) / 10));
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

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.handle !== 'resize') {
      setSelectedIds([]);
    }
  };

  const startDrag = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const el = templateRef.current.elements.find((el) => el.id === id);
    if (!el) return;

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

  const startResize = (e: React.MouseEvent, id: string, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation();
    setSelectedIds([id]);
    isPointerDownRef.current = true;
    activeResizeRef.current = { id, corner };
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
          }
          return { ...el, x, y, width, height };
        });

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
        const nx = px - off.dx;
        const ny = py - off.dy;
        return { ...el, x: nx, y: ny };
      });
      const next = { ...prev, elements: list };
      templateRef.current = next;
      return next;
    });
  };

  const onPointerUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    activeResizeRef.current = null;
    dragOffsetsRef.current = {};
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    commitHistory();
  };

  // ---------- Element ops ----------
  const addElement = (type: MenuBoardElement['type']) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const base: MenuBoardElement = {
      id,
      type,
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
              : type === 'shape'
                ? 'New Shape Text'
                : '',
      fontSize: type === 'price' ? 32 : 24,
      fontWeight: 'bold',
      fontFamily: 'Arial',
      color: type === 'price' ? '#FFD700' : '#FFFFFF',
      backgroundColor: type === 'shape' || type === 'promotion' ? '#000000' : 'transparent',
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
    const next = {
      ...templateRef.current,
      elements: templateRef.current.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    };
    setTemplate(next);
    templateRef.current = next;
    if (commit) commitHistory(next);
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

  const renderElement = (el: MenuBoardElement) => {
    const selected = selectedIds.includes(el.id);
    return (
      <div
        key={el.id}
        className={`absolute select-none ${selected ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          left: el.x,
          top: el.y,
          width: el.width,
          height: el.height,
          transform: `rotate(${el.rotation || 0}deg)`,
          opacity: el.opacity ?? 1,
          boxShadow: el.shadow ?? 'none',
          zIndex: el.zIndex,
          backgroundColor: el.backgroundColor || 'transparent',
          color: el.color || '#FFFFFF',
          fontSize: el.fontSize || 16,
          fontWeight: el.fontWeight || 'normal',
          fontFamily: el.fontFamily || 'Arial',
          borderRadius: el.borderRadius || 0,
          whiteSpace: 'pre-line',
        }}
        onMouseDown={(e) => startDrag(e, el.id)}
      >
        {el.type === 'text' || el.type === 'price' || el.type === 'promotion' || el.type === 'shape' ? (
          <div
            className="w-full h-full flex items-center justify-center text-center leading-tight"
            style={{ backgroundColor: 'transparent' }}
          >
            {el.content}
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
        {selected && (
          <>
            <div
              data-handle="resize"
              className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize"
              onMouseDown={(e) => startResize(e, el.id, 'tl')}
            />
            <div
              data-handle="resize"
              className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize"
              onMouseDown={(e) => startResize(e, el.id, 'tr')}
            />
            <div
              data-handle="resize"
              className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize"
              onMouseDown={(e) => startResize(e, el.id, 'bl')}
            />
            <div
              data-handle="resize"
              className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize"
              onMouseDown={(e) => startResize(e, el.id, 'br')}
            />
          </>
        )}
      </div>
    );
  };

  // ---------- UI ----------
  return (
    <div className="h-screen bg-gray-100 flex">
      {/* Left Toolbar */}
      <div className="w-16 bg-gray-900 flex flex-col items-center py-4 space-y-4">
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
        <button
          onClick={() => addElement('shape')}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors"
          title="Add Shape"
        >
          <Square className="w-5 h-5" />
        </button>
        <button
          onClick={() => addElement('price')}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors"
          title="Add Price"
        >
          <DollarSign className="w-5 h-5" />
        </button>
        <button
          onClick={() => addElement('promotion')}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white transition-colors"
          title="Add Promotion"
        >
          <DollarSign className="w-5 h-5" />
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
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-lg font-semibold text-gray-900">{template.name}</h1>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button onClick={zoomOut} className="p-1 hover:bg-gray-200 rounded">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium px-2">{Math.round(zoom * 100)}%</span>
              <button onClick={zoomIn} className="p-1 hover:bg-gray-200 rounded">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowPreview((s) => !s)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${showPreview ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            <button
              onClick={handleDownloadImage}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG</span>
            </button>
            <button
              onClick={handleExportJson}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => onSave(templateRef.current)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Canvas Area */}
          <div className="flex-1 overflow-auto bg-gray-200 p-8">
            <div className="mx-auto max-w-max">
              {/* Wrapper sized to scaled dimensions so scrollbars reflect zoom */}
              <div
                ref={wrapperRef}
                className="relative shadow-2xl bg-white"
                style={{
                  width: template.canvasSize.width * zoom,
                  height: template.canvasSize.height * zoom,
                }}
                onMouseDown={handleCanvasMouseDown}
              >
                {/* Background checkerboard (optional): */}
                <div className="absolute inset-0 bg-[linear-gradient(45deg,#eee_25%,transparent_25%_75%,#eee_75%),linear-gradient(45deg,#eee_25%,transparent_25%_75%,#eee_75%)] bg-[size:20px_20px] bg-[position:0_0,10px_10px]" />

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
                    backgroundImage: template.backgroundImage,
                    overflow: 'hidden',
                  }}
                >
                  {sortedElements.map(renderElement)}
                </div>
              </div>
            </div>
          </div>

          {/* Right Properties Panel */}
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
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
                      <Copy className="w-4 h-4" />
                      <span>Duplicate</span>
                    </button>
                    <button
                      onClick={deleteSelected}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                    <button
                      onClick={bringForward}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <ArrowUp className="w-4 h-4" />
                      <span>Forward</span>
                    </button>
                    <button
                      onClick={sendBackward}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <ArrowDown className="w-4 h-4" />
                      <span>Backward</span>
                    </button>
                    <button
                      onClick={bringToFront}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <ArrowUp className="w-4 h-4" />
                      <span>To Front</span>
                    </button>
                    <button
                      onClick={sendToBack}
                      className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-1 transition-colors"
                    >
                      <ArrowDown className="w-4 h-4" />
                      <span>To Back</span>
                    </button>
                  </div>

                  {selectedIds.map((id) => {
                    const el = template.elements.find((e) => e.id === id);
                    if (!el) return null;

                    return (
                      <div key={id} className="mb-8 border border-gray-100 rounded-lg p-3">
                        <div className="text-xs font-medium text-gray-500 mb-2">
                          ID: <span className="font-mono">{id.slice(-8)}</span> · Type: {el.type}
                        </div>

                        {/* Position & Size */}
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

                        {/* Rotation */}
                        <div className="mt-3">
                          <label className="block text-xs text-gray-500 mb-1">Rotation</label>
                          <input
                            type="range"
                            min={-180}
                            max={180}
                            value={el.rotation || 0}
                            onChange={(e) => updateElement(id, { rotation: parseInt(e.target.value, 10) })}
                            onMouseUp={() => commitHistory()}
                            className="w-full"
                          />
                          <div className="text-center text-sm">{el.rotation || 0}{DEG}</div>
                        </div>

                        {/* Content / Image */}
                        {(el.type === 'text' || el.type === 'price' || el.type === 'promotion' || el.type === 'shape') && (
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
                          <div className="mt-3">
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
                        )}

                        {/* Typography */}
                        {(el.type === 'text' || el.type === 'price' || el.type === 'promotion' || el.type === 'shape') && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Font Size</label>
                              <input
                                type="number"
                                value={el.fontSize || 16}
                                onChange={(e) => updateElement(id, { fontSize: parseInt(e.target.value, 10) || 16 })}
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
                          </div>
                        )}

                        {/* Colors */}
                        <div className="mt-3 space-y-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Text Color</label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="color"
                                value={el.color || '#000000'}
                                onChange={(e) => updateElement(id, { color: e.target.value })}
                                onBlur={() => commitHistory()}
                                className="w-8 h-8 rounded border border-gray-300"
                              />
                              <input
                                type="text"
                                value={el.color || '#000000'}
                                onChange={(e) => updateElement(id, { color: e.target.value })}
                                onBlur={() => commitHistory()}
                                className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono"
                              />
                            </div>
                          </div>
                          {(el.type === 'shape' || el.type === 'promotion') && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Background</label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="color"
                                  value={el.backgroundColor || '#000000'}
                                  onChange={(e) => updateElement(id, { backgroundColor: e.target.value })}
                                  onBlur={() => commitHistory()}
                                  className="w-8 h-8 rounded border border-gray-300"
                                />
                                <input
                                  type="text"
                                  value={el.backgroundColor || '#000000'}
                                  onChange={(e) => updateElement(id, { backgroundColor: e.target.value })}
                                  onBlur={() => commitHistory()}
                                  className="flex-1 p-2 border border-gray-300 rounded text-sm font-mono"
                                />
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

                        <div className="mt-3">
                          <label className="block text-xs text-gray-500 mb-1">Shadow</label>
                          <select
                            value={el.shadow || 'none'}
                            onChange={(e) => updateElement(id, { shadow: e.target.value })}
                            onBlur={() => commitHistory()}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                          >
                            <option value="none">None</option>
                            <option value="0 4px 6px rgba(0,0,0,0.1)">Light</option>
                            <option value="0 10px 15px rgba(0,0,0,0.2)">Medium</option>
                            <option value="0 20px 25px rgba(0,0,0,0.3)">Heavy</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Canvas Background */}
              <div className="mt-2 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">Canvas</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={template.backgroundColor || '#FFFFFF'}
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
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
          onClick={(e) => {
            // close only if clicked on overlay
            if (e.target === e.currentTarget) setShowPreview(false);
          }}
        >
          <div className="relative">
            {/* Close button OUTSIDE the scaled canvas */}
            <button
              onClick={() => setShowPreview(false)}
              className="absolute -top-12 right-0 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70 z-50"
              aria-label="Close preview"
            >
              ✕
            </button>

            <div
              className="relative overflow-hidden"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                backgroundColor: template.backgroundColor,
                backgroundImage: template.backgroundImage
                  ? `url(${template.backgroundImage})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div
                style={{
                  width: template.canvasSize.width,
                  height: template.canvasSize.height,
                  transform: `scale(${Math.min(
                    0.9 * (window.innerWidth / template.canvasSize.width),
                    0.9 * (window.innerHeight / template.canvasSize.height)
                  )})`,
                  transformOrigin: "top left",
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
                    {el.type === "text" ||
                      el.type === "price" ||
                      el.type === "promotion" ||
                      el.type === "shape" ? (
                      <div
                        className="w-full h-full flex items-center justify-center text-center leading-tight"
                        style={{ whiteSpace: "pre-line", backgroundColor: "transparent" }}
                      >
                        {el.content}
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
      )}


    </div>
  );
};