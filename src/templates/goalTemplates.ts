import { AMOUNTS, CATEGORIES, DATE_RANGES } from "../config/generationConfig";

export const getgoalTemplates = (intent: string): any => {
  switch (intent) {
    case 'GOAL_PLANNING':
      return {
        'CREATE': [
          // Direct
          { template: "I want to plan for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my goal for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me plan for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my goal?", slots: {} },
          // Narrative
          { template: "I recently noticed my goal for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my goal", slots: {} },
          // Fragmented
          { template: "goal {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to plan for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my goal for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me plan for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my goal?", slots: {} },
          // Narrative
          { template: "I recently noticed my goal for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my goal", slots: {} },
          // Fragmented
          { template: "goal {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to plan for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my goal for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me plan for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my goal?", slots: {} },
          // Narrative
          { template: "I recently noticed my goal for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my goal", slots: {} },
          // Fragmented
          { template: "goal {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to plan for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my goal for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me plan for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my goal?", slots: {} },
          // Narrative
          { template: "I recently noticed my goal for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my goal", slots: {} },
          // Fragmented
          { template: "goal {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to plan for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my goal for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me plan for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my goal?", slots: {} },
          // Narrative
          { template: "I recently noticed my goal for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my goal", slots: {} },
          // Fragmented
          { template: "goal {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to plan for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my goal for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me plan for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my goal?", slots: {} },
          // Narrative
          { template: "I recently noticed my goal for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my goal", slots: {} },
          // Fragmented
          { template: "goal {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to plan for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my goal for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me plan for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my goal?", slots: {} },
          // Narrative
          { template: "I recently noticed my goal for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my goal", slots: {} },
          // Fragmented
          { template: "goal {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to plan for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my goal for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me plan for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my goal?", slots: {} },
          // Narrative
          { template: "I recently noticed my goal for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my goal", slots: {} },
          // Fragmented
          { template: "goal {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to plan for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my goal for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me plan for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my goal?", slots: {} },
          // Narrative
          { template: "I recently noticed my goal for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my goal", slots: {} },
          // Fragmented
          { template: "goal {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to plan for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my goal for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me plan for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my goal?", slots: {} },
          // Narrative
          { template: "I recently noticed my goal for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my goal", slots: {} },
          // Fragmented
          { template: "goal {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to plan for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my goal for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me plan for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my goal?", slots: {} },
          // Narrative
          { template: "I recently noticed my goal for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my goal", slots: {} },
          // Fragmented
          { template: "goal {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to plan for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my goal for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me plan for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my goal?", slots: {} },
          // Narrative
          { template: "I recently noticed my goal for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my goal", slots: {} },
          // Fragmented
          { template: "goal {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    case 'AFFORDABILITY_CHECK':
      return {
        'CREATE': [
          // Direct
          { template: "I want to afford {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my purchase for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me afford {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my purchase?", slots: {} },
          // Narrative
          { template: "I recently noticed my purchase for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my purchase", slots: {} },
          // Fragmented
          { template: "purchase {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to afford {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my purchase for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me afford {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my purchase?", slots: {} },
          // Narrative
          { template: "I recently noticed my purchase for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my purchase", slots: {} },
          // Fragmented
          { template: "purchase {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to afford {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my purchase for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me afford {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my purchase?", slots: {} },
          // Narrative
          { template: "I recently noticed my purchase for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my purchase", slots: {} },
          // Fragmented
          { template: "purchase {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to afford {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my purchase for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me afford {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my purchase?", slots: {} },
          // Narrative
          { template: "I recently noticed my purchase for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my purchase", slots: {} },
          // Fragmented
          { template: "purchase {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to afford {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my purchase for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me afford {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my purchase?", slots: {} },
          // Narrative
          { template: "I recently noticed my purchase for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my purchase", slots: {} },
          // Fragmented
          { template: "purchase {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to afford {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my purchase for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me afford {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my purchase?", slots: {} },
          // Narrative
          { template: "I recently noticed my purchase for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my purchase", slots: {} },
          // Fragmented
          { template: "purchase {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to afford {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my purchase for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me afford {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my purchase?", slots: {} },
          // Narrative
          { template: "I recently noticed my purchase for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my purchase", slots: {} },
          // Fragmented
          { template: "purchase {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to afford {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my purchase for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me afford {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my purchase?", slots: {} },
          // Narrative
          { template: "I recently noticed my purchase for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my purchase", slots: {} },
          // Fragmented
          { template: "purchase {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to afford {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my purchase for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me afford {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my purchase?", slots: {} },
          // Narrative
          { template: "I recently noticed my purchase for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my purchase", slots: {} },
          // Fragmented
          { template: "purchase {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to afford {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my purchase for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me afford {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my purchase?", slots: {} },
          // Narrative
          { template: "I recently noticed my purchase for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my purchase", slots: {} },
          // Fragmented
          { template: "purchase {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to afford {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my purchase for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me afford {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my purchase?", slots: {} },
          // Narrative
          { template: "I recently noticed my purchase for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my purchase", slots: {} },
          // Fragmented
          { template: "purchase {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to afford {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my purchase for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me afford {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my purchase?", slots: {} },
          // Narrative
          { template: "I recently noticed my purchase for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my purchase", slots: {} },
          // Fragmented
          { template: "purchase {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    default:
      return {};
  }
};
