import { ResolvedNumeric, ConfidenceLevel } from '../types';

const SUFFIX_MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
  lakh: 100_000,
  lakhs: 100_000,
  lac: 100_000,
  lacs: 100_000,
  crore: 10_000_000,
  crores: 10_000_000,
  cr: 10_000_000,
  grand: 1_000,
  thousand: 1_000,
  million: 1_000_000,
  billion: 1_000_000_000,
};

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, a: 1, an: 1, one: 1, two: 2, three: 3,
  four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, thousand: 1_000,
  million: 1_000_000, billion: 1_000_000_000,
  lakh: 100_000, lakhs: 100_000, lac: 100_000, lacs: 100_000,
  crore: 10_000_000, crores: 10_000_000, cr: 10_000_000,
  grand: 1_000,
};

const VAGUE_QUANTIFIERS: Array<{ phrase: string; mult: number; conf: ConfidenceLevel }> = [
  { phrase: 'a couple', mult: 2, conf: 'low' },
  { phrase: 'a few', mult: 3, conf: 'low' },
  { phrase: 'several', mult: 5, conf: 'low' },
  { phrase: 'some', mult: 3, conf: 'low' },
  { phrase: 'roughly', mult: 1, conf: 'medium' },
  { phrase: 'around', mult: 1, conf: 'medium' },
  { phrase: 'about', mult: 1, conf: 'medium' },
  { phrase: 'approximately', mult: 1, conf: 'medium' },
  { phrase: 'nearly', mult: 1, conf: 'medium' },
  { phrase: 'almost', mult: 1, conf: 'medium' },
];

export class NumericResolver {
  static resolveAmount(raw: string): ResolvedNumeric {
    const original = raw;
    let text = raw.trim().toLowerCase();

    // 1. Currency detection
    let currency: string | null = null;
    const currencyMap: Record<string, string> = {
      '₹': 'INR', 'rs': 'INR', 'rs.': 'INR', 'inr': 'INR',
      '$': 'USD', 'usd': 'USD', 'bucks': 'USD', 'dollars': 'USD',
      '€': 'EUR', 'eur': 'EUR',
      '£': 'GBP', 'gbp': 'GBP', 'quid': 'GBP',
    };

    for (const [sym, code] of Object.entries(currencyMap)) {
      if (text.startsWith(sym)) {
        // Ensure it's not just a prefix of a longer word unless it's a symbol
        const nextChar = text[sym.length];
        if (!nextChar || !/[a-z]/.test(nextChar) || !/[a-z]/.test(sym)) {
          currency = code;
          text = text.slice(sym.length).trim();
          break;
        }
      }
      if (text.endsWith(sym)) {
        // Ensure it's not just a suffix of a longer word unless it's a symbol
        const prevChar = text[text.length - sym.length - 1];
        if (!prevChar || !/[a-z]/.test(prevChar) || !/[a-z]/.test(sym)) {
          currency = code;
          text = text.slice(0, -sym.length).trim();
          break;
        }
      }
    }

    let confidence: ConfidenceLevel = 'high';
    let vagueMultiplier: number | null = null;

    // 2. Vague quantifier prefix
    // Sort by length descending to match longest phrases first
    VAGUE_QUANTIFIERS.sort((a, b) => b.phrase.length - a.phrase.length);
    for (const { phrase, mult, conf } of VAGUE_QUANTIFIERS) {
      if (text.startsWith(phrase)) {
        const rest = text.slice(phrase.length).trim();
        if (rest) {
          vagueMultiplier = mult;
          confidence = conf;
          text = rest;
          break;
        }
      }
    }

    // 3. Try pure numeric (with commas)
    const stripped = text.replace(/,/g, '');
    const numMatch = stripped.match(/^([+-]?\d+(?:\.\d+)?)\s*([a-z]*)\s*$/);
    
    if (numMatch) {
      let num = parseFloat(numMatch[1]);
      let suffix = numMatch[2].replace(/s$/, '').replace(/\.$/, ''); // normalize
      const suffixRaw = numMatch[2];

      if (SUFFIX_MULTIPLIERS[suffixRaw]) {
        num *= SUFFIX_MULTIPLIERS[suffixRaw];
      } else if (SUFFIX_MULTIPLIERS[suffix]) {
        num *= SUFFIX_MULTIPLIERS[suffix];
      }

      if (vagueMultiplier !== null) {
        num *= vagueMultiplier;
      }

      return {
        value: num,
        currency,
        confidence,
        original,
      };
    }

    // 4. Word-based amounts
    const value = NumericResolver.parseWordNumber(text);
    if (value !== null) {
      let finalValue = value;
      if (vagueMultiplier !== null) {
        finalValue *= vagueMultiplier;
      }
      return {
        value: finalValue,
        currency,
        confidence,
        original,
      };
    }

    // Fallback
    return {
      value: 0,
      currency,
      confidence: 'low',
      original,
    };
  }

  private static parseWordNumber(text: string): number | null {
    const tokens = text.split(/\s+/);
    if (!tokens.length || tokens[0] === "") return null;

    const nums: number[] = [];
    for (const tok of tokens) {
      const cleanTok = tok.replace(/^[.,;!?]+|[.,;!?]+$/g, '');
      if (WORD_NUMBERS[cleanTok] !== undefined) {
        nums.push(WORD_NUMBERS[cleanTok]);
      } else {
        return null; // Unrecognized token, bail out
      }
    }

    if (!nums.length) return null;

    const BIG = new Set([100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 1_000_000_000]);
    let result = 0;
    let current = 0;

    for (const n of nums) {
      if (BIG.has(n)) {
        if (current === 0) {
          current = 1; // "a hundred" = 1 * 100
        }
        current *= n;
        if (n >= 1_000) {
          result += current;
          current = 0;
        }
      } else {
        current += n;
      }
    }

    return result + current;
  }
}
