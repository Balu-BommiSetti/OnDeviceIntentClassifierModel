# WealthPilot Dataset Review & Improvement Recommendations

## Executive Summary

The current WealthPilot synthetic dataset generation framework demonstrates a strong foundation for training a financial intent classification system. The intent hierarchy is well-structured, templates are organized by sub-intent, slot replacement is implemented correctly, and balanced sampling prevents severe class imbalance.

However, the current dataset is still heavily template-driven and does not yet fully represent the diversity, ambiguity, and variability found in real-world user financial conversations.

The dataset is suitable for training a Version 1 intent classifier but requires additional improvements before it can support production-grade intent understanding at scale.

---

# Current Dataset Assessment

| Area                   | Score  |
| ---------------------- | ------ |
| Intent Coverage        | 9/10   |
| SubIntent Coverage     | 9/10   |
| Template Diversity     | 8/10   |
| Entity Diversity       | 6/10   |
| Real User Simulation   | 5/10   |
| Intent Separation      | 8.5/10 |
| Hard Negative Coverage | 2/10   |
| Generalization Ability | 6.5/10 |
| Production Readiness   | 7/10   |

---

# Strengths of the Current Dataset

## 1. Strong Intent Taxonomy

The current taxonomy covers most major personal finance use cases:

### Transaction Management

* ADD_EXPENSE
* ADD_INCOME
* REFUND

### Budgeting

* BUDGET_PLANNING

### Analytics

* SPENDING_ANALYSIS
* NET_WORTH_CHECK
* CASHFLOW_WARNING

### Planning

* GOAL_PLANNING
* SAVINGS_ADVICE

### Debt Management

* LOAN_ANALYSIS
* DEBT_FREEDOM_ANALYSIS

### Affordability

* AFFORDABILITY_CHECK

This taxonomy provides good domain coverage and enables future expansion.

---

## 2. Strong SubIntent Separation

Example:

### ADD_EXPENSE

* LOG
* SPLIT
* REIMBURSABLE

### AFFORDABILITY_CHECK

* QUICK
* FUTURE_PLAN
* EMI_IMPACT
* COMPARE

### SPENDING_ANALYSIS

* BREAKDOWN
* TREND
* CATEGORY_DRILL
* COMPARE

The hierarchy is logical and suitable for multi-level classification.

---

## 3. Balanced Sampling

The generator uses round-robin template selection.

Benefits:

* Prevents dominant templates
* Avoids sampling bias
* Improves intent balance
* Reduces overfitting to specific patterns

---

## 4. Noise Injection

Current noise injection includes:

* Case transformations
* Hinglish fillers
* Typographical errors
* Formatting inconsistencies

This is useful for improving robustness against imperfect user input.

---

# Major Weaknesses Identified

## 1. Static Entity Vocabulary

Current entity sets are extremely limited.

Example:

```typescript
merchant: [
  "Swiggy",
  "Zomato",
  "Amazon",
  "Uber"
]
```

After several thousand samples, the model begins associating these specific entities with intents rather than learning the underlying semantic patterns.

### Risk

Model learns:

Swiggy → Expense

instead of learning:

Merchant → Expense Entity

### Recommendation

Expand to hundreds or thousands of merchants.

Example:

Food:

* Swiggy
* Zomato
* McDonald's
* KFC
* Starbucks
* Dominos

Shopping:

* Amazon
* Flipkart
* Myntra
* Ajio

Utilities:

* Airtel
* Jio
* ACT
* BSNL

Banking:

* HDFC
* SBI
* ICICI
* Axis

---

## 2. Amount Diversity Is Insufficient

Current amounts:

* 10
* 45
* 999
* 1200
* 5000
* 10k
* 50k

These are repeatedly reused.

### Risk

The model memorizes:

10k
50k
5 lakh

instead of understanding the concept of monetary values.

### Recommendation

Implement dynamic amount generation.

Generate:

Small Values:

* 7
* 23
* 91

Medium Values:

* 1,234
* 4,567
* 12,543

Large Values:

* 1 lakh
* 3.5 lakh
* 1.2 crore

Include:

* Indian numbering system
* Western numbering system
* Currency symbols
* Spoken forms
* Slang forms

Examples:

* ₹500
* 500 rs
* 500 rupees
* five hundred
* five hundred bucks

---

## 3. Lack of Real User Queries

Most generated samples follow complete sentence structures.

Example:

Spent 500 on food

Real users frequently enter:

* food 500
* swiggy 200
* salary
* rent 25k
* net worth
* food spending
* emi impact

These abbreviated queries are currently underrepresented.

### Recommendation

At least 20-30% of the dataset should contain:

* Fragmented queries
* Search-style queries
* Single entity queries
* Missing slots

---

## 4. Lack of Hard Negatives

This is the largest dataset weakness.

