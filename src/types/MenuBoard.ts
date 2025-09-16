export type ElementType = 'text' | 'image' | 'shape' | 'price' | 'promotion';

export interface MenuBoardElement {
  id: string;
  type: 'text' | 'image' | 'price' | 'promotion' | 'shape';
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'star';  // 👈 add this
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  imageUrl?: string;
  zIndex?: number;
  rotation?: number;
  opacity?: number;
  shadow?: string;
  textShadow?: string;
}


export interface CanvasSize {
  id: string;
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  category: 'tv' | 'tablet' | 'mobile' | 'other';
}

export interface MenuBoardTemplate {
  id: string;
  name: string;
  category: string;
  preview: string;
  backgroundColor: string;
  canvasSize: CanvasSize;
  isHorizontal: boolean;
  elements: MenuBoardElement[];
}
