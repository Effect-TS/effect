export const isUnknownIndexSignature = (u: unknown): u is { readonly [_: string]: unknown } =>
  typeof u === "object" && u != null && !Array.isArray(u)

export const isUnknownArray = (u: unknown): u is ReadonlyArray<unknown> => Array.isArray(u)
