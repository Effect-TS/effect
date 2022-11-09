/**
 * @since 1.0.0
 */

import type { Codec } from "@fp-ts/codec/Codec"
import type { Decoder } from "@fp-ts/codec/Decoder"
import * as D from "@fp-ts/codec/Decoder"
import type { DSL } from "@fp-ts/codec/DSL"
import type { Schema } from "@fp-ts/codec/Schema"
import type * as C from "@fp-ts/data/Context"

/**
 * @since 1.0.0
 */
export type Json =
  | boolean
  | number
  | string
  | null
  | ReadonlyArray<Json>
  | {
    readonly [key: string]: Json
  }

const decoderFor = <P>(_ctx: C.Context<P>) => {
  const f = (dsl: DSL): Decoder<Json, any, any> => {
    switch (dsl._tag) {
      case "StringDSL":
        return D.string as any
      case "NumberDSL":
        return D.number as any
      case "BooleanDSL":
        return D.boolean as any
      case "LiteralDSL":
        return D.literal(dsl.literal) as any
    }
    throw new Error(`Unhandled ${dsl._tag}`)
  }
  return <E, A>(schema: Schema<P, E, A>): Decoder<Json, E, A> => f(schema)
}

/**
 * @since 1.0.0
 */
export const JsonCodec: Codec<Json> = {
  decoderFor,
  encoderFor: null as any
}
