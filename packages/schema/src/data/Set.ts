/**
 * @since 1.0.0
 */
import type { Arbitrary } from "@fp-ts/codec/Arbitrary"
import type { Json } from "@fp-ts/codec/data/Json"
import * as DE from "@fp-ts/codec/DecodeError"
import type { Decoder } from "@fp-ts/codec/Decoder"
import type { Guard } from "@fp-ts/codec/Guard"
import * as I from "@fp-ts/codec/internal/common"
import * as P from "@fp-ts/codec/Provider"
import type { Schema } from "@fp-ts/codec/Schema"
import type { Show } from "@fp-ts/codec/Show"
import * as O from "@fp-ts/data/Option"
import * as T from "@fp-ts/data/These"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/Set")

/**
 * @since 1.0.0
 */
export const guard = <A>(item: Guard<A>): Guard<Set<A>> =>
  I.makeGuard(
    schema(item),
    (input): input is Set<A> => input instanceof Set && Array.from(input.values()).every(item.is)
  )

// TODO decoder

/**
 * @since 1.0.0
 */
export const jsonDecoder = <A>(item: Decoder<Json, A>): Decoder<Json, Set<A>> =>
  I.makeDecoder(schema(item), (json) => {
    if (!(Array.isArray(json))) {
      return I.fail(DE.notType("Array", json)) // TODO
    }
    const out: Set<unknown> = new Set()
    for (let i = 0; i < json.length; i++) {
      const t = item.decode(json[i])
      if (T.isLeft(t)) {
        return T.left(t.left)
      }
      out.add(t.right) // TODO handle both
    }
    return I.succeed(out as any)
  })

/**
 * @since 1.0.0
 */
export const arbitrary = <A>(item: Arbitrary<A>): Arbitrary<Set<A>> =>
  I.makeArbitrary(
    schema(item),
    (fc) => fc.array(item.arbitrary(fc)).map((as) => new Set(as))
  )

/**
 * @since 1.0.0
 */
export const show = <A>(item: Show<A>): Show<Set<A>> =>
  I.makeShow(
    schema(item),
    (a) => `Set([${Array.from(a.values()).map(item.show).join(", ")}])`
  )

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: guard,
  [I.ArbitraryId]: arbitrary,
  [I.ShowId]: show,
  [I.JsonDecoderId]: jsonDecoder
})

/**
 * @since 1.0.0
 */
export const schema = <A>(item: Schema<A>): Schema<Set<A>> =>
  I.declareSchema(id, O.none, Provider, item)
