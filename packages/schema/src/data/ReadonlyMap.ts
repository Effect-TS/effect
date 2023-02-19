/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/core/Function"
import { IdentifierId } from "@fp-ts/schema/annotation/AST"
import * as H from "@fp-ts/schema/annotation/Hook"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Parser"
import * as PR from "@fp-ts/schema/ParseResult"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const isMap = (u: unknown): u is Map<unknown, unknown> => u instanceof Map

const parser = <K, V>(
  key: P.Parser<K>,
  value: P.Parser<V>
): P.Parser<ReadonlyMap<K, V>> => {
  const items = P.decode(I.array(I.tuple(key, value)))
  const schema = readonlyMap(key, value)
  return I.makeParser(
    schema,
    (u, options) =>
      !isMap(u) ?
        PR.failure(PR.type(schema.ast, u)) :
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
      [IdentifierId]: "ReadonlyMap",
      [H.ParserHookId]: H.hook(parser),
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
