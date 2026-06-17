import { useState, useEffect } from 'react';

interface RGB {
  r: number;
  g: number;
  b: number;
}

export function useImageColor(imageUrl?: string) {
  const [color, setColor] = useState<RGB | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setColor(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw the image scaled down to 1x1 pixel
      ctx.drawImage(img, 0, 0, 1, 1);
      
      try {
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        setColor({ r, g, b });
      } catch (err) {
        console.warn('Canvas image data extraction failed (CORS?):', err);
        setColor(null);
      }
    };

    img.onerror = () => {
      setColor(null);
    };
  }, [imageUrl]);

  return color;
}
