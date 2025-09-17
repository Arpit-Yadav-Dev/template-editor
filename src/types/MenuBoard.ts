export type ElementType = 'text' | 'image' | 'shape' | 'price' | 'promotion';

export interface MenuBoardElement {
  id: string;
  type: 'text' | 'image' | 'price' | 'promotion' | 'shape';
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'star' | 'hexagon' | 'heart' | 'diamond';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  price?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  imageUrl?: string;
  zIndex?: number;
  rotation?: number;
  opacity?: number;
  shadow?: string;
  textShadow?: string;
  // Text layout options
  textLayout?: 'straight' | 'arc' | 'circle';
  // Arc text parameters (for textLayout === 'arc' | 'circle')
  textRadius?: number; // in px, distance from center to baseline
  textArcAngle?: number; // in degrees, sweep for arc text; 360 for full circle
  textDirection?: 'clockwise' | 'counterclockwise';
  textSpacing?: number; // additional letter spacing along path, in px
  // Interactions
  locked?: boolean; // when true, prevent drag/resize/rotate
  // Text stroke / outline
  textStrokeColor?: string;
  textStrokeWidth?: number; // in px
  // Text gradient
  textGradient?: 'none' | 'linear' | 'radial';
  textGradientColors?: string[]; // array of colors for gradient
  textGradientDirection?: number; // degrees for linear gradient
  // Advanced shadows
  shadowType?: 'none' | 'drop' | 'inner';
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowSpread?: number;
  // Grouping
  groupId?: string; // ID of the group this element belongs to
  // Shape stroke properties
  strokeWidth?: number;
  strokeColor?: string;
}


export interface CanvasSize {
  id: string;
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  category: 'tv' | 'tablet' | 'mobile' | 'other';
  isHorizontal?: boolean;
}

export interface MenuBoardGroup {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  elementIds: string[];
  locked?: boolean;
}

export interface MenuBoardTemplate {
  id: string;
  name: string;
  category: string;
  preview: string;
  backgroundColor: string;
  backgroundImage?: string;
  backgroundImageFit?: 'cover' | 'contain' | 'fill' | 'fit-width' | 'fit-height';
  backgroundImagePosition?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  canvasSize: CanvasSize;
  isHorizontal: boolean;
  elements: MenuBoardElement[];
  groups: MenuBoardGroup[];
}
