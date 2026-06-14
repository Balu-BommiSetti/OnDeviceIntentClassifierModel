import re
import sys

with open('/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/generate_dataset.ts', 'r') as f:
    content = f.read()

# 1. Update the INTENTS array in generateDataset
intents_array = """  const INTENTS = [
    "ADD_INCOME", "ADD_EXPENSE", "INCOME_DECLARATION", "ADD_ASSET",
    "ADD_LIABILITY", "REFUND", "AFFORDABILITY_CHECK", "DEBT_FREEDOM_ANALYSIS",
    "SIP_VS_PREPAY", "LOAN_ANALYSIS", "GOAL_PLANNING", "BUDGET_PLANNING",
    "SPENDING_ANALYSIS", "NET_WORTH_CHECK", "CASHFLOW_WARNING", "SAVINGS_ADVICE"
  ];"""
content = re.sub(r'const INTENTS = \[[^\]]*\];', intents_array, content, flags=re.MULTILINE)

# 2. Add New Intent Generators
new_generators = """
// ────────────────────────────────────────────────────
// INCOME_DECLARATION
// ────────────────────────────────────────────────────
function generateTemplates_INCOME_DECLARATION(style: StyleCategory, region: Region): (() => ReturnType<typeof buildSentence>)[] {
  const amount = pick(["75000", "5000", "1.5 lakhs", "100k", "50k", "120000"]);
  return [
    () => buildSentence(["My salary is ", { text: amount, label: "amount" }, " per month"]),
    () => buildSentence(["I make ", { text: amount, label: "amount" }, " annually"]),
    () => buildSentence(["I earn ", { text: amount, label: "amount" }, " from freelancing"]),
    () => buildSentence(["My base pay is ", { text: amount, label: "amount" }]),
    () => buildSentence(["I take home ", { text: amount, label: "amount" }, " a year"])
  ];
}

// ────────────────────────────────────────────────────
// REFUND
// ────────────────────────────────────────────────────
function generateTemplates_REFUND(style: StyleCategory, region: Region): (() => ReturnType<typeof buildSentence>)[] {
  const amount = pick(["50", "100", "200", "15.99"]);
  const merchant = pick(["Amazon", "Walmart", "Target", "Steam"]);
  return [
    () => buildSentence(["Got a refund of ", { text: amount, label: "amount" }, " from ", { text: merchant, label: "merchant" }]),
    () => buildSentence([{ text: merchant, label: "merchant" }, " refunded ", { text: amount, label: "amount" }, " to my account"]),
    () => buildSentence(["Received a refund of ", { text: amount, label: "amount" }]),
    () => buildSentence(["They refunded my ", { text: amount, label: "amount" }, " purchase at ", { text: merchant, label: "merchant" }])
  ];
}

// ────────────────────────────────────────────────────
// DEBT_FREEDOM_ANALYSIS
// ────────────────────────────────────────────────────
function generateTemplates_DEBT_FREEDOM_ANALYSIS(style: StyleCategory, region: Region): (() => ReturnType<typeof buildSentence>)[] {
  return [
    () => buildSentence(["When will I be debt-free?"]),
    () => buildSentence(["How long to pay off my loan?"]),
    () => buildSentence(["When am I going to be out of debt?"]),
    () => buildSentence(["Show my debt freedom date"]),
    () => buildSentence(["Analyze my debt payoff timeline"])
  ];
}

// ────────────────────────────────────────────────────
// SIP_VS_PREPAY
// ────────────────────────────────────────────────────
function generateTemplates_SIP_VS_PREPAY(style: StyleCategory, region: Region): (() => ReturnType<typeof buildSentence>)[] {
  return [
    () => buildSentence(["Should I invest my bonus or prepay my loan?"]),
    () => buildSentence(["Is SIP better than lump sum prepayment?"]),
    () => buildSentence(["Compare investing vs paying off debt"]),
    () => buildSentence(["Should I prepay my mortgage or invest?"]),
    () => buildSentence(["Invest or clear loan?"])
  ];
}

// ────────────────────────────────────────────────────
// LOAN_ANALYSIS
// ────────────────────────────────────────────────────
function generateTemplates_LOAN_ANALYSIS(style: StyleCategory, region: Region): (() => ReturnType<typeof buildSentence>)[] {
  return [
    () => buildSentence(["Break down my home loan"]),
    () => buildSentence(["What's the interest on my car loan?"]),
    () => buildSentence(["Show my loan amortization schedule"]),
    () => buildSentence(["Analyze my current loan"]),
    () => buildSentence(["How much interest will I pay on my mortgage?"])
  ];
}
"""

