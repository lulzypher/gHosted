// Type definitions for qrcode module
declare module 'qrcode' {
  /**
   * Options for QR code generation
   */
  export interface QRCodeToDataURLOptions {
    type?: string;
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    rendererOpts?: {
      quality?: number;
    };
  }

  /**
   * Convert text to QR code data URL
   */
  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
  export function toDataURL(text: string, callback: (err: Error | null, url: string) => void): void;
  export function toDataURL(text: string, options: QRCodeToDataURLOptions, callback: (err: Error | null, url: string) => void): void;

  /**
   * Create QR code canvas
   */
  export function toCanvas(canvasElement: HTMLCanvasElement, text: string, options?: QRCodeToDataURLOptions): Promise<void>;
  export function toCanvas(canvasElement: HTMLCanvasElement, text: string, callback: (err: Error | null) => void): void;
  export function toCanvas(canvasElement: HTMLCanvasElement, text: string, options: QRCodeToDataURLOptions, callback: (err: Error | null) => void): void;
  export function toCanvas(text: string, options?: QRCodeToDataURLOptions): Promise<HTMLCanvasElement>;
  export function toCanvas(text: string, callback: (err: Error | null, canvas: HTMLCanvasElement) => void): void;
  export function toCanvas(text: string, options: QRCodeToDataURLOptions, callback: (err: Error | null, canvas: HTMLCanvasElement) => void): void;

  /**
   * Create a QR code string representation
   */
  export function toString(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
  export function toString(text: string, callback: (err: Error | null, string: string) => void): void;
  export function toString(text: string, options: QRCodeToDataURLOptions, callback: (err: Error | null, string: string) => void): void;
}