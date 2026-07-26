export type ArchStage = {
  id: string;
  title: string;
  what: string;
  how: string[];
  io: [string, string];
  tech: string;
};

export const STAGES: ArchStage[] = [
  {
    id: "M1",
    title: "Input Acquisition",
    what:
      "Grabs a continuous stream of still images (frames) from the webcam or a loaded video file. Nothing leaves the machine.",
    how: [
      "getUserMedia() opens the camera and pipes it into a <video> element.",
      "A requestAnimationFrame loop samples the video ~10-30 times per second.",
      "Each sampled frame is drawn onto an offscreen canvas so pixels can be read.",
    ],
    io: ["Camera / video file", "RGB frame (e.g. 640x480)"],
    tech: "MediaDevices API · Canvas 2D",
  },
  {
    id: "M2",
    title: "Face Detection & Pre-processing",
    what:
      "Finds where the face is in the frame, crops it, and normalises lighting so the classifier sees a consistent input.",
    how: [
      "A lightweight detector (SSD/MTCNN-style cascade) returns a bounding box + 68 landmarks.",
      "The face is cropped, aligned on the eye axis and resized to a fixed square.",
      "CLAHE (contrast-limited adaptive histogram equalisation) evens out shadows and back-light.",
      "If no box is returned for N frames, the UI raises the 'No face detected' warning instead of guessing.",
    ],
    io: ["RGB frame", "Aligned face crop (grayscale-normalised)"],
    tech: "MTCNN / SSD-MobileNet · Landmarks · CLAHE",
  },
  {
    id: "M3",
    title: "CNN Spatial Feature Extraction",
    what:
      "Turns the face image into numbers. A convolutional network compresses the crop into a 512-dimensional feature vector describing muscle configuration - brow raise, lip corner pull, nose wrinkle.",
    how: [
      "Convolution layers learn edges then textures then facial action units, layer by layer.",
      "The final pooling layer outputs one 512-D embedding per frame (the classification head is removed).",
      "This is transfer learning: the backbone is pre-trained, then fine-tuned on micro-expression data.",
    ],
    io: ["Aligned face crop", "512-D feature vector"],
    tech: "ResNet-50 backbone · Global average pooling",
  },
  {
    id: "M4",
    title: "Temporal Sequence Buffer",
    what:
      "A micro-expression is a movement, not a photo - it lasts 40-500 ms. So the system stacks the last 16 frame-vectors into a sliding window.",
    how: [
      "Ring buffer of length 16: newest vector pushed in, oldest dropped out.",
      "Result is a 16 x 512 matrix - the shape of the expression over time.",
      "The console's 'Sequence Buffer' meter shows this filling up before predictions stabilise.",
    ],
    io: ["512-D vector per frame", "16 x 512 sequence tensor"],
    tech: "Sliding window · Stride 1",
  },
  {
    id: "M5",
    title: "LSTM Temporal Modelling",
    what:
      "Two stacked LSTM layers read the 16-step sequence in order and learn the onset - apex - offset dynamics that separate a genuine micro-expression from a slow, deliberate pose.",
    how: [
      "LSTM cells carry a hidden state, so frame 12 is interpreted in light of frames 1-11.",
      "Layer 1 (256 units) captures short motion; layer 2 (256 units) captures the full arc.",
      "Dropout between layers prevents memorising individual subjects.",
    ],
    io: ["16 x 512 sequence", "256-D temporal summary"],
    tech: "2 x LSTM(256) · Dropout 0.5",
  },
  {
    id: "M6",
    title: "Classification & Session Analytics",
    what:
      "A dense layer + softmax converts the temporal summary into 7 probabilities that add up to 1. The highest one is drawn on screen; everything is logged for the report.",
    how: [
      "Softmax over the 7 Ekman classes: fear, anger, disgust, happiness, sadness, surprise, contempt.",
      "Predictions below the confidence threshold are suppressed rather than shown as fact.",
      "Accepted predictions increment the cumulative frequency bars and append to the event log with a timestamp + snapshot.",
    ],
    io: ["256-D temporal summary", "Label + confidence + session record"],
    tech: "Dense - Softmax(7) · Argmax + threshold",
  },
];

export const FLOW = [
  "Webcam",
  "Face detect",
  "CLAHE crop",
  "CNN 512-D",
  "Buffer 16",
  "LSTM 256x2",
  "Softmax 7",
  "Overlay + Report",
];

export const RUNTIME: Array<[string, string]> = [
  ["Throughput", "10-30 frames per second on a standard laptop CPU"],
  ["End-to-end latency", "Under 500 ms from captured frame to on-screen label"],
  ["Sequence window", "16 frames (~0.5-1.5 s of facial motion)"],
  ["Feature dimensionality", "512-D per frame, 16 x 512 per prediction"],
  ["Output classes", "7 (Ekman universal emotions)"],
  ["Execution location", "Fully on-device in the browser - no frame is uploaded"],
  ["Failure behaviour", "No face detected raises a warning; predictions are suppressed"],
  ["Session outputs", "Live overlay, cumulative frequency chart, event log, PDF report"],
];

export const RATIONALE: Array<[string, string]> = [
  [
    "Why a CNN?",
    "Images are spatial. Convolutions share weights across the image, so the model learns 'brow raised' once instead of separately for every pixel position.",
  ],
  [
    "Why an LSTM?",
    "Micro-expressions are defined by how fast they appear and vanish. A single frame cannot express duration; a recurrent layer can.",
  ],
  [
    "Why on-device?",
    "Faces are biometric data. Running inference locally means frames are never transmitted, which keeps interview footage private by construction.",
  ],
];

export const DEMO_STEPS = [
  "Open the console and press Start Live Analysis; grant camera access (M1 begins).",
  "Watch the bounding box lock onto the face - that is M2 reporting a detection.",
  "Observe the Sequence Buffer meter fill to 16/16; until then M5 has no full window.",
  "Hold a neutral face, then flash a brief expression. The label and confidence update within ~500 ms.",
  "Cover the camera: M2 fails, the 'No face detected' warning appears, and no prediction is faked.",
  "Let the session run 30-60 s, press Stop, then Export PDF Report for timeline, log and snapshots.",
];
