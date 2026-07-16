const fs = require('fs');

const templatesPath = '/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/v6/exported_dataset/templates.json';
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

// Regex replacements
const replacements = [
  { regex: /\b(this month|last month|this year|last year|today|yesterday|tomorrow|this week|last week)\b/gi, replacement: '{PERIOD}' },
  { regex: /\b(july|june|august|september|october|november|december|january|february|march|april|may)\b/gi, replacement: '{DATE}' },
  { regex: /\b(rent|gas|groceries|food|electricity|water bill|wifi|internet)\b/gi, replacement: '{CATEGORY}' },
  { regex: /\b(gas stations|restaurants|swiggy|zomato|amazon|flipkart)\b/gi, replacement: '{MERCHANT}' }
];

let changedCount = 0;

for (const key in templates) {
  if (Array.isArray(templates[key])) {
    templates[key] = templates[key].map(template => {
      let newTemplate = template;
      replacements.forEach(r => {
        newTemplate = newTemplate.replace(r.regex, r.replacement);
      });
      if (newTemplate !== template) {
        changedCount++;
      }
      return newTemplate;
    });
  }
}

fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2));
console.log(`Updated ${changedCount} templates.`);
