declare module 'dom-to-image' {
  export interface Options {
    width?: number;
    height?: number;
    style?: Record<string, any>;
    quality?: number;
    pixelRatio?: number;
    bgcolor?: string;
    cacheBust?: boolean;
    imagePlaceholder?: string;
    filter?: (node: Node) => boolean;
  }

  export function toPng(node: HTMLElement, options?: Options): Promise<string>;
  export function toJpeg(node: HTMLElement, options?: Options): Promise<string>;
  export function toBlob(node: HTMLElement, options?: Options): Promise<Blob>;
  export function toPixelData(node: HTMLElement, options?: Options): Promise<Uint8ClampedArray>;
  export function toSvg(node: HTMLElement, options?: Options): Promise<string>;
  
  export default {
    toPng,
    toJpeg,
    toBlob,
    toPixelData,
    toSvg,
  };
}
