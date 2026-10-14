/**
 * Serialization metadata for atoms that participate in hydration.
 *
 * `serializable` attaches a stable key and a JSON codec to an atom. Hydration
 * uses that metadata to encode the current value and restore it in another
 * registry.
 *
 * @stability unstable
 * @since 4.0.0
 */
import { dual } from "../Function.ts"
import { getStackTraceLimit } from "../internal/stackTraceLimit.ts"
import * as Schema from "../Schema.ts"
import { type Atom, type Serializable, SerializableTypeId, type Type } from "./Atom.ts"

/**
 * Attaches serialization metadata to an atom using a schema and stable key.
 *
 * **Details**
 *
 * The schema is converted to a JSON codec for synchronous encode/decode, and the
 * key is also used as the atom label when the atom does not already have one.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const serializable: {
  <R extends Atom<any>, S extends Schema.ConstraintCodec<Type<R>, any>>(options: {
    readonly key: string
    readonly schema: S
  }): (self: R) => R & Serializable<S>
  <R extends Atom<any>, S extends Schema.ConstraintCodec<Type<R>, any>>(self: R, options: {
    readonly key: string
    readonly schema: S
  }): R & Serializable<S>
} = dual(2, <R extends Atom<any>, A, I>(self: R, options: {
  readonly key: string
  readonly schema: Schema.ConstraintCodec<A, I>
}): R & Serializable<any> => {
  const codecJson = Schema.toCodecJson(options.schema)
  return Object.assign(Object.create(Object.getPrototypeOf(self)), {
    ...self,
    label: self.label ?? [options.key, getStackTraceLimit() === 0 ? "" : new Error().stack?.split("\n")[5] ?? ""],
    [SerializableTypeId]: {
      key: options.key,
      encode: Schema.encodeSync(codecJson),
      decode: Schema.decodeSync(codecJson)
    }
  })
})
