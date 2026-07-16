import { RawEntitySpan, MissingSlotException, ResolvedNumeric, ResolvedTemporal, ResolvedTaxonomy } from './types';
import { NumericResolver } from './resolvers/NumericResolver';
import { TemporalResolver } from './resolvers/TemporalResolver';
import { TaxonomyResolver, TaxonomyRecord } from './resolvers/TaxonomyResolver';

export interface NluInferencePayload {
  intent: string;
  entities: RawEntitySpan[];
}

export interface StrictAddExpensePayload {
  intent: 'ADD_EXPENSE';
  amount: number;
  currency: string | null;
  date: any; // Using any for temporal struct for simplicity here
  categoryId: string;
  merchantId: string | null;
}

/**
 * CognitionFacade is the orchestrator between the fuzzy TensorFlow.js output
 * and the strict deterministic engine (Redux/SQLite).
 */
export class CognitionFacade {
  
  // Mock databases that would normally come from SQLite
  private categoriesDB: TaxonomyRecord[] = [
    { id: 'CAT_FOOD', name: 'food', aliases: ['dining', 'lunch', 'dinner', 'snacks', 'groceries'] },
    { id: 'CAT_TRANSPORT', name: 'transport', aliases: ['gas', 'fuel', 'petrol', 'taxi', 'uber', 'lyft'] },
    { id: 'CAT_BILLS', name: 'bills', aliases: ['utilities', 'electricity', 'water', 'internet'] }
  ];

  private merchantsDB: TaxonomyRecord[] = [
    { id: 'MERCH_AMAZON', name: 'amazon', aliases: ['amzn', 'amazon prime'] },
    { id: 'MERCH_UBER', name: 'uber', aliases: ['uber rides'] },
    { id: 'MERCH_SWIGGY', name: 'swiggy', aliases: ['swiggy delivery'] }
  ];

  /**
   * Processes the raw NLU payload into a strict execution payload.
   * Throws MissingSlotException if a required entity cannot be resolved.
   */
  public processInference(payload: NluInferencePayload): StrictAddExpensePayload | any {
    switch (payload.intent) {
      case 'ADD_EXPENSE':
        return this.processAddExpense(payload.entities);
      default:
        return {
          intent: payload.intent,
          status: 'UNSUPPORTED_BY_FACADE_YET',
          rawEntities: payload.entities
        };
    }
  }

  private processAddExpense(entities: RawEntitySpan[]): StrictAddExpensePayload {
    let resolvedAmount: ResolvedNumeric | null = null;
    let resolvedDate: ResolvedTemporal | null = null;
    let resolvedCategory: ResolvedTaxonomy | null = null;
    let resolvedMerchant: ResolvedTaxonomy | null = null;

    let rawAmountText: string | null = null;
    let rawCategoryText: string | null = null;

    for (const entity of entities) {
      if (entity.type === 'AMOUNT') {
        rawAmountText = entity.value;
        resolvedAmount = NumericResolver.resolveAmount(entity.value);
      }
      if (entity.type === 'DATE') {
        resolvedDate = TemporalResolver.resolveDate(entity.value);
      }
      if (entity.type === 'CATEGORY') {
        rawCategoryText = entity.value;
        resolvedCategory = TaxonomyResolver.resolve(entity.value, this.categoriesDB);
      }
      if (entity.type === 'MERCHANT') {
        resolvedMerchant = TaxonomyResolver.resolve(entity.value, this.merchantsDB);
      }
    }

    // --- Strict Validation Rules ---

    // 1. Expense MUST have a parsed amount > 0
    if (!resolvedAmount || resolvedAmount.value <= 0) {
      throw new MissingSlotException('amount', rawAmountText);
    }

    // 2. Expense MUST have a resolved category ID
    // If we couldn't resolve it against the DB, we throw!
    if (!resolvedCategory || !resolvedCategory.id) {
      throw new MissingSlotException('categoryId', rawCategoryText);
    }

    // If date is missing, default to today
    if (!resolvedDate) {
      resolvedDate = TemporalResolver.resolveDate('today');
    }

    return {
      intent: 'ADD_EXPENSE',
      amount: resolvedAmount.value,
      currency: resolvedAmount.currency,
      date: resolvedDate,
      categoryId: resolvedCategory.id,
      merchantId: resolvedMerchant?.id || null
    };
  }
}
