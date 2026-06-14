import { AMOUNTS, CATEGORIES, DATE_RANGES } from "../config/generationConfig";

export const getadviceTemplates = (intent: string): any => {
  switch (intent) {
    case 'SAVINGS_ADVICE':
      return {
        'CREATE': [
          // Direct
          { template: "I want to save on {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my savings for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me save on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my savings?", slots: {} },
          // Narrative
          { template: "I recently noticed my savings for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my savings", slots: {} },
          // Fragmented
          { template: "savings {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to save on {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my savings for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me save on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my savings?", slots: {} },
          // Narrative
          { template: "I recently noticed my savings for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my savings", slots: {} },
          // Fragmented
          { template: "savings {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to save on {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my savings for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me save on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my savings?", slots: {} },
          // Narrative
          { template: "I recently noticed my savings for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my savings", slots: {} },
          // Fragmented
          { template: "savings {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to save on {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my savings for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me save on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my savings?", slots: {} },
          // Narrative
          { template: "I recently noticed my savings for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my savings", slots: {} },
          // Fragmented
          { template: "savings {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to save on {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my savings for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me save on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my savings?", slots: {} },
          // Narrative
          { template: "I recently noticed my savings for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my savings", slots: {} },
          // Fragmented
          { template: "savings {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to save on {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my savings for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me save on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my savings?", slots: {} },
          // Narrative
          { template: "I recently noticed my savings for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my savings", slots: {} },
          // Fragmented
          { template: "savings {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to save on {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my savings for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me save on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my savings?", slots: {} },
          // Narrative
          { template: "I recently noticed my savings for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my savings", slots: {} },
          // Fragmented
          { template: "savings {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to save on {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my savings for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me save on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my savings?", slots: {} },
          // Narrative
          { template: "I recently noticed my savings for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my savings", slots: {} },
          // Fragmented
          { template: "savings {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to save on {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my savings for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me save on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my savings?", slots: {} },
          // Narrative
          { template: "I recently noticed my savings for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my savings", slots: {} },
          // Fragmented
          { template: "savings {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to save on {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my savings for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me save on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my savings?", slots: {} },
          // Narrative
          { template: "I recently noticed my savings for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my savings", slots: {} },
          // Fragmented
          { template: "savings {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to save on {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my savings for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me save on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my savings?", slots: {} },
          // Narrative
          { template: "I recently noticed my savings for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my savings", slots: {} },
          // Fragmented
          { template: "savings {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to save on {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my savings for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me save on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my savings?", slots: {} },
          // Narrative
          { template: "I recently noticed my savings for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my savings", slots: {} },
          // Fragmented
          { template: "savings {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    default:
      return {};
  }
};