Current dataset primarily contains positive examples.

Example:

Spent 500 on food

→ ADD_EXPENSE

But neighboring intents are missing.

Example:

Can I spend 500 on food?

→ AFFORDABILITY_CHECK

How much did I spend on food?

→ SPENDING_ANALYSIS

Set food budget to 500

→ BUDGET_PLANNING

Without these examples, the classifier struggles with intent boundaries.

---

# Intent Boundary Analysis

The following intent pairs are likely to be confused:

| Intent                | Common Confusion    |
| --------------------- | ------------------- |
| ADD_EXPENSE           | AFFORDABILITY_CHECK |
| ADD_EXPENSE           | BUDGET_PLANNING     |
| ADD_EXPENSE           | SPENDING_ANALYSIS   |
| GOAL_PLANNING         | ADD_ASSET           |
| GOAL_PLANNING         | SAVINGS_ADVICE      |
| SPENDING_ANALYSIS     | CASHFLOW_WARNING    |
| NET_WORTH_CHECK       | ADD_ASSET           |
| NET_WORTH_CHECK       | ADD_LIABILITY       |
| DEBT_FREEDOM_ANALYSIS | LOAN_ANALYSIS       |

These intent pairs require dedicated contrastive training samples.

---

# Missing Merchant-Category Relationships

Current generation treats merchants and categories independently.

Real-world data contains strong relationships.

Examples:

Swiggy
→ Food Delivery

Netflix
→ Entertainment

Uber
→ Transportation

Airtel
→ Mobile Bill

Amazon
→ Shopping

### Recommendation

Create:

```typescript
MERCHANT_CATEGORY_MAP
```

Example:

```typescript
{
  "Swiggy": "Food Delivery",
  "Netflix": "Entertainment",
  "Uber": "Transportation"
}
```

This will significantly improve realism.

---

# Missing Conversational Context

Current dataset is entirely single-turn.

Example:

User:
How much did I spend on food?

Assistant:
8500

User:
What about last month?

The second query depends entirely on context.

Current dataset does not teach the model how to handle follow-up interactions.

### Recommendation

Create a separate contextual dataset containing:

* Previous turns
* Current query
* Resolved intent

---

# Missing Ambiguous Query Handling

Many real-world financial queries are ambiguous.

Examples:

amazon 500

salary

rent

food spending

These could map to multiple intents depending on context.

### Recommendation

Introduce:

```json
{
  "query": "amazon 500",
  "intent": "AMBIGUOUS",
  "candidateIntents": [
    "ADD_EXPENSE",
    "SPENDING_ANALYSIS"
  ]
}
```

This enables future clarification workflows.

---

# Recommended Dataset Evolution Roadmap

## Phase 1

Current State

* Template Registry
* Slot Filling
* Noise Injection
* Balanced Sampling

Status:
Completed

---

## Phase 2

Intent Boundary Matrix

Document all confusing intent pairs.

Status:
Recommended Next Step

---

## Phase 3

Gold Evaluation Dataset

Create manually curated dataset.

Target:

* 100-200 examples per intent
* Never used for training

Purpose:

* Benchmark accuracy
* Detect regressions

---

## Phase 4

Dynamic Slot Generators

Replace static MOCK_DATA with:

* Amount Generator
* Date Generator
* Merchant Generator
* Category Generator

---

## Phase 5

Hard Negative Generator

For every positive example:

Generate:

* 3-5 contrastive examples
* Neighboring intent examples

---

## Phase 6

Merchant Hierarchy

Introduce:

Merchant
→ Merchant Type
→ Category
→ Parent Category

---

## Phase 7

Short Query Dataset

Generate:

* Search-style inputs
* Fragmented queries
* Entity-only queries

Target:

20-30% of training data

---

## Phase 8

Multi-Intent Dataset

Examples:

Spent 5000 on food. Will this affect my budget?

Contains:

* ADD_EXPENSE
* BUDGET_PLANNING

---

## Phase 9

Conversation Dataset

Support:

* Follow-up questions
* Context carryover
* Multi-turn interactions

---

## Phase 10

Production Training

Train baseline models:

* FastText
* MiniLM
* E5 Small
* BGE Small

Evaluate using:

* Accuracy
* F1 Score
* Confusion Matrix

---

# Final Conclusion

The current WealthPilot dataset architecture is already suitable for training a strong Version 1 financial intent classifier.

However, future improvements should focus less on increasing template count and more on:

1. Hard Negative Generation
2. Dynamic Slot Diversity
3. Real User Query Simulation
4. Merchant-Category Relationships
5. Multi-Turn Conversations
6. Ambiguous Query Handling
7. Short and Incomplete Queries

These improvements will provide significantly larger gains in real-world intent classification accuracy than simply generating more synthetic template-based samples.
