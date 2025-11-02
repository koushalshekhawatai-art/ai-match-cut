import * as faceapi from 'face-api.js';

// Track if models are loaded
let modelsLoaded = false;

/**
 * Load all face-api.js models from the public/models directory
 * This should be called once before using any face detection features
 */
export async function loadFaceApiModels(): Promise<void> {
  if (modelsLoaded) {
    console.log('Face-api models already loaded');
    return;
  }

  const MODEL_URL = '/models';

  try {
    console.log('Loading face-api models...');

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    ]);

    modelsLoaded = true;
    console.log('Face-api models loaded successfully');
  } catch (error) {
    console.error('Error loading face-api models:', error);
    throw error;
  }
}

/**
 * Check if models are loaded
 */
export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

/**
 * Detect all faces in an image or video element
 * @param input - HTMLImageElement, HTMLVideoElement, or HTMLCanvasElement
 * @param options - Detection options
 */
export async function detectAllFaces(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  options: {
    withLandmarks?: boolean;
    withDescriptors?: boolean;
    withExpressions?: boolean;
    useTinyModel?: boolean;
  } = {}
) {
  if (!modelsLoaded) {
    throw new Error('Face-api models not loaded. Call loadFaceApiModels() first.');
  }

  const {
    withLandmarks = false,
    withDescriptors = false,
    withExpressions = false,
    useTinyModel = false,
  } = options;

  // Use SSD MobileNet v1 for better accuracy by default, or Tiny for speed
  const detectorOptions = useTinyModel
    ? new faceapi.TinyFaceDetectorOptions()
    : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

  // Build the detection chain before awaiting
  let detectionChain: any = faceapi.detectAllFaces(input, detectorOptions);

  if (withLandmarks) {
    detectionChain = detectionChain.withFaceLandmarks();
  }

  if (withDescriptors) {
    detectionChain = detectionChain.withFaceDescriptors();
  }

  if (withExpressions) {
    detectionChain = detectionChain.withFaceExpressions();
  }

  // Await the complete chain
  const detections = await detectionChain;
  return detections;
}

/**
 * Detect single face in an image or video element
 * @param input - HTMLImageElement, HTMLVideoElement, or HTMLCanvasElement
 * @param options - Detection options
 */
export async function detectSingleFace(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  options: {
    withLandmarks?: boolean;
    withDescriptors?: boolean;
    withExpressions?: boolean;
    useTinyModel?: boolean;
  } = {}
) {
  if (!modelsLoaded) {
    throw new Error('Face-api models not loaded. Call loadFaceApiModels() first.');
  }

  const {
    withLandmarks = false,
    withDescriptors = false,
    withExpressions = false,
    useTinyModel = false,
  } = options;

  // Use SSD MobileNet v1 for better accuracy by default, or Tiny for speed
  const detectorOptions = useTinyModel
    ? new faceapi.TinyFaceDetectorOptions()
    : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

  // Build the detection chain before awaiting
  let detectionChain: any = faceapi.detectSingleFace(input, detectorOptions);

  if (withLandmarks) {
    detectionChain = detectionChain.withFaceLandmarks();
  }

  if (withDescriptors) {
    detectionChain = detectionChain.withFaceDescriptors();
  }

  if (withExpressions) {
    detectionChain = detectionChain.withFaceExpressions();
  }

  // Await the complete chain
  const detection = await detectionChain;
  return detection;
}

// Export the face-api namespace for advanced usage
export { faceapi };
