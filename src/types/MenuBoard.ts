export type ElementType = 'text' | 'image' | 'shape' | 'price' | 'promotion';

export interface MenuBoardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  imageUrl?: string;
  price?: string;
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
