import { AMOUNTS, CATEGORIES, DATE_RANGES } from "../config/generationConfig";

export const getinvestmentTemplates = (intent: string): any => {
  switch (intent) {
    case 'SIP_VS_PREPAY':
      return {
        'CREATE': [
          // Direct
          { template: "I want to invest or prepay {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my investment for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me invest or prepay {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my investment?", slots: {} },
          // Narrative
          { template: "I recently noticed my investment for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my investment", slots: {} },
          // Fragmented
          { template: "investment {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to invest or prepay {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my investment for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me invest or prepay {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my investment?", slots: {} },
          // Narrative
          { template: "I recently noticed my investment for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my investment", slots: {} },
          // Fragmented
          { template: "investment {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to invest or prepay {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my investment for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me invest or prepay {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my investment?", slots: {} },
          // Narrative
          { template: "I recently noticed my investment for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my investment", slots: {} },
          // Fragmented
          { template: "investment {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to invest or prepay {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my investment for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me invest or prepay {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my investment?", slots: {} },
          // Narrative
          { template: "I recently noticed my investment for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my investment", slots: {} },
          // Fragmented
          { template: "investment {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to invest or prepay {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my investment for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me invest or prepay {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my investment?", slots: {} },
          // Narrative
          { template: "I recently noticed my investment for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my investment", slots: {} },
          // Fragmented
          { template: "investment {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to invest or prepay {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my investment for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me invest or prepay {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my investment?", slots: {} },
          // Narrative
          { template: "I recently noticed my investment for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my investment", slots: {} },
          // Fragmented
          { template: "investment {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to invest or prepay {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my investment for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me invest or prepay {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my investment?", slots: {} },
          // Narrative
          { template: "I recently noticed my investment for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my investment", slots: {} },
          // Fragmented
          { template: "investment {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to invest or prepay {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my investment for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me invest or prepay {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my investment?", slots: {} },
          // Narrative
          { template: "I recently noticed my investment for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my investment", slots: {} },
          // Fragmented
          { template: "investment {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to invest or prepay {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my investment for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me invest or prepay {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my investment?", slots: {} },
          // Narrative
          { template: "I recently noticed my investment for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my investment", slots: {} },
          // Fragmented
          { template: "investment {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to invest or prepay {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my investment for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me invest or prepay {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my investment?", slots: {} },
          // Narrative
          { template: "I recently noticed my investment for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my investment", slots: {} },
          // Fragmented
          { template: "investment {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to invest or prepay {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my investment for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me invest or prepay {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my investment?", slots: {} },
          // Narrative
          { template: "I recently noticed my investment for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my investment", slots: {} },
          // Fragmented
          { template: "investment {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to invest or prepay {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my investment for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me invest or prepay {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my investment?", slots: {} },
          // Narrative
          { template: "I recently noticed my investment for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my investment", slots: {} },
          // Fragmented
          { template: "investment {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    case 'ADD_ASSET':
      return {
        'CREATE': [
          // Direct
          { template: "I want to buy {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my asset for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me buy {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my asset?", slots: {} },
          // Narrative
          { template: "I recently noticed my asset for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my asset", slots: {} },
          // Fragmented
          { template: "asset {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to buy {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my asset for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me buy {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my asset?", slots: {} },
          // Narrative
          { template: "I recently noticed my asset for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my asset", slots: {} },
          // Fragmented
          { template: "asset {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to buy {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my asset for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me buy {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my asset?", slots: {} },
          // Narrative
          { template: "I recently noticed my asset for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my asset", slots: {} },
          // Fragmented
          { template: "asset {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to buy {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my asset for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me buy {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my asset?", slots: {} },
          // Narrative
          { template: "I recently noticed my asset for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my asset", slots: {} },
          // Fragmented
          { template: "asset {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to buy {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my asset for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me buy {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my asset?", slots: {} },
          // Narrative
          { template: "I recently noticed my asset for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my asset", slots: {} },
          // Fragmented
          { template: "asset {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to buy {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my asset for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me buy {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my asset?", slots: {} },
          // Narrative
          { template: "I recently noticed my asset for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my asset", slots: {} },
          // Fragmented
          { template: "asset {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to buy {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my asset for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me buy {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my asset?", slots: {} },
          // Narrative
          { template: "I recently noticed my asset for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my asset", slots: {} },
          // Fragmented
          { template: "asset {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to buy {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my asset for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me buy {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my asset?", slots: {} },
          // Narrative
          { template: "I recently noticed my asset for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my asset", slots: {} },
          // Fragmented
          { template: "asset {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to buy {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my asset for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me buy {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my asset?", slots: {} },
          // Narrative
          { template: "I recently noticed my asset for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my asset", slots: {} },
          // Fragmented
          { template: "asset {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to buy {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my asset for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me buy {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my asset?", slots: {} },
          // Narrative
          { template: "I recently noticed my asset for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my asset", slots: {} },
          // Fragmented
          { template: "asset {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to buy {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my asset for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me buy {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my asset?", slots: {} },
          // Narrative
          { template: "I recently noticed my asset for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my asset", slots: {} },
          // Fragmented
          { template: "asset {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to buy {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my asset for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me buy {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my asset?", slots: {} },
          // Narrative
          { template: "I recently noticed my asset for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my asset", slots: {} },
          // Fragmented
          { template: "asset {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    default:
      return {};
  }
};
