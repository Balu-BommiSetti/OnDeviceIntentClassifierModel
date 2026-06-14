import { AMOUNTS, CATEGORIES, DATE_RANGES } from "../config/generationConfig";

export const getbudgetTemplates = (intent: string): any => {
  switch (intent) {
    case 'BUDGET_PLANNING':
      return {
        'CREATE': [
          // Direct
          { template: "I want to budget for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my budget for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me budget for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my budget?", slots: {} },
          // Narrative
          { template: "I recently noticed my budget for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my budget", slots: {} },
          // Fragmented
          { template: "budget {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to budget for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my budget for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me budget for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my budget?", slots: {} },
          // Narrative
          { template: "I recently noticed my budget for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my budget", slots: {} },
          // Fragmented
          { template: "budget {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to budget for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my budget for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me budget for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my budget?", slots: {} },
          // Narrative
          { template: "I recently noticed my budget for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my budget", slots: {} },
          // Fragmented
          { template: "budget {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to budget for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my budget for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me budget for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my budget?", slots: {} },
          // Narrative
          { template: "I recently noticed my budget for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my budget", slots: {} },
          // Fragmented
          { template: "budget {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to budget for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my budget for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me budget for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my budget?", slots: {} },
          // Narrative
          { template: "I recently noticed my budget for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my budget", slots: {} },
          // Fragmented
          { template: "budget {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to budget for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my budget for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me budget for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my budget?", slots: {} },
          // Narrative
          { template: "I recently noticed my budget for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my budget", slots: {} },
          // Fragmented
          { template: "budget {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to budget for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my budget for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me budget for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my budget?", slots: {} },
          // Narrative
          { template: "I recently noticed my budget for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my budget", slots: {} },
          // Fragmented
          { template: "budget {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to budget for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my budget for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me budget for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my budget?", slots: {} },
          // Narrative
          { template: "I recently noticed my budget for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my budget", slots: {} },
          // Fragmented
          { template: "budget {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to budget for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my budget for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me budget for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my budget?", slots: {} },
          // Narrative
          { template: "I recently noticed my budget for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my budget", slots: {} },
          // Fragmented
          { template: "budget {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to budget for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my budget for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me budget for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my budget?", slots: {} },
          // Narrative
          { template: "I recently noticed my budget for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my budget", slots: {} },
          // Fragmented
          { template: "budget {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to budget for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my budget for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me budget for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my budget?", slots: {} },
          // Narrative
          { template: "I recently noticed my budget for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my budget", slots: {} },
          // Fragmented
          { template: "budget {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to budget for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my budget for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me budget for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my budget?", slots: {} },
          // Narrative
          { template: "I recently noticed my budget for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my budget", slots: {} },
          // Fragmented
          { template: "budget {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    default:
      return {};
  }
};
