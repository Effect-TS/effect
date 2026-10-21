export const mockFetch = (
  fetch: (...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>
): typeof globalThis.fetch => Object.assign(fetch, { preconnect: () => {} })
