import { chance, randomInt, randomItem } from "./randomness";

const TYPO_MAP: Record<string, string[]> = {
  "a": ["s", "q", "w", "z"],
  "e": ["w", "r", "s", "d"],
  "i": ["u", "o", "k", "j"],
  "o": ["i", "p", "l", "k"],
  "u": ["y", "i", "j", "h"],
  "t": ["r", "y", "g", "f"],
  "s": ["a", "d", "w", "z", "x"],
  "m": ["n", "j", "k", ","],
  "n": ["b", "m", "h", "j"]
};

export function injectTypo(word: string): string {
  if (word.length <= 3) return word;
  
  const chars = word.split('');
  const numTypos = chance(0.8) ? 1 : 2;
  
  for (let i = 0; i < numTypos; i++) {
    const idx = randomInt(1, chars.length - 2); // Avoid first/last char
    const char = chars[idx].toLowerCase();
    
    if (chance(0.5) && TYPO_MAP[char]) {
      // Substitution
      chars[idx] = randomItem(TYPO_MAP[char]);
    } else {
      // Transposition
      if (idx < chars.length - 1) {
        const temp = chars[idx];
        chars[idx] = chars[idx + 1];
        chars[idx + 1] = temp;
      }
    }
  }
  
  return chars.join('');
}

export function generateGrammarMistake(sentence: string): string {
  let modified = sentence;
  // Drop articles
  modified = modified.replace(/\b(a|an|the)\b /ig, "");
  // Subject verb disagreement
  modified = modified.replace(/\bis\b/g, "are");
  modified = modified.replace(/\bdoes\b/g, "do");
  return modified.replace(/\s+/g, ' ').trim();
}
