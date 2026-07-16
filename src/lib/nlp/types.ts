export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface RawEntitySpan {
  type: string;    // e.g., 'AMOUNT', 'DATE', 'CATEGORY'
  value: string;   // e.g., 'twenty bucks', 'yesterday'
}

export interface ResolvedNumeric {
  value: number;
  currency: string | null;
  confidence: ConfidenceLevel;
  original: string;
}

export interface ResolvedTemporal {
  type: 'ABSOLUTE' | 'RELATIVE_RANGE' | 'ABSOLUTE_RANGE';
  startDate: Date | null;
  endDate: Date | null;
  confidence: ConfidenceLevel;
  original: string;
}

export interface ResolvedTaxonomy {
  id: string | null;  // e.g., 'CAT_FOOD', null if unresolvable
  matchedName: string | null;
  confidence: ConfidenceLevel;
  original: string;
}

export class MissingSlotException extends Error {
  slotName: string;
  originalText: string | null;

  constructor(slotName: string, originalText: string | null = null) {
    super(`Missing required slot: ${slotName}`);
    this.name = 'MissingSlotException';
    this.slotName = slotName;
    this.originalText = originalText;
  }
}
