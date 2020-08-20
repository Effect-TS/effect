export interface URItoErr<TL0, TL1, TL2, TL3, E> {}

export type ErrFor<F, TL0, TL1, TL2, TL3, E> = F extends keyof URItoErr<
  any,
  any,
  any,
  any,
  any
>
  ? URItoErr<TL0, TL1, TL2, TL3, E>[F]
  : E
