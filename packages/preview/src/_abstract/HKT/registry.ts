/**
 * Typelevel Map: URI => Type
 */
export interface URItoKind<
  // Encode fixed parameters for derived instances
  TL0,
  TL1,
  TL2,
  TL3,
  // Encode generic keys
  K,
  // Encode nominal (string based) keys
  NK extends string,
  // Encode state input
  SI,
  // Encode state output
  SO,
  // Encode generic contravariant (used to encode async/sync)
  X,
  // Encode contravariant input
  I,
  // Encode invariant state
  S,
  // Encode contravariant input
  Env,
  // Encode covariant error
  Err,
  // Encode covariant output
  Out
> {}

/**
 * URI of the Typelevel Map
 */
export type URIS = keyof URItoKind<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>
