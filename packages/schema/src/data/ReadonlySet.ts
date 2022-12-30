/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as T from "@fp-ts/data/These"
import * as H from "@fp-ts/schema/annotation/TypeAliasHook"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as D from "@fp-ts/schema/Decoder"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const guard = <A>(item: Guard<A>): Guard<ReadonlySet<A>> =>
  I.makeGuard(
    readonlySet(item),
    (u): u is Set<A> => u instanceof Set && Array.from(u.values()).every(item.is)
  )

const decoder = <A>(item: Decoder<unknown, A>): Decoder<unknown, ReadonlySet<A>> =>
  I.makeDecoder(
    readonlySet(item),
    (i) => pipe(D.decoderFor(I.array(item)).decode(i), T.map((as) => new Set(as)))
  )

const encoder = <A>(item: Encoder<unknown, A>): Encoder<unknown, ReadonlySet<A>> =>
  I.makeEncoder(readonlySet(item), (set) => Array.from(set).map(item.encode))

const arbitrary = <A>(item: Arbitrary<A>): Arbitrary<ReadonlySet<A>> =>
  I.makeArbitrary(readonlySet(item), (fc) => fc.array(item.arbitrary(fc)).map((as) => new Set(as)))

const pretty = <A>(item: Pretty<A>): Pretty<ReadonlySet<A>> =>
  I.makePretty(
    readonlySet(item),
    (set) => `new Set([${Array.from(set.values()).map((a) => item.pretty(a)).join(", ")}])`
  )

/**
 * @since 1.0.0
 */
export const readonlySet = <A>(item: Schema<A>): Schema<ReadonlySet<A>> =>
  I.typeAlias(
    [item],
    I.struct({}),
    {
      [H.DecoderTypeAliasHookId]: H.typeAliasHook(decoder),
      [H.GuardTypeAliasHookId]: H.typeAliasHook(guard),
      [H.EncoderTypeAliasHookId]: H.typeAliasHook(encoder),
      [H.PrettyTypeAliasHookId]: H.typeAliasHook(pretty),
      [H.ArbitraryTypeAliasHookId]: H.typeAliasHook(arbitrary)
    }
  )
