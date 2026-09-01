/**
 * Emotion domain model — Ekman-7 universal emotions.
 *
 * The face-api.js expression net ships 7 outputs: neutral, happy, sad, angry,
 * fearful, disgusted, surprised. Ekman's universal emotion set is the same minus
 * "neutral" plus "contempt". We re-map and approximate contempt from an
 * asymmetric disgust/neutral heuristic so the investigator console matches the
 * Ekman-7 nomenclature used in forensic literature.
 */

export const EMOTIONS = [
  "Fear",
  "Anger",
  "Disgust",
  "Happiness",
  "Sadness",
  "Surprise",
  "Contempt",
] as const;

export type Emotion = (typeof EMOTIONS)[number];

/** Emotions considered negative-valence for the leakage / deception signal. */
export const LEAKAGE_EMOTIONS: Emotion[] = [
  "Fear",
  "Anger",
  "Disgust",
  "Sadness",
];

export type EmotionDist = Record<Emotion, number>;

/** A single per-frame distribution as returned by face-api.js, re-mapped to Ekman-7. */
export interface EmotionFrame {
  dist: EmotionDist;
  label: Emotion;
  conf: number; // 0..1, probability of the dominant label
}

/** Distinct color per emotion, chosen to be readable on both light & dark panels. */
export const EMOTION_COLOR: Record<Emotion, string> = {
  Fear: "#b54a8a",
  Anger: "#c0392b",
  Disgust: "#8a6d1f",
  Happiness: "#2e9e6b",
  Sadness: "#3a6f9a",
  Surprise: "#9b59b6",
  Contempt: "#6b6b6b",
};

/** Short glyph per emotion for compact legend chips. */
export const EMOTION_GLYPH: Record<Emotion, string> = {
  Fear: "⊘",
  Anger: "▲",
  Disgust: "∿",
  Happiness: "◡",
  Sadness: "⌄",
  Surprise: "✦",
  Contempt: "¬",
};

export function emptyDist(): EmotionDist {
  return {
    Fear: 0,
    Anger: 0,
    Disgust: 0,
    Happiness: 0,
    Sadness: 0,
    Surprise: 0,
    Contempt: 0,
  };
}

/** Re-map face-api.js 7 expression probabilities to the Ekman-7 distribution. */
export function mapFaceApiToEkman(e: {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}): EmotionFrame {
  // Contempt heuristic: face-api has no contempt channel; approximate from
  // asymmetric disgust + residual neutral. Capped so it can't dominate.
  const contempt = Math.min(0.35, e.disgusted * 0.35 + e.neutral * 0.08);
  const raw: EmotionDist = {
    Fear: e.fearful,
    Anger: e.angry,
    Disgust: Math.max(0, e.disgusted - contempt * 0.6),
    Happiness: e.happy,
    Sadness: e.sad,
    Surprise: e.surprised,
    Contempt: contempt,
  };
  const sum = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
  const dist = Object.fromEntries(
    EMOTIONS.map((k) => [k, raw[k] / sum]),
  ) as EmotionDist;

  let label: Emotion = "Happiness";
  let conf = -1;
  for (const k of EMOTIONS) {
    if (dist[k] > conf) {
      conf = dist[k];
      label = k;
    }
  }
  return { dist, label, conf };
}

/** Average an array of distributions (the LSTM stand-in: temporal integration). */
export function averageDist(frames: EmotionDist[]): EmotionDist {
  if (frames.length === 0) return emptyDist();
  const out = emptyDist();
  for (const f of frames) {
    for (const k of EMOTIONS) out[k] += f[k];
  }
  for (const k of EMOTIONS) out[k] /= frames.length;
  return out;
}
