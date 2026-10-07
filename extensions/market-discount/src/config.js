const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const moneyPattern = /^(0|[1-9][0-9]{0,8})\.[0-9]{2}$/;

export function cents(value) {
  if (typeof value !== 'string') return null;
  const match = /^(0|[1-9][0-9]{0,8})(?:\.([0-9]{1,2})0{0,6})?$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

export function validateConfig(config) {
  const errors = [];
  const keys = (v, allowed, path) => {
    if (!object(v)) { errors.push(`${path}: expected object`); return false; }
    for (const key of Object.keys(v)) {
      if (!allowed.includes(key)) errors.push(`${path}.${key}: unknown property`);
    }
    for (const key of allowed) {
      if (!Object.prototype.hasOwnProperty.call(v, key)) errors.push(`${path}.${key}: required`);
    }
    return true;
  };
  if (!keys(config, ['version', 'enabled', 'excludedTags', 'markets'], 'config')) {
    return { valid: false, errors };
  }
  if (config.version !== 1) errors.push('config.version: must be 1');
  if (typeof config.enabled !== 'boolean') errors.push('config.enabled: expected boolean');
  const tags = config.excludedTags;
  if (!Array.isArray(tags) || tags.length > 20 ||
      tags.some((t) => typeof t !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/.test(t)) ||
      new Set(tags).size !== tags.length) errors.push('config.excludedTags: up to 20 unique nonempty ASCII tags');
  if (!Array.isArray(config.markets) || config.markets.length < 1 || config.markets.length > 20) {
    errors.push('config.markets: expected 1..20 rules');
  } else {
    const ids = new Set();
    config.markets.forEach((rule, i) => {
      const path = `config.markets[${i}]`;
      if (!keys(rule, ['marketId', 'currencyCode', 'tiers'], path)) return;
      if (typeof rule.marketId !== 'string' || !/^gid:\/\/shopify\/Market\/[0-9]{1,20}$/.test(rule.marketId) || ids.has(rule.marketId)) {
        errors.push(`${path}.marketId: expected unique Market GID`);
      }
      ids.add(rule.marketId);
      if (!['EUR', 'USD'].includes(rule.currencyCode)) errors.push(`${path}.currencyCode: EUR or USD only`);
      if (!Array.isArray(rule.tiers) || rule.tiers.length < 1 || rule.tiers.length > 10) {
        errors.push(`${path}.tiers: expected 1..10 tiers`);
        return;
      }
      let previousThreshold = -1;
      let previousPercent = 0;
      rule.tiers.forEach((tier, j) => {
        const at = `${path}.tiers[${j}]`;
        if (!keys(tier, ['minimumSubtotal', 'percentage'], at)) return;
        const threshold = cents(tier.minimumSubtotal);
        if (typeof tier.minimumSubtotal !== 'string' || !moneyPattern.test(tier.minimumSubtotal) || threshold === null || threshold <= previousThreshold) errors.push(`${at}.minimumSubtotal: ascending two-decimal amounts required`);
        if (!Number.isInteger(tier.percentage) || tier.percentage <= previousPercent || tier.percentage > 100) {
          errors.push(`${at}.percentage: ascending integers 1..100 required`);
        }
        previousThreshold = threshold ?? previousThreshold;
        previousPercent = tier.percentage;
      });
    });
  }
  return { valid: errors.length === 0, errors };
}
