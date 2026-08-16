export const keys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  conv: {
    list: () => ['conversations', 'list'] as const,
    detail: (id: string) => ['conversations', 'detail', id] as const,
  },
  credits: {
    balance: () => ['credits', 'balance'] as const,
    packages: () => ['credits', 'packages'] as const,
    quote: (credits: number) => ['credits', 'quote', credits] as const,
  },
  projects: { list: () => ['projects', 'list'] as const },
  discovery: {
    catalog: (outputType?: string, categoryId?: string, sort?: string) =>
      ['discovery', 'catalog', outputType ?? 'all', categoryId ?? 'all', sort ?? 'default'] as const,
    categories: () => ['discovery', 'categories'] as const,
    gallery: (projectId?: string) => ['discovery', 'gallery', projectId ?? 'all'] as const,
  },
  usage: {
    today: () => ['usage', 'today'] as const,
    history: (month: string) => ['usage', 'history', month] as const,
    budget: () => ['usage', 'budget'] as const,
    messageQuota: () => ['usage', 'message-quota'] as const,
    wallet: () => ['usage', 'wallet'] as const,
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
  anon: {
    status: () => ['anon-chat', 'status'] as const,
    conversation: (id: string) => ['anon-chat', 'conversation', id] as const,
  },
  anonDiscovery: {
    status: () => ['anon-discovery', 'status'] as const,
  },
} as const
