export const SUPPORT_PRODUCT_CONFIGS = [
  {
    id: 'com.faridsakhizad.timecross.support3.v0',
    label: 'Love and Support',
    tier: 'standard',
    devFallbackPrice: '$2.99',
  },
  {
    id: 'com.faridsakhizad.timecross.support5.v0',
    label: 'Love, Support, and Coffee',
    tier: 'standard',
    devFallbackPrice: '$4.99',
  },
  {
    id: 'com.faridsakhizad.timecross.support10.v0',
    label: 'Legendary Support',
    tier: 'standard',
    devFallbackPrice: '$9.99',
  },
  {
    id: 'com.faridsakhizad.timecross.support25.v0',
    label: 'Sponsor Future Development',
    tier: 'future',
    devFallbackPrice: '$24.99',
  },
  {
    id: 'com.faridsakhizad.timecross.support50.v0',
    label: 'Major Support',
    tier: 'future',
    devFallbackPrice: '$49.99',
  },
  {
    id: 'com.faridsakhizad.timecross.support100.v0',
    label: 'Visionary Support',
    tier: 'future',
    devFallbackPrice: '$99.99',
  },
] as const;

export const SUPPORT_PRODUCT_IDS = SUPPORT_PRODUCT_CONFIGS.map((product) => product.id);

export type SupportProductId = typeof SUPPORT_PRODUCT_CONFIGS[number]['id'];
