import { CanvasSize } from '../types/MenuBoard';

export const canvasSizes: CanvasSize[] = [
  // Simple, common TV sizes with clear names
  {
    id: 'tv-1080p-landscape',
    name: 'Full HD (1920×1080)',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    category: 'tv',
  },
  {
    id: 'tv-720p-landscape',
    name: 'HD (1280×720)',
    width: 1280,
    height: 720,
    aspectRatio: '16:9',
    category: 'tv',
  },
  {
    id: 'tv-1366-landscape',
    name: '1366×768',
    width: 1366,
    height: 768,
    aspectRatio: '16:9',
    category: 'tv',
  },
];
