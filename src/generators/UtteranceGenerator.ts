import { Region, STYLE_MODIFIERS } from "../config/generationConfig";
import { applyRegionalSlang } from "../utils/regionalization";
import { randomItem, chance } from "../utils/randomness";
import { injectTypo, generateGrammarMistake } from "../utils/typoGenerator";

export interface GeneratedEntity {
  type: string;
  value: string;
}

export interface GeneratedSample {
  utterance: string;
  entities: GeneratedEntity[];
}

export function generatePermutations(slots: Record<string, string[]>): Record<string, string>[] {
  const keys = Object.keys(slots);
  if (keys.length === 0) return [{}];

  const result: Record<string, string>[] = [];
  
  function helper(index: number, current: Record<string, string>) {
    if (index === keys.length) {
      result.push({ ...current });
      return;
    }
    
    const key = keys[index];
    for (const value of slots[key]) {
      current[key] = value;
      helper(index + 1, current);
    }
  }
  
  helper(0, {});
  return result;
}

export function fillTemplate(template: string, perm: Record<string, string>): GeneratedSample {
  let utterance = template;
  const entities: GeneratedEntity[] = [];

  for (const [slotKey, value] of Object.entries(perm)) {
    if (utterance.includes(`{${slotKey}}`)) {
      utterance = utterance.replace(`{${slotKey}}`, value);
      entities.push({ type: slotKey.toUpperCase(), value });
    }
  }

  return { utterance, entities };
}

export function applyStyle(utterance: string, style: string): string {
  const modifiers = STYLE_MODIFIERS[style];
  if (!modifiers) return utterance;

  let result = utterance;
  const opener = randomItem(modifiers.openers);
  const filler = randomItem(modifiers.fillers);

  if (opener) {
    result = `${opener} ${result.charAt(0).toLowerCase() + result.slice(1)}`;
  }
  if (filler) {
    // Inject filler randomly
    const parts = result.split(' ');
    if (parts.length > 2) {
      const idx = Math.floor(parts.length / 2);
      parts.splice(idx, 0, filler);
      result = parts.join(' ');
    } else {
      result = `${result} ${filler}`;
    }
  }

  // Generic modifiers
  if (style === "typo" && chance(0.5)) {
      const words = result.split(" ");
      if (words.length > 0) {
        const idxToTypo = Math.floor(Math.random() * words.length);
        words[idxToTypo] = injectTypo(words[idxToTypo]);
        result = words.join(" ");
      }
  } else if (style === "grammar_mistake" && chance(0.5)) {
      result = generateGrammarMistake(result);
  }

  return result.replace(/\s+/g, ' ').trim();
}

export function buildFinalUtterance(
  template: string,
  perm: Record<string, string>,
  region: Region,
  style: string
): GeneratedSample {
  // 1. Fill slots
  const filled = fillTemplate(template, perm);
  
  // 2. Regional slang
  filled.utterance = applyRegionalSlang(filled.utterance, region);
  
  // 3. Style modifiers
  filled.utterance = applyStyle(filled.utterance, style);

  // 4. Random casing tweaks to improve robustness
  if (chance(0.2)) {
    filled.utterance = filled.utterance.toLowerCase();
  }

  return filled;
}
