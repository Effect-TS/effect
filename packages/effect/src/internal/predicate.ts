import { isObjectKeyword } from "../Predicate.ts"

/**
 * Data-first `Predicate.hasProperty` for the runtime modules, which never use
 * the curried form. Calling it directly keeps `dual` out of bundles that only
 * run effects.
 *
 * @internal
 */
export const hasProperty = <P extends PropertyKey>(self: unknown, property: P): self is { [K in P]: unknown } =>
  isObjectKeyword(self) && (property in self)
