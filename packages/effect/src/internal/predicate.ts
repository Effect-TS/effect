/**
 * Data-first `Predicate.hasProperty`.
 *
 * The guards of the runtime data types call this directly, so bundles that only
 * run an effect do not carry `Function.dual` for the curried form.
 *
 * @internal
 */
export const hasProperty = <P extends PropertyKey>(self: unknown, property: P): self is { [K in P]: unknown } =>
  ((typeof self === "object" && self !== null) || typeof self === "function") && (property in self)
