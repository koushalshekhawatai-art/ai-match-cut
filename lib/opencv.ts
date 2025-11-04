'use client';

let isOpenCVLoaded = false;
let cvInstance: any = null;

export async function loadOpenCV(): Promise<void> {
  if (isOpenCVLoaded && cvInstance) {
    return;
  }

  return new Promise((resolve, reject) => {
    // Temporarily disabled - will implement template matching in next step
    console.log('OpenCV loading placeholder - ready for template matching implementation');

    // Simulate loading
    setTimeout(() => {
      isOpenCVLoaded = true;
      console.log('✅ OpenCV ready (placeholder mode)');
      resolve();
    }, 1000);
  });
}

export function isOpenCVReady(): boolean {
  return isOpenCVLoaded;
}

export function getCV() {
  return cvInstance;
}
