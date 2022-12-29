/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as T from "@fp-ts/data/These"
import * as AH from "@fp-ts/schema/annotation/ArbitraryHooks"
import * as DH from "@fp-ts/schema/annotation/DecoderHooks"
import * as EH from "@fp-ts/schema/annotation/EncoderHooks"
import * as GH from "@fp-ts/schema/annotation/GuardHooks"
import * as PH from "@fp-ts/schema/annotation/PrettyHooks"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as D from "@fp-ts/schema/Decoder"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const guard = <K, V>(key: Guard<K>, value: Guard<V>): Guard<ReadonlyMap<K, V>> =>
  I.makeGuard(
    readonlyMap(key, value),
    (u): u is ReadonlyMap<K, V> =>
      u instanceof Map && Array.from(u.entries()).every(([k, v]) => key.is(k) && value.is(v))
  )

const decoder = <K, V>(
  key: Decoder<unknown, K>,
  value: Decoder<unknown, V>
): Decoder<unknown, ReadonlyMap<K, V>> =>
  I.makeDecoder(
    readonlyMap(key, value),
    (i) =>
      pipe(
        D.decoderFor(I.array(I.tuple(key, value))).decode(i),
        T.map((as) => new Map(as))
      )
  )

const encoder = <K, V>(
  key: Encoder<unknown, K>,
  value: Encoder<unknown, V>
): Encoder<unknown, ReadonlyMap<K, V>> =>
  I.makeEncoder(
    readonlyMap(key, value),
    (map) => Array.from(map.entries()).map(([k, v]) => [key.encode(k), value.encode(v)])
  )

const arbitrary = <K, V>(key: Arbitrary<K>, value: Arbitrary<V>): Arbitrary<ReadonlyMap<K, V>> =>
  I.makeArbitrary(
    readonlyMap(key, value),
    (fc) => fc.array(fc.tuple(key.arbitrary(fc), value.arbitrary(fc))).map((as) => new Map(as))
  )

const pretty = <K, V>(key: Pretty<K>, value: Pretty<V>): Pretty<ReadonlyMap<K, V>> =>
  I.makePretty(
    readonlyMap(key, value),
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
    I.struct({}),
    {
      [DH.TypeAliasHookId]: DH.typeAliasHook(decoder),
      [GH.TypeAliasHookId]: GH.typeAliasHook(guard),
      [EH.TypeAliasHookId]: EH.typeAliasHook(encoder),
      [PH.TypeAliasHookId]: PH.typeAliasHook(pretty),
      [AH.TypeAliasHookId]: AH.typeAliasHook(arbitrary)
    }
  )