content = content.replace("// ═══════════════════════════════════════════════════════════════════════\n// PART 7: Template Dispatcher", new_generators + "\n// ═══════════════════════════════════════════════════════════════════════\n// PART 7: Template Dispatcher")

# 3. Rename existing functions and update dispatcher
content = content.replace("function generateTemplates_ADD_GOAL", "function generateTemplates_GOAL_PLANNING")
content = content.replace("function generateTemplates_UPDATE_GOAL_PROGRESS", "function generateTemplates_UPDATE_GOAL_PROGRESS_OLD")
content = content.replace("function generateTemplates_CREATE_BUDGET", "function generateTemplates_BUDGET_PLANNING")
content = content.replace("function generateTemplates_VIEW_SPENDING_ANALYSIS", "function generateTemplates_SPENDING_ANALYSIS")
content = content.replace("function generateTemplates_VIEW_NET_WORTH", "function generateTemplates_NET_WORTH_CHECK")
content = content.replace("function generateTemplates_VIEW_CASHFLOW", "function generateTemplates_CASHFLOW_WARNING")

# Dispatcher update
dispatcher = """function getTemplatesForIntent(intent: string, style: StyleCategory, region: Region): (() => ReturnType<typeof buildSentence>)[] {
  switch (intent) {
    case "ADD_EXPENSE": return generateTemplates_ADD_EXPENSE(style, region);
    case "ADD_INCOME": return generateTemplates_ADD_INCOME(style, region);
    case "INCOME_DECLARATION": return generateTemplates_INCOME_DECLARATION(style, region);
    case "ADD_ASSET": return generateTemplates_ADD_ASSET(style, region);
    case "ADD_LIABILITY": return generateTemplates_ADD_LIABILITY(style, region);
    case "REFUND": return generateTemplates_REFUND(style, region);
    case "AFFORDABILITY_CHECK": return generateTemplates_AFFORDABILITY_CHECK(style, region);
    case "DEBT_FREEDOM_ANALYSIS": return generateTemplates_DEBT_FREEDOM_ANALYSIS(style, region);
    case "SIP_VS_PREPAY": return generateTemplates_SIP_VS_PREPAY(style, region);
    case "LOAN_ANALYSIS": return generateTemplates_LOAN_ANALYSIS(style, region);
    case "GOAL_PLANNING": return generateTemplates_GOAL_PLANNING(style, region);
    case "BUDGET_PLANNING": return generateTemplates_BUDGET_PLANNING(style, region);
    case "SPENDING_ANALYSIS": return generateTemplates_SPENDING_ANALYSIS(style, region);
    case "NET_WORTH_CHECK": return generateTemplates_NET_WORTH_CHECK(style, region);
    case "CASHFLOW_WARNING": return generateTemplates_CASHFLOW_WARNING(style, region);
    case "SAVINGS_ADVICE": return generateTemplates_SAVINGS_ADVICE(style, region);
    default: return generateTemplates_ADD_EXPENSE(style, region); // fallback
  }
}"""
content = re.sub(r'function getTemplatesForIntent.*?\n\}', dispatcher, content, flags=re.DOTALL)

with open('/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/generate_dataset.ts', 'w') as f:
    f.write(content)
