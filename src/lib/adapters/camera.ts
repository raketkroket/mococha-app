/**
 * Camera/image-picker adapter — uses browser File API with camera capture.
 * Designed to be replaced by expo-image-picker in a native build.
 */

export interface ImageResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}

export async function pickFromLibrary(): Promise<ImageResult | null> {
  return pickImage(false);
}

export async function takePhoto(): Promise<ImageResult | null> {
  return pickImage(true);
}

async function pickImage(fromCamera: boolean): Promise<ImageResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/heic";
    if (fromCamera) input.capture = "environment";
    input.style.display = "none";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      try {
        const dataUrl = await readFileAsDataURL(file);
        const dims = await getImageDimensions(dataUrl);
        resolve({ file, dataUrl, width: dims.width, height: dims.height });
      } catch {
        resolve(null);
      }
    };

    input.click();
  });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

/**
 * Compress an image to JPEG with max dimensions.
 * Returns a Blob suitable for upload.
 */
export async function compressImage(
  dataUrl: string,
  maxSize = 512,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxSize) {
        height = Math.round(height * (maxSize / width));
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round(width * (maxSize / height));
        height = maxSize;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(new Blob()); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob ?? new Blob()), "image/jpeg", quality);
    };
    img.onerror = () => resolve(new Blob());
    img.src = dataUrl;
  });
}
