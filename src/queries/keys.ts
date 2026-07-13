export const keys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  conv: {
    list: () => ['conversations', 'list'] as const,
    detail: (id: string) => ['conversations', 'detail', id] as const,
  },
  usage: {
    today: () => ['usage', 'today'] as const,
    history: (month: string) => ['usage', 'history', month] as const,
    budget: () => ['usage', 'budget'] as const,
    messageQuota: () => ['usage', 'message-quota'] as const,
  },
  plans: {
    list: () => ['plans', 'list'] as const,
    modelCatalog: () => ['plans', 'model-catalog'] as const,
  },
  sub: {
    current: () => ['subscription', 'current'] as const,
  },
  pay: {
    history: () => ['payments', 'history'] as const,
    gateways: () => ['payments', 'gateways'] as const,
  },
  invoices: {
    list: () => ['invoices', 'list'] as const,
    detail: (id: string) => ['invoices', 'detail', id] as const,
  },
  profile: {
    update: () => ['profile', 'update'] as const,
  },
  tickets: {
    list: () => ['tickets'] as const,
    detail: (id: string) => ['tickets', id] as const,
  },
  campaign: {
    status: () => ['campaign', 'status'] as const,
  },
  config: {
    features: () => ['config', 'features'] as const,
  },
  articles: {
    pinned: () => ['articles', 'pinned'] as const,
  },
  growth: {
    giftStatus: () => ['growth', 'gift-status'] as const,
    myDiscountCodes: () => ['growth', 'my-discount-codes'] as const,
  },
} as const
