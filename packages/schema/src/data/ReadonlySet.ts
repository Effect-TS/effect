/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as T from "@fp-ts/data/These"
import { arbitraryAnnotation } from "@fp-ts/schema/annotation/ArbitraryAnnotation"
import { decoderInputAnnotation } from "@fp-ts/schema/annotation/DecoderInputAnnotation"
import { encoderAnnotation } from "@fp-ts/schema/annotation/EncoderAnnotation"
import { guardAnnotation } from "@fp-ts/schema/annotation/GuardAnnotation"
import { prettyAnnotation } from "@fp-ts/schema/annotation/PrettyAnnotation"
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
    schema(item),
    (u): u is Set<A> => u instanceof Set && Array.from(u.values()).every(item.is)
  )

const decoder = <A>(item: Decoder<unknown, A>): Decoder<unknown, ReadonlySet<A>> =>
  I.makeDecoder(
    schema(item),
    (i) => pipe(D.decoderFor(I.array(item)).decode(i), T.map((as) => new Set(as)))
  )

const encoder = <A>(item: Encoder<unknown, A>): Encoder<unknown, ReadonlySet<A>> =>
  I.makeEncoder(schema(item), (set) => Array.from(set).map(item.encode))

const arbitrary = <A>(item: Arbitrary<A>): Arbitrary<ReadonlySet<A>> =>
  I.makeArbitrary(schema(item), (fc) => fc.array(item.arbitrary(fc)).map((as) => new Set(as)))

const pretty = <A>(item: Pretty<A>): Pretty<ReadonlySet<A>> =>
  I.makePretty(
    schema(item),
    (set) => `new Set([${Array.from(set.values()).map((a) => item.pretty(a)).join(", ")}])`
  )

/**
 * @since 1.0.0
 */
export const schema = <A>(item: Schema<A>): Schema<ReadonlySet<A>> =>
  I.typeAlias(
    [item],
    I.struct({}),
    [
      decoderInputAnnotation(decoder),
      guardAnnotation(guard),
      encoderAnnotation(encoder),
      prettyAnnotation(pretty),
      arbitraryAnnotation(arbitrary)
    ]
  )
