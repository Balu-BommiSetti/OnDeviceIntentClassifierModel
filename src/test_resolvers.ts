import { NumericResolver } from './lib/nlp/resolvers/NumericResolver';
import { TemporalResolver } from './lib/nlp/resolvers/TemporalResolver';
import { TaxonomyResolver } from './lib/nlp/resolvers/TaxonomyResolver';
import { CognitionFacade } from './lib/nlp/CognitionFacade';

console.log('--- Testing NumericResolver ---');
console.log(NumericResolver.resolveAmount('twenty bucks')); // 20 USD
console.log(NumericResolver.resolveAmount('1.5 lakhs')); // 150000
console.log(NumericResolver.resolveAmount('a couple hundred')); // 200, low confidence

console.log('\n--- Testing TemporalResolver ---');
console.log(TemporalResolver.resolveDate('yesterday')); // offset: -1
console.log(TemporalResolver.resolveDate('on 15th March')); // absolute, month 3, day 15

console.log('\n--- Testing TaxonomyResolver ---');
const db = [{ id: 'CAT_1', name: 'food', aliases: ['dining', 'lunch'] }];
console.log(TaxonomyResolver.resolve('lunch', db)); // Exact match alias
console.log(TaxonomyResolver.resolve('fods', db)); // Fuzzy match "fods" -> "food"

console.log('\n--- Testing CognitionFacade ---');
const facade = new CognitionFacade();
try {
  // Successful resolution
  const result = facade.processInference({
    intent: 'ADD_EXPENSE',
    entities: [
      { type: 'AMOUNT', value: 'fifty dollars' },
      { type: 'CATEGORY', value: 'dining' },
      { type: 'DATE', value: 'yesterday' }
    ]
  });
  console.log('Success:', result);
} catch (e: any) {
  console.error('Error:', e.message);
}

try {
  // Missing Slot Exception (Unresolvable Category)
  const result2 = facade.processInference({
    intent: 'ADD_EXPENSE',
    entities: [
      { type: 'AMOUNT', value: 'fifty dollars' },
      { type: 'CATEGORY', value: 'unknown_stuff' }
    ]
  });
  console.log(result2);
} catch (e: any) {
  console.log('Expected Error Triggered:', e.message, '| Missing Slot:', e.slotName);
}
