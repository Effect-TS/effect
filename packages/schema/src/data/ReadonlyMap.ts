/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as H from "@fp-ts/schema/annotation/HookAnnotation"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as I from "@fp-ts/schema/internal/common"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const isMap = (u: unknown): u is Map<unknown, unknown> =>
  typeof u === "object" && typeof u !== null && u instanceof Map

const decoder = <K, V>(
  key: D.Decoder<unknown, K>,
  value: D.Decoder<unknown, V>
): D.Decoder<unknown, ReadonlyMap<K, V>> => {
  const items = D.decode(I.array(I.tuple(key, value)))
  return I.makeDecoder(
    readonlyMap(key, value),
    (u, options) =>
      !isMap(u) ?
        DE.failure(DE.type("Map<unknown, unknown>", u)) :
        pipe(
          Array.from(u.entries()),
          (us) => items(us, options),
          I.map((as) => new Map(as))
        )
  )
}

const arbitrary = <K, V>(key: Arbitrary<K>, value: Arbitrary<V>): Arbitrary<ReadonlyMap<K, V>> =>
  I.makeArbitrary(
    fromEntries(key, value),
    (fc) => fc.array(fc.tuple(key.arbitrary(fc), value.arbitrary(fc))).map((as) => new Map(as))
  )

const pretty = <K, V>(key: Pretty<K>, value: Pretty<V>): Pretty<ReadonlyMap<K, V>> =>
  I.makePretty(
    fromEntries(key, value),
    (map) =>
      `new Map([${
        Array.from(map.entries())
          .map(([k, v]) => `[${key.pretty(k)}, ${value.pretty(v)}]`)
          .join(", ")
      }])`
  )

/**
 * @since 1.0.0
 */
export const readonlyMap = <K, V>(key: Schema<K>, value: Schema<V>): Schema<ReadonlyMap<K, V>> =>
  I.typeAlias(
    [key, value],
    I.struct({
      size: I.number
    }),
    {
      [H.DecoderHookId]: H.hook(decoder),
      [H.PrettyHookId]: H.hook(pretty),
      [H.ArbitraryHookId]: H.hook(arbitrary)
    }
  )

/**
 * @since 1.0.0
 */
export const fromEntries = <K, V>(key: Schema<K>, value: Schema<V>): Schema<ReadonlyMap<K, V>> =>
  pipe(
    I.array(I.tuple(key, value)),
    I.transform(
      readonlyMap(key, value),
      (as) => new Map(as),
      (map) => Array.from(map.entries())
    )
  )
