import re

with open('/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/generate_dataset.ts', 'r') as f:
    content = f.read()

# Fix recursive calls in the default case for renamed functions
content = content.replace("return generateTemplates_ADD_GOAL(", "return generateTemplates_GOAL_PLANNING(")
content = content.replace("return generateTemplates_UPDATE_GOAL_PROGRESS(", "return generateTemplates_UPDATE_GOAL_PROGRESS_OLD(")
content = content.replace("return generateTemplates_CREATE_BUDGET(", "return generateTemplates_BUDGET_PLANNING(")
content = content.replace("return generateTemplates_VIEW_SPENDING_ANALYSIS(", "return generateTemplates_SPENDING_ANALYSIS(")
content = content.replace("return generateTemplates_VIEW_NET_WORTH(", "return generateTemplates_NET_WORTH_CHECK(")
content = content.replace("return generateTemplates_VIEW_CASHFLOW(", "return generateTemplates_CASHFLOW_WARNING(")

with open('/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/generate_dataset.ts', 'w') as f:
    f.write(content)
