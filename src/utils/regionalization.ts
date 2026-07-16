import { Region, REGIONAL_SLANG } from "../config/generationConfig";
import { chance, randomItem } from "./randomness";

export function applyRegionalSlang(sentence: string, region: Region): string {
  let modified = sentence;
  const slangs = REGIONAL_SLANG[region];
  
  if (!slangs) return modified;
  
  for (const [key, value] of Object.entries(slangs)) {
    if (chance(0.5)) {
      const regex = new RegExp(`\\b${key}\\b`, "ig");
      modified = modified.replace(regex, value);
    }
  }
  
  return modified;
}
