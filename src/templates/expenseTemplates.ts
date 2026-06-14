import { AMOUNTS, CATEGORIES, DATE_RANGES } from "../config/generationConfig";

export const getexpenseTemplates = (intent: string): any => {
  switch (intent) {
    case 'ADD_EXPENSE':
      return {
        'CREATE': [
          // Direct
          { template: "I want to spend on {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my expense for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me spend on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my expense?", slots: {} },
          // Narrative
          { template: "I recently noticed my expense for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my expense", slots: {} },
          // Fragmented
          { template: "expense {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to spend on {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my expense for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me spend on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my expense?", slots: {} },
          // Narrative
          { template: "I recently noticed my expense for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my expense", slots: {} },
          // Fragmented
          { template: "expense {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to spend on {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my expense for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me spend on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my expense?", slots: {} },
          // Narrative
          { template: "I recently noticed my expense for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my expense", slots: {} },
          // Fragmented
          { template: "expense {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to spend on {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my expense for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me spend on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my expense?", slots: {} },
          // Narrative
          { template: "I recently noticed my expense for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my expense", slots: {} },
          // Fragmented
          { template: "expense {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to spend on {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my expense for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me spend on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my expense?", slots: {} },
          // Narrative
          { template: "I recently noticed my expense for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my expense", slots: {} },
          // Fragmented
          { template: "expense {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to spend on {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my expense for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me spend on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my expense?", slots: {} },
          // Narrative
          { template: "I recently noticed my expense for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my expense", slots: {} },
          // Fragmented
          { template: "expense {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to spend on {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my expense for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me spend on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my expense?", slots: {} },
          // Narrative
          { template: "I recently noticed my expense for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my expense", slots: {} },
          // Fragmented
          { template: "expense {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to spend on {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my expense for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me spend on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my expense?", slots: {} },
          // Narrative
          { template: "I recently noticed my expense for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my expense", slots: {} },
          // Fragmented
          { template: "expense {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to spend on {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my expense for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me spend on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my expense?", slots: {} },
          // Narrative
          { template: "I recently noticed my expense for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my expense", slots: {} },
          // Fragmented
          { template: "expense {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to spend on {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my expense for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me spend on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my expense?", slots: {} },
          // Narrative
          { template: "I recently noticed my expense for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my expense", slots: {} },
          // Fragmented
          { template: "expense {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to spend on {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my expense for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me spend on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my expense?", slots: {} },
          // Narrative
          { template: "I recently noticed my expense for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my expense", slots: {} },
          // Fragmented
          { template: "expense {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to spend on {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my expense for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me spend on {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my expense?", slots: {} },
          // Narrative
          { template: "I recently noticed my expense for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my expense", slots: {} },
          // Fragmented
          { template: "expense {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    default:
      return {};
  }
};
