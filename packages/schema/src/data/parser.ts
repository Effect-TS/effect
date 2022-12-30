/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as H from "@fp-ts/schema/annotation/TypeAliasHook"
import * as DE from "@fp-ts/schema/DecodeError"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const parse = <A, B>(
  to: Schema<B>,
  decode: Decoder<A, B>["decode"],
  encode: Encoder<A, B>["encode"]
): (from: Schema<A>) => Schema<B> => {
  const decoder = (self: Decoder<unknown, A>): Decoder<unknown, B> =>
    I.makeDecoder(to, (i) => pipe(self.decode(i), I.flatMap(decode)))

  const encoder = (self: Encoder<unknown, A>): Encoder<unknown, B> =>
    I.makeEncoder(to, (b) => self.encode(encode(b)))

  const schema = (from: Schema<A>): Schema<B> =>
    I.typeAlias([from], to, {
      [H.DecoderTypeAliasHookId]: H.typeAliasHook(decoder),
      [H.EncoderTypeAliasHookId]: H.typeAliasHook(encoder)
    })

  return schema
}

/**
 * @since 1.0.0
 */
export const parseString: (self: Schema<string>) => Schema<number> = parse(
  I.number,
  (s: string) => {
    if (s === "NaN") {
      return I.success(NaN)
    }
    if (s === "Infinity") {
      return I.success(Infinity)
    }
    if (s === "-Infinity") {
      return I.success(-Infinity)
    }
    const n = parseFloat(s)
    return isNaN(n) ?
      I.failure(DE.parse("string", "number", s)) :
      I.success(n)
  },
  String
)
