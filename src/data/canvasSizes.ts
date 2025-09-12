import { CanvasSize } from '../types/MenuBoard';

export const canvasSizes: CanvasSize[] = [
  {
    id: 'tv-16-9',
    name: 'TV 16:9',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    category: 'tv',
  },
  {
    id: 'tv-9-16',
    name: 'TV 9:16',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    category: 'tv',
  },
  {
    id: 'tablet',
    name: 'Tablet',
    width: 1200,
    height: 1920,
    aspectRatio: '5:8',
    category: 'tablet',
  },
  {
    id: 'mobile',
    name: 'Mobile',
    width: 720,
    height: 1280,
    aspectRatio: '9:16',
    category: 'mobile',
  },
];
