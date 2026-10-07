import { validateConfig } from '../extensions/market-discount/src/config.js';

export function buildMetafieldPayload(config, { rollback = false } = {}) {
  const check = validateConfig(config);
  if (!check.valid) throw new Error(check.errors.join('\n'));
  const rules = { ...config, enabled: rollback ? false : config.enabled };
  return {
    dryRun: true,
    shop: 'demo-store.example',
    request: {
      query: `mutation DemoSetRules($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { namespace key type value }
          userErrors { field message code }
        }
      }`,
      variables: {
        metafields: [{
          ownerId: 'gid://shopify/DiscountAutomaticNode/900901',
          namespace: '$app:demo-market-discount',
          key: 'rules',
          type: 'json',
          value: JSON.stringify(rules)
        }]
      }
    }
  };
}
