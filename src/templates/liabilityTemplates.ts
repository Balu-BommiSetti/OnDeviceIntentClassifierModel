import { AMOUNTS, CATEGORIES, DATE_RANGES } from "../config/generationConfig";

export const getliabilityTemplates = (intent: string): any => {
  switch (intent) {
    case 'LOAN_ANALYSIS':
      return {
        'CREATE': [
          // Direct
          { template: "I want to analyze {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my loan for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my loan?", slots: {} },
          // Narrative
          { template: "I recently noticed my loan for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my loan", slots: {} },
          // Fragmented
          { template: "loan {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to analyze {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my loan for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my loan?", slots: {} },
          // Narrative
          { template: "I recently noticed my loan for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my loan", slots: {} },
          // Fragmented
          { template: "loan {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to analyze {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my loan for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my loan?", slots: {} },
          // Narrative
          { template: "I recently noticed my loan for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my loan", slots: {} },
          // Fragmented
          { template: "loan {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to analyze {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my loan for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my loan?", slots: {} },
          // Narrative
          { template: "I recently noticed my loan for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my loan", slots: {} },
          // Fragmented
          { template: "loan {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to analyze {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my loan for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my loan?", slots: {} },
          // Narrative
          { template: "I recently noticed my loan for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my loan", slots: {} },
          // Fragmented
          { template: "loan {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to analyze {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my loan for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my loan?", slots: {} },
          // Narrative
          { template: "I recently noticed my loan for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my loan", slots: {} },
          // Fragmented
          { template: "loan {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to analyze {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my loan for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my loan?", slots: {} },
          // Narrative
          { template: "I recently noticed my loan for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my loan", slots: {} },
          // Fragmented
          { template: "loan {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to analyze {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my loan for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my loan?", slots: {} },
          // Narrative
          { template: "I recently noticed my loan for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my loan", slots: {} },
          // Fragmented
          { template: "loan {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to analyze {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my loan for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my loan?", slots: {} },
          // Narrative
          { template: "I recently noticed my loan for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my loan", slots: {} },
          // Fragmented
          { template: "loan {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to analyze {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my loan for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my loan?", slots: {} },
          // Narrative
          { template: "I recently noticed my loan for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my loan", slots: {} },
          // Fragmented
          { template: "loan {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to analyze {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my loan for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my loan?", slots: {} },
          // Narrative
          { template: "I recently noticed my loan for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my loan", slots: {} },
          // Fragmented
          { template: "loan {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to analyze {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my loan for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my loan?", slots: {} },
          // Narrative
          { template: "I recently noticed my loan for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my loan", slots: {} },
          // Fragmented
          { template: "loan {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    case 'DEBT_FREEDOM_ANALYSIS':
      return {
        'CREATE': [
          // Direct
          { template: "I want to clear {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my debt for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me clear {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my debt?", slots: {} },
          // Narrative
          { template: "I recently noticed my debt for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my debt", slots: {} },
          // Fragmented
          { template: "debt {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to clear {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my debt for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me clear {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my debt?", slots: {} },
          // Narrative
          { template: "I recently noticed my debt for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my debt", slots: {} },
          // Fragmented
          { template: "debt {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to clear {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my debt for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me clear {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my debt?", slots: {} },
          // Narrative
          { template: "I recently noticed my debt for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my debt", slots: {} },
          // Fragmented
          { template: "debt {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to clear {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my debt for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me clear {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my debt?", slots: {} },
          // Narrative
          { template: "I recently noticed my debt for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my debt", slots: {} },
          // Fragmented
          { template: "debt {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to clear {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my debt for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me clear {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my debt?", slots: {} },
          // Narrative
          { template: "I recently noticed my debt for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my debt", slots: {} },
          // Fragmented
          { template: "debt {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to clear {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my debt for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me clear {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my debt?", slots: {} },
          // Narrative
          { template: "I recently noticed my debt for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my debt", slots: {} },
          // Fragmented
          { template: "debt {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to clear {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my debt for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me clear {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my debt?", slots: {} },
          // Narrative
          { template: "I recently noticed my debt for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my debt", slots: {} },
          // Fragmented
          { template: "debt {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to clear {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my debt for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me clear {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my debt?", slots: {} },
          // Narrative
          { template: "I recently noticed my debt for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my debt", slots: {} },
          // Fragmented
          { template: "debt {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to clear {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my debt for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me clear {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my debt?", slots: {} },
          // Narrative
          { template: "I recently noticed my debt for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my debt", slots: {} },
          // Fragmented
          { template: "debt {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to clear {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my debt for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me clear {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my debt?", slots: {} },
          // Narrative
          { template: "I recently noticed my debt for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my debt", slots: {} },
          // Fragmented
          { template: "debt {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to clear {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my debt for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me clear {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my debt?", slots: {} },
          // Narrative
          { template: "I recently noticed my debt for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my debt", slots: {} },
          // Fragmented
          { template: "debt {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to clear {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my debt for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me clear {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my debt?", slots: {} },
          // Narrative
          { template: "I recently noticed my debt for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my debt", slots: {} },
          // Fragmented
          { template: "debt {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    case 'ADD_LIABILITY':
      return {
        'CREATE': [
          // Direct
          { template: "I want to borrow {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my liability for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me borrow {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my liability?", slots: {} },
          // Narrative
          { template: "I recently noticed my liability for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my liability", slots: {} },
          // Fragmented
          { template: "liability {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to borrow {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my liability for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me borrow {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my liability?", slots: {} },
          // Narrative
          { template: "I recently noticed my liability for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my liability", slots: {} },
          // Fragmented
          { template: "liability {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to borrow {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my liability for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me borrow {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my liability?", slots: {} },
          // Narrative
          { template: "I recently noticed my liability for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my liability", slots: {} },
          // Fragmented
          { template: "liability {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to borrow {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my liability for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me borrow {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my liability?", slots: {} },
          // Narrative
          { template: "I recently noticed my liability for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my liability", slots: {} },
          // Fragmented
          { template: "liability {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to borrow {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my liability for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me borrow {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my liability?", slots: {} },
          // Narrative
          { template: "I recently noticed my liability for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my liability", slots: {} },
          // Fragmented
          { template: "liability {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to borrow {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my liability for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me borrow {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my liability?", slots: {} },
          // Narrative
          { template: "I recently noticed my liability for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my liability", slots: {} },
          // Fragmented
          { template: "liability {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to borrow {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my liability for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me borrow {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my liability?", slots: {} },
          // Narrative
          { template: "I recently noticed my liability for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my liability", slots: {} },
          // Fragmented
          { template: "liability {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to borrow {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my liability for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me borrow {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my liability?", slots: {} },
          // Narrative
          { template: "I recently noticed my liability for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my liability", slots: {} },
          // Fragmented
          { template: "liability {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to borrow {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my liability for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me borrow {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my liability?", slots: {} },
          // Narrative
          { template: "I recently noticed my liability for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my liability", slots: {} },
          // Fragmented
          { template: "liability {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to borrow {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my liability for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me borrow {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my liability?", slots: {} },
          // Narrative
          { template: "I recently noticed my liability for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my liability", slots: {} },
          // Fragmented
          { template: "liability {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to borrow {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my liability for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me borrow {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my liability?", slots: {} },
          // Narrative
          { template: "I recently noticed my liability for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my liability", slots: {} },
          // Fragmented
          { template: "liability {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to borrow {amount} on {category}", slots: { amount: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my liability for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me borrow {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my liability?", slots: {} },
          // Narrative
          { template: "I recently noticed my liability for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my liability", slots: {} },
          // Fragmented
          { template: "liability {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    default:
      return {};
  }
};
