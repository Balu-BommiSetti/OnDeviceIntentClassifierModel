import { AMOUNTS, CATEGORIES, DATE_RANGES } from "../config/generationConfig";

export const getanalysisTemplates = (intent: string): any => {
  switch (intent) {
    case 'SPENDING_ANALYSIS':
      return {
        'CREATE': [
          // Direct
          { template: "I want to analyze {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my spending for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my spending?", slots: {} },
          // Narrative
          { template: "I recently noticed my spending for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my spending", slots: {} },
          // Fragmented
          { template: "spending {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to analyze {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my spending for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my spending?", slots: {} },
          // Narrative
          { template: "I recently noticed my spending for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my spending", slots: {} },
          // Fragmented
          { template: "spending {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to analyze {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my spending for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my spending?", slots: {} },
          // Narrative
          { template: "I recently noticed my spending for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my spending", slots: {} },
          // Fragmented
          { template: "spending {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to analyze {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my spending for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my spending?", slots: {} },
          // Narrative
          { template: "I recently noticed my spending for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my spending", slots: {} },
          // Fragmented
          { template: "spending {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to analyze {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my spending for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my spending?", slots: {} },
          // Narrative
          { template: "I recently noticed my spending for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my spending", slots: {} },
          // Fragmented
          { template: "spending {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to analyze {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my spending for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my spending?", slots: {} },
          // Narrative
          { template: "I recently noticed my spending for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my spending", slots: {} },
          // Fragmented
          { template: "spending {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to analyze {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my spending for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my spending?", slots: {} },
          // Narrative
          { template: "I recently noticed my spending for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my spending", slots: {} },
          // Fragmented
          { template: "spending {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to analyze {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my spending for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my spending?", slots: {} },
          // Narrative
          { template: "I recently noticed my spending for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my spending", slots: {} },
          // Fragmented
          { template: "spending {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to analyze {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my spending for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my spending?", slots: {} },
          // Narrative
          { template: "I recently noticed my spending for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my spending", slots: {} },
          // Fragmented
          { template: "spending {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to analyze {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my spending for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my spending?", slots: {} },
          // Narrative
          { template: "I recently noticed my spending for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my spending", slots: {} },
          // Fragmented
          { template: "spending {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to analyze {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my spending for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my spending?", slots: {} },
          // Narrative
          { template: "I recently noticed my spending for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my spending", slots: {} },
          // Fragmented
          { template: "spending {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to analyze {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my spending for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me analyze {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my spending?", slots: {} },
          // Narrative
          { template: "I recently noticed my spending for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my spending", slots: {} },
          // Fragmented
          { template: "spending {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    case 'NET_WORTH_CHECK':
      return {
        'CREATE': [
          // Direct
          { template: "I want to check {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my net worth for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me check {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my net worth?", slots: {} },
          // Narrative
          { template: "I recently noticed my net worth for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my net worth", slots: {} },
          // Fragmented
          { template: "net worth {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to check {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my net worth for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me check {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my net worth?", slots: {} },
          // Narrative
          { template: "I recently noticed my net worth for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my net worth", slots: {} },
          // Fragmented
          { template: "net worth {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to check {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my net worth for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me check {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my net worth?", slots: {} },
          // Narrative
          { template: "I recently noticed my net worth for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my net worth", slots: {} },
          // Fragmented
          { template: "net worth {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to check {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my net worth for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me check {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my net worth?", slots: {} },
          // Narrative
          { template: "I recently noticed my net worth for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my net worth", slots: {} },
          // Fragmented
          { template: "net worth {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to check {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my net worth for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me check {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my net worth?", slots: {} },
          // Narrative
          { template: "I recently noticed my net worth for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my net worth", slots: {} },
          // Fragmented
          { template: "net worth {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to check {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my net worth for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me check {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my net worth?", slots: {} },
          // Narrative
          { template: "I recently noticed my net worth for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my net worth", slots: {} },
          // Fragmented
          { template: "net worth {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to check {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my net worth for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me check {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my net worth?", slots: {} },
          // Narrative
          { template: "I recently noticed my net worth for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my net worth", slots: {} },
          // Fragmented
          { template: "net worth {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to check {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my net worth for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me check {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my net worth?", slots: {} },
          // Narrative
          { template: "I recently noticed my net worth for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my net worth", slots: {} },
          // Fragmented
          { template: "net worth {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to check {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my net worth for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me check {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my net worth?", slots: {} },
          // Narrative
          { template: "I recently noticed my net worth for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my net worth", slots: {} },
          // Fragmented
          { template: "net worth {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to check {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my net worth for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me check {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my net worth?", slots: {} },
          // Narrative
          { template: "I recently noticed my net worth for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my net worth", slots: {} },
          // Fragmented
          { template: "net worth {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to check {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my net worth for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me check {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my net worth?", slots: {} },
          // Narrative
          { template: "I recently noticed my net worth for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my net worth", slots: {} },
          // Fragmented
          { template: "net worth {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to check {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my net worth for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me check {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my net worth?", slots: {} },
          // Narrative
          { template: "I recently noticed my net worth for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my net worth", slots: {} },
          // Fragmented
          { template: "net worth {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    case 'CASHFLOW_WARNING':
      return {
        'CREATE': [
          // Direct
          { template: "I want to warn about {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "CREATE my cashflow for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me warn about {category}?", slots: { category: CATEGORIES } },
          { template: "How do I create my cashflow?", slots: {} },
          // Narrative
          { template: "I recently noticed my cashflow for {category} is interesting, let's create it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a create for my cashflow", slots: {} },
          // Fragmented
          { template: "cashflow {category} create", slots: { category: CATEGORIES } },
        ],
        'STATUS': [
          // Direct
          { template: "I want to warn about {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "STATUS my cashflow for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me warn about {category}?", slots: { category: CATEGORIES } },
          { template: "How do I status my cashflow?", slots: {} },
          // Narrative
          { template: "I recently noticed my cashflow for {category} is interesting, let's status it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a status for my cashflow", slots: {} },
          // Fragmented
          { template: "cashflow {category} status", slots: { category: CATEGORIES } },
        ],
        'ANALYSIS': [
          // Direct
          { template: "I want to warn about {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "ANALYSIS my cashflow for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me warn about {category}?", slots: { category: CATEGORIES } },
          { template: "How do I analysis my cashflow?", slots: {} },
          // Narrative
          { template: "I recently noticed my cashflow for {category} is interesting, let's analysis it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a analysis for my cashflow", slots: {} },
          // Fragmented
          { template: "cashflow {category} analysis", slots: { category: CATEGORIES } },
        ],
        'UPDATE': [
          // Direct
          { template: "I want to warn about {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "UPDATE my cashflow for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me warn about {category}?", slots: { category: CATEGORIES } },
          { template: "How do I update my cashflow?", slots: {} },
          // Narrative
          { template: "I recently noticed my cashflow for {category} is interesting, let's update it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a update for my cashflow", slots: {} },
          // Fragmented
          { template: "cashflow {category} update", slots: { category: CATEGORIES } },
        ],
        'DELETE': [
          // Direct
          { template: "I want to warn about {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "DELETE my cashflow for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me warn about {category}?", slots: { category: CATEGORIES } },
          { template: "How do I delete my cashflow?", slots: {} },
          // Narrative
          { template: "I recently noticed my cashflow for {category} is interesting, let's delete it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a delete for my cashflow", slots: {} },
          // Fragmented
          { template: "cashflow {category} delete", slots: { category: CATEGORIES } },
        ],
        'SUMMARY': [
          // Direct
          { template: "I want to warn about {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "SUMMARY my cashflow for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me warn about {category}?", slots: { category: CATEGORIES } },
          { template: "How do I summary my cashflow?", slots: {} },
          // Narrative
          { template: "I recently noticed my cashflow for {category} is interesting, let's summary it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a summary for my cashflow", slots: {} },
          // Fragmented
          { template: "cashflow {category} summary", slots: { category: CATEGORIES } },
        ],
        'INSIGHTS': [
          // Direct
          { template: "I want to warn about {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "INSIGHTS my cashflow for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me warn about {category}?", slots: { category: CATEGORIES } },
          { template: "How do I insights my cashflow?", slots: {} },
          // Narrative
          { template: "I recently noticed my cashflow for {category} is interesting, let's insights it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a insights for my cashflow", slots: {} },
          // Fragmented
          { template: "cashflow {category} insights", slots: { category: CATEGORIES } },
        ],
        'COMPARISON': [
          // Direct
          { template: "I want to warn about {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "COMPARISON my cashflow for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me warn about {category}?", slots: { category: CATEGORIES } },
          { template: "How do I comparison my cashflow?", slots: {} },
          // Narrative
          { template: "I recently noticed my cashflow for {category} is interesting, let's comparison it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a comparison for my cashflow", slots: {} },
          // Fragmented
          { template: "cashflow {category} comparison", slots: { category: CATEGORIES } },
        ],
        'RISK_CHECK': [
          // Direct
          { template: "I want to warn about {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "RISK_CHECK my cashflow for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me warn about {category}?", slots: { category: CATEGORIES } },
          { template: "How do I risk_check my cashflow?", slots: {} },
          // Narrative
          { template: "I recently noticed my cashflow for {category} is interesting, let's risk_check it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a risk_check for my cashflow", slots: {} },
          // Fragmented
          { template: "cashflow {category} risk_check", slots: { category: CATEGORIES } },
        ],
        'FORECAST': [
          // Direct
          { template: "I want to warn about {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "FORECAST my cashflow for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me warn about {category}?", slots: { category: CATEGORIES } },
          { template: "How do I forecast my cashflow?", slots: {} },
          // Narrative
          { template: "I recently noticed my cashflow for {category} is interesting, let's forecast it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a forecast for my cashflow", slots: {} },
          // Fragmented
          { template: "cashflow {category} forecast", slots: { category: CATEGORIES } },
        ],
        'WHAT_IF': [
          // Direct
          { template: "I want to warn about {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "WHAT_IF my cashflow for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me warn about {category}?", slots: { category: CATEGORIES } },
          { template: "How do I what_if my cashflow?", slots: {} },
          // Narrative
          { template: "I recently noticed my cashflow for {category} is interesting, let's what_if it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a what_if for my cashflow", slots: {} },
          // Fragmented
          { template: "cashflow {category} what_if", slots: { category: CATEGORIES } },
        ],
        'EXPLANATION': [
          // Direct
          { template: "I want to warn about {date} on {category}", slots: { date: AMOUNTS, category: CATEGORIES } },
          { template: "EXPLANATION my cashflow for {category}", slots: { category: CATEGORIES } },
          // Inquiry
          { template: "Can you help me warn about {category}?", slots: { category: CATEGORIES } },
          { template: "How do I explanation my cashflow?", slots: {} },
          // Narrative
          { template: "I recently noticed my cashflow for {category} is interesting, let's explanation it", slots: { category: CATEGORIES } },
          // Formal
          { template: "Please process a explanation for my cashflow", slots: {} },
          // Fragmented
          { template: "cashflow {category} explanation", slots: { category: CATEGORIES } },
        ],
      };
    default:
      return {};
  }
};
