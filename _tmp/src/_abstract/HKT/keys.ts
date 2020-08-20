export interface URItoKeys<TL0, TL1, TL2, TL3, K, NK extends string> {}

export type KeyFor<
  F,
  TL0,
  TL1,
  TL2,
  TL3,
  K,
  NK extends string
> = F extends keyof URItoKeys<any, any, any, any, any, any>
  ? URItoKeys<TL0, TL1, TL2, TL3, K, NK>[F]
  : never
