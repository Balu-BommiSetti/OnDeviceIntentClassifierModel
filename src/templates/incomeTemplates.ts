import { AMOUNTS, CATEGORIES, DATE_RANGES } from "../config/generationConfig";

export const getincomeTemplates = (intent: string): any => {
  switch (intent) {
    case 'ADD_INCOME':
      return {
        'CREATE': [
          // Direct
          { template: "I want to earn from {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my income for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me earn from {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my income?", slots: {} },
          // Narrative
          { template: "I recently noticed my income for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my income", slots: {} },
          // Fragmented
          { template: "income {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to earn from {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my income for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me earn from {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my income?", slots: {} },
          // Narrative
          { template: "I recently noticed my income for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my income", slots: {} },
          // Fragmented
          { template: "income {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to earn from {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my income for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me earn from {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my income?", slots: {} },
          // Narrative
          { template: "I recently noticed my income for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my income", slots: {} },
          // Fragmented
          { template: "income {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to earn from {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my income for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me earn from {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my income?", slots: {} },
          // Narrative
          { template: "I recently noticed my income for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my income", slots: {} },
          // Fragmented
          { template: "income {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to earn from {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my income for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me earn from {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my income?", slots: {} },
          // Narrative
          { template: "I recently noticed my income for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my income", slots: {} },
          // Fragmented
          { template: "income {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to earn from {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my income for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me earn from {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my income?", slots: {} },
          // Narrative
          { template: "I recently noticed my income for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my income", slots: {} },
          // Fragmented
          { template: "income {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to earn from {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my income for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me earn from {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my income?", slots: {} },
          // Narrative
          { template: "I recently noticed my income for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my income", slots: {} },
          // Fragmented
          { template: "income {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to earn from {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my income for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me earn from {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my income?", slots: {} },
          // Narrative
          { template: "I recently noticed my income for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my income", slots: {} },
          // Fragmented
          { template: "income {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to earn from {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my income for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me earn from {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my income?", slots: {} },
          // Narrative
          { template: "I recently noticed my income for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my income", slots: {} },
          // Fragmented
          { template: "income {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to earn from {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my income for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me earn from {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my income?", slots: {} },
          // Narrative
          { template: "I recently noticed my income for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my income", slots: {} },
          // Fragmented
          { template: "income {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to earn from {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my income for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me earn from {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my income?", slots: {} },
          // Narrative
          { template: "I recently noticed my income for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my income", slots: {} },
          // Fragmented
          { template: "income {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to earn from {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my income for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me earn from {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my income?", slots: {} },
          // Narrative
          { template: "I recently noticed my income for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my income", slots: {} },
          // Fragmented
          { template: "income {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    case 'INCOME_DECLARATION':
      return {
        'CREATE': [
          // Direct
          { template: "I want to declare {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my income declaration for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me declare {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my income declaration?", slots: {} },
          // Narrative
          { template: "I recently noticed my income declaration for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my income declaration", slots: {} },
          // Fragmented
          { template: "income declaration {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to declare {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my income declaration for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me declare {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my income declaration?", slots: {} },
          // Narrative
          { template: "I recently noticed my income declaration for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my income declaration", slots: {} },
          // Fragmented
          { template: "income declaration {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to declare {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my income declaration for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me declare {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my income declaration?", slots: {} },
          // Narrative
          { template: "I recently noticed my income declaration for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my income declaration", slots: {} },
          // Fragmented
          { template: "income declaration {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to declare {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my income declaration for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me declare {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my income declaration?", slots: {} },
          // Narrative
          { template: "I recently noticed my income declaration for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my income declaration", slots: {} },
          // Fragmented
          { template: "income declaration {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to declare {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my income declaration for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me declare {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my income declaration?", slots: {} },
          // Narrative
          { template: "I recently noticed my income declaration for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my income declaration", slots: {} },
          // Fragmented
          { template: "income declaration {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to declare {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my income declaration for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me declare {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my income declaration?", slots: {} },
          // Narrative
          { template: "I recently noticed my income declaration for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my income declaration", slots: {} },
          // Fragmented
          { template: "income declaration {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to declare {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my income declaration for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me declare {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my income declaration?", slots: {} },
          // Narrative
          { template: "I recently noticed my income declaration for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my income declaration", slots: {} },
          // Fragmented
          { template: "income declaration {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to declare {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my income declaration for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me declare {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my income declaration?", slots: {} },
          // Narrative
          { template: "I recently noticed my income declaration for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my income declaration", slots: {} },
          // Fragmented
          { template: "income declaration {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to declare {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my income declaration for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me declare {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my income declaration?", slots: {} },
          // Narrative
          { template: "I recently noticed my income declaration for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my income declaration", slots: {} },
          // Fragmented
          { template: "income declaration {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to declare {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my income declaration for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me declare {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my income declaration?", slots: {} },
          // Narrative
          { template: "I recently noticed my income declaration for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my income declaration", slots: {} },
          // Fragmented
          { template: "income declaration {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to declare {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my income declaration for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me declare {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my income declaration?", slots: {} },
          // Narrative
          { template: "I recently noticed my income declaration for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my income declaration", slots: {} },
          // Fragmented
          { template: "income declaration {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to declare {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my income declaration for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me declare {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my income declaration?", slots: {} },
          // Narrative
          { template: "I recently noticed my income declaration for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my income declaration", slots: {} },
          // Fragmented
          { template: "income declaration {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    case 'REFUND':
      return {
        'CREATE': [
          // Direct
          { template: "I want to get refunded for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my refund for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me get refunded for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my refund?", slots: {} },
          // Narrative
          { template: "I recently noticed my refund for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my refund", slots: {} },
          // Fragmented
          { template: "refund {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to get refunded for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my refund for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me get refunded for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my refund?", slots: {} },
          // Narrative
          { template: "I recently noticed my refund for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my refund", slots: {} },
          // Fragmented
          { template: "refund {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to get refunded for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my refund for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me get refunded for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my refund?", slots: {} },
          // Narrative
          { template: "I recently noticed my refund for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my refund", slots: {} },
          // Fragmented
          { template: "refund {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to get refunded for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my refund for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me get refunded for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my refund?", slots: {} },
          // Narrative
          { template: "I recently noticed my refund for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my refund", slots: {} },
          // Fragmented
          { template: "refund {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to get refunded for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my refund for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me get refunded for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my refund?", slots: {} },
          // Narrative
          { template: "I recently noticed my refund for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my refund", slots: {} },
          // Fragmented
          { template: "refund {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to get refunded for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my refund for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me get refunded for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my refund?", slots: {} },
          // Narrative
          { template: "I recently noticed my refund for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my refund", slots: {} },
          // Fragmented
          { template: "refund {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to get refunded for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my refund for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me get refunded for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my refund?", slots: {} },
          // Narrative
          { template: "I recently noticed my refund for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my refund", slots: {} },
          // Fragmented
          { template: "refund {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to get refunded for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my refund for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me get refunded for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my refund?", slots: {} },
          // Narrative
          { template: "I recently noticed my refund for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my refund", slots: {} },
          // Fragmented
          { template: "refund {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to get refunded for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my refund for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me get refunded for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my refund?", slots: {} },
          // Narrative
          { template: "I recently noticed my refund for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my refund", slots: {} },
          // Fragmented
          { template: "refund {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to get refunded for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my refund for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me get refunded for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my refund?", slots: {} },
          // Narrative
          { template: "I recently noticed my refund for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my refund", slots: {} },
          // Fragmented
          { template: "refund {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to get refunded for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my refund for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me get refunded for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my refund?", slots: {} },
          // Narrative
          { template: "I recently noticed my refund for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my refund", slots: {} },
          // Fragmented
          { template: "refund {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to get refunded for {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my refund for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me get refunded for {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my refund?", slots: {} },
          // Narrative
          { template: "I recently noticed my refund for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my refund", slots: {} },
          // Fragmented
          { template: "refund {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    default:
      return {};
  }
};
