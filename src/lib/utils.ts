import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { TimedLyric } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function parseLRC(lrc: string): TimedLyric[] {
  if (!lrc) return [];
  const lines = lrc.split(/\\r\\n|\\n|\r\n|\n/);
  const timedLyrics: TimedLyric[] = [];

  const timeRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/;

  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        timedLyrics.push({ time, text });
      }
    }
  }

  return timedLyrics.sort((a, b) => a.time - b.time);
}
