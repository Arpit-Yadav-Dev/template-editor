import { MenuBoardTemplate } from '../types/MenuBoard';
import { canvasSizes } from './canvasSizes';

export const menuBoardTemplates: MenuBoardTemplate[] = [
  {
    id: 'burger-1',
    name: 'Burger Special',
    category: 'burger',
    preview: 'Bold burger layout with price highlight',
    backgroundColor: '#fff8f0',
    canvasSize: canvasSizes[0], // TV 16:9
    isHorizontal: true,
    elements: [
      {
        id: 'title1',
        type: 'text',
        x: 100,
        y: 80,
        width: 600,
        height: 80,
        rotation: 0,
        content: 'BURGER COMBO',
        fontSize: 48,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#111',
      },
      {
        id: 'price1',
        type: 'price',
        x: 750,
        y: 90,
        width: 200,
        height: 60,
        rotation: 0,
        content: '',
        price: '$9.99',
        fontSize: 36,
        fontWeight: 'bold',
        textAlign: 'right',
        color: '#e11d48',
      },
    ],
  },
  {
    id: 'cafe-1',
    name: 'Cafe Morning',
    category: 'cafe',
    preview: 'Warm coffee-themed menu board',
    backgroundColor: '#fdf6e3',
    canvasSize: canvasSizes[2], // Tablet
    isHorizontal: false,
    elements: [
      {
        id: 'header1',
        type: 'text',
        x: 50,
        y: 60,
        width: 400,
        height: 60,
        rotation: 0,
        content: 'Morning Coffee',
        fontSize: 40,
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#4b2e2e',
      },
    ],
  },
];
