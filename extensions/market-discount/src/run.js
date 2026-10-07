import { cents, validateConfig } from './config.js';

export function run(input) {
  const empty = () => ({ operations: [] });
  const config = input?.discount?.metafield?.jsonValue;
  if (!validateConfig(config).valid || !config.enabled ||
      !input.discount.discountClasses?.includes('PRODUCT')) return empty();
  const rule = config.markets.find((r) => r.marketId === input.localization?.market?.id);
  if (!rule || !Array.isArray(input.cart?.lines)) return empty();

  let subtotal = 0;
  const targets = [];
  const ids = new Set();
  for (const line of input.cart.lines) {
    if (typeof line?.id !== 'string' || line.id.length === 0 || ids.has(line.id) ||
        !Number.isInteger(line.quantity) || line.quantity < 1) return empty();
    ids.add(line.id);
    if (line.merchandise?.__typename !== 'ProductVariant') continue;
    const tags = line.merchandise.product?.hasTags;
    if (!Array.isArray(tags) || tags.length !== config.excludedTags.length ||
        config.excludedTags.some((tag) => tags.filter((t) => t?.tag === tag && typeof t.hasTag === 'boolean').length !== 1)) return empty();
    if (tags.some((t) => t.hasTag)) continue;
    const money = line.cost?.totalAmount;
    const amount = cents(money?.amount);
    if (amount === null || money.currencyCode !== rule.currencyCode) return empty();
    subtotal += amount; // totalAmount already includes quantity: do not multiply again.
    if (!Number.isSafeInteger(subtotal)) return empty();
    targets.push({ cartLine: { id: line.id, quantity: line.quantity } });
  }
  const tier = rule.tiers.filter((t) => subtotal >= cents(t.minimumSubtotal)).pop();
  if (!tier || targets.length === 0) return empty();
  return {
    operations: [{
      productDiscountsAdd: {
        candidates: [{
          message: `Demo market discount: ${tier.percentage}%`,
          targets,
          value: { percentage: { value: String(tier.percentage) } }
        }],
        selectionStrategy: 'FIRST'
      }
    }]
  };
}
