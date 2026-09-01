import { Camera, Crop, Cpu, Layers, Activity, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ArchStage = {
  id: string;
  title: string;
  what: string;
  how: string[];
  io: [string, string];
  tech: string;
  icon: LucideIcon;
};

export const STAGES: ArchStage[] = [
  {
    id: "M1",
    title: "Input Acquisition",
    what:
      "Grabs a continuous stream of still frames from the webcam. Nothing leaves the machine — every pixel stays on-device for biometric privacy.",
    how: [
      "getUserMedia() opens the camera and pipes it into a <video> element.",
      "A requestAnimationFrame loop samples the video ~10–30 times per second.",
      "Each sampled frame is drawn onto an offscreen canvas so pixels can be read.",
    ],
    io: ["Camera stream", "RGB frame (e.g. 640×480)"],
    tech: "MediaDevices API · Canvas 2D",
    icon: Camera,
  },
  {
    id: "M2",
    title: "Face Detection & Pre-processing",
    what:
      "Finds the face in the frame, crops and aligns it, and normalises lighting so the classifier sees a consistent input.",
    how: [
      "A lightweight SSD-style detector returns a bounding box + landmarks.",
      "The face is cropped, aligned on the eye axis and resized to a fixed square.",
      "CLAHE-style histogram equalisation evens out shadows and back-light.",
      "If no box is returned for N frames, the UI raises the 'No face detected' warning instead of guessing.",
    ],
    io: ["RGB frame", "Aligned face crop (grayscale-normalised)"],
    tech: "TinyFaceDetector · Landmarks · CLAHE",
    icon: Crop,
  },
  {
    id: "M3",
    title: "CNN Spatial Feature Extraction",
    what:
      "Turns the face image into numbers. A convolutional network compresses the crop into a feature vector describing muscle configuration — brow raise, lip-corner pull, nose wrinkle.",
    how: [
      "Convolution layers learn edges → textures → facial action units, layer by layer.",
      "The final pooling layer outputs one feature embedding per frame.",
      "Transfer learning: backbone pre-trained, fine-tuned on expression data.",
    ],
    io: ["Aligned face crop", "Feature vector per frame"],
    tech: "Deep CNN backbone · Global average pooling",
    icon: Cpu,
  },
  {
    id: "M4",
    title: "Temporal Sequence Buffer",
    what:
      "A micro-expression is a movement, not a photo — it lasts 40–500 ms. So the system stacks the last 16 frame-vectors into a sliding window.",
    how: [
      "Ring buffer of length 16: newest vector pushed in, oldest dropped out.",
      "Result is a 16 × D matrix — the shape of the expression over time.",
      "The console's 'Sequence Buffer' meter fills before predictions stabilise.",
    ],
    io: ["Per-frame vector", "16-step sequence tensor"],
    tech: "Sliding window · Stride 1",
    icon: Layers,
  },
  {
    id: "M5",
    title: "LSTM Temporal Modelling",
    what:
      "Two stacked LSTM layers read the 16-step sequence and learn the onset → apex → offset dynamics that separate a genuine micro-expression from a slow, deliberate pose.",
    how: [
      "LSTM cells carry a hidden state, so frame 12 is interpreted in light of frames 1–11.",
      "Layer 1 (256 units) captures short motion; layer 2 (256 units) captures the full arc.",
      "Dropout between layers prevents memorising individual subjects.",
    ],
    io: ["16-step sequence", "Temporal summary vector"],
    tech: "2 × LSTM(256) · Dropout 0.5",
    icon: Activity,
  },
  {
    id: "M6",
    title: "Classification & Micro-Spike Analysis",
    what:
      "A dense layer + softmax converts the temporal summary into 7 probabilities that add up to 1. A micro-expression spike detector then isolates the brief, involuntary leaks that betray a masked emotion.",
    how: [
      "Softmax over the 7 Ekman classes: fear, anger, disgust, happiness, sadness, surprise, contempt.",
      "Dominant label drawn on screen; sub-threshold predictions suppressed, not faked.",
      "Spike detector flags rapid 40–500 ms non-dominant bursts — the true micro-expressions.",
      "Leakage analyser cross-references spikes against the sustained mask to estimate deception risk.",
    ],
    io: ["Temporal summary", "Label + confidence + micro-spike + risk score"],
    tech: "Dense → Softmax(7) · Spike gate · Leakage analyser",
    icon: BarChart3,
  },
];

export const FLOW = [
  "Webcam",
  "Face detect",
  "CLAHE crop",
  "CNN features",
  "Buffer 16",
  "LSTM 256×2",
  "Softmax 7",
  "Spike + Report",
];

export const RUNTIME: Array<[string, string]> = [
  ["Throughput", "10–30 frames per second on a standard laptop CPU"],
  ["End-to-end latency", "Under 500 ms from captured frame to on-screen label"],
  ["Sequence window", "16 frames (~0.5–1.5 s of facial motion)"],
  ["Micro-spike window", "40–500 ms — the true micro-expression band"],
  ["Output classes", "7 (Ekman universal emotions)"],
  ["Execution location", "Fully on-device in the browser — no frame is uploaded"],
  ["Failure behaviour", "No face detected raises a warning; predictions are suppressed"],
  ["Session outputs", "Live overlay, intensity timeline, spike feed, PDF + CSV report"],
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
    "Why a spike gate?",
    "The dominant emotion is the mask. The signal is the brief, involuntary leak that flashes through it for a fraction of a second.",
  ],
  [
    "Why on-device?",
    "Faces are biometric data. Running inference locally means frames are never transmitted, which keeps interview footage private by construction.",
  ],
];
