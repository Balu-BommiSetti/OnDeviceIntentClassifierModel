import { ResolvedTemporal, ConfidenceLevel } from '../types';

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2,
  march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6,
  july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, november: 11, nov: 11,
  december: 12, dec: 12,
};

const DAYS_OF_WEEK: Record<string, number> = {
  monday: 1, mon: 1, // ISO standard: Monday=1
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
  sunday: 0, sun: 0,
};

const TIME_UNITS: Record<string, string> = {
  day: 'day', days: 'day',
  week: 'week', weeks: 'week',
  month: 'month', months: 'month',
  year: 'year', years: 'year',
  quarter: 'quarter', quarters: 'quarter',
};

export class TemporalResolver {
  
  static resolveDate(raw: string): any {
    const original = raw;
    const text = raw.trim().toLowerCase();
    
    const base = {
      type: 'RELATIVE',
      offset: null as number | null,
      unit: null as string | null,
      day: null as number | null,
      month: null as number | null,
      year: null as number | null,
      dayOfWeek: null as number | null,
      modifier: null as string | null,
      confidence: 'high' as ConfidenceLevel,
      original,
    };

    // Named shortcuts
    if (text === 'today') return { ...base, offset: 0, unit: 'day' };
    if (text === 'yesterday') return { ...base, offset: -1, unit: 'day' };
    if (text === 'tomorrow') return { ...base, offset: 1, unit: 'day' };
    if (['day before yesterday', 'day before'].includes(text)) return { ...base, offset: -2, unit: 'day' };
    if (text === 'day after tomorrow') return { ...base, offset: 2, unit: 'day' };

    // Time of day
    if (['this morning', 'this afternoon', 'this evening', 'tonight'].includes(text)) {
      return { ...base, offset: 0, unit: 'day' };
    }
    if (text === 'last night') return { ...base, offset: -1, unit: 'day' };

    // N <unit> ago
    let m = text.match(/^(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+ago$/);
    if (m) {
      const n = parseInt(m[1], 10);
      const unit = TIME_UNITS[m[2]] || m[2];
      return { ...base, offset: -n, unit };
    }

    // A <unit> ago
    m = text.match(/^an?\s+(day|week|month|year)\s+ago$/);
    if (m) {
      const unit = TIME_UNITS[m[1]] || m[1];
      return { ...base, offset: -1, unit };
    }

    // Day of week
    for (const [dayName, dow] of Object.entries(DAYS_OF_WEEK)) {
      if (text === `on ${dayName}` || text === dayName) {
        return { ...base, dayOfWeek: dow };
      }
      m = text.match(new RegExp(`^(last|next|this)\\s+${dayName}$`));
      if (m) {
        return { ...base, dayOfWeek: dow, modifier: m[1] };
      }
    }

    // Absolute Date: "on 15th March", "March 15", "15 March 2024"
    m = text.match(/^(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:\s+(\d{4}))?$/);
    if (m && MONTHS[m[2]]) {
      return {
        ...base,
        type: 'ABSOLUTE',
        day: parseInt(m[1], 10),
        month: MONTHS[m[2]],
        year: m[3] ? parseInt(m[3], 10) : null,
      };
    }

    // Month day year
    m = text.match(/^(?:on\s+)?([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?$/);
    if (m && MONTHS[m[1]]) {
      return {
        ...base,
        type: 'ABSOLUTE',
        month: MONTHS[m[1]],
        day: parseInt(m[2], 10),
        year: m[3] ? parseInt(m[3], 10) : null,
      };
    }

    // ISO: 2024-03-15
    m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      return {
        ...base,
        type: 'ABSOLUTE',
        year: parseInt(m[1], 10),
        month: parseInt(m[2], 10),
        day: parseInt(m[3], 10),
      };
    }

    // Vague relative
    if (['recently', 'the other day'].includes(text)) return { ...base, offset: -2, unit: 'day', confidence: 'low' };
    if (['a while ago', 'some time ago', 'long ago'].includes(text)) return { ...base, offset: -30, unit: 'day', confidence: 'low' };
    if (text === 'a few days ago') return { ...base, offset: -3, unit: 'day', confidence: 'low' };

    return { ...base, confidence: 'low' };
  }

  static resolvePeriod(raw: string): any {
    const original = raw;
    const text = raw.trim().toLowerCase();
    
    const base = {
      type: 'RELATIVE_RANGE',
      startOffset: null as number | null,
      endOffset: null as number | null,
      unit: null as string | null,
      quarter: null as number | null,
      month: null as number | null,
      startMonth: null as number | null,
      original,
    };

    // this <unit>
    let m = text.match(/^this\s+(week|month|year|quarter)$/);
    if (m) {
      return { ...base, startOffset: 0, endOffset: 0, unit: TIME_UNITS[m[1]] || m[1] };
    }

    // last <unit>
    m = text.match(/^last\s+(week|month|year|quarter)$/);
    if (m) {
      return { ...base, startOffset: -1, endOffset: -1, unit: TIME_UNITS[m[1]] || m[1] };
    }

    // last N <units>
    m = text.match(/^last\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)$/);
    if (m) {
      return { ...base, startOffset: -parseInt(m[1], 10), endOffset: -1, unit: TIME_UNITS[m[2]] || m[2] };
    }

    // past N <units>
    m = text.match(/^past\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)$/);
    if (m) {
      return { ...base, startOffset: -parseInt(m[1], 10), endOffset: -1, unit: TIME_UNITS[m[2]] || m[2] };
    }

    // Fiscal quarter
    m = text.match(/^q([1-4])$/);
    if (m) {
      return { ...base, type: 'FISCAL_QUARTER', quarter: parseInt(m[1], 10) };
    }

    // in <Month>
    m = text.match(/^(?:in|for|during)\s+([a-z]+)$/);
    if (m && MONTHS[m[1]]) {
      return { ...base, type: 'ABSOLUTE_RANGE', month: MONTHS[m[1]] };
    }

    // Fallback
    return { ...base, type: 'UNKNOWN', confidence: 'low' };
  }
}
