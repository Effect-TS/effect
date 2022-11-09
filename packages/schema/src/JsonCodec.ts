/**
 * @since 1.0.0
 */

import type { Codec } from "@fp-ts/codec/Codec"
import type { Decoder } from "@fp-ts/codec/Decoder"
import * as D from "@fp-ts/codec/Decoder"
import type { Meta } from "@fp-ts/codec/Meta"
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
  const f = (meta: Meta): Decoder<Json, any, any> => {
    switch (meta._tag) {
      case "String":
        return D.string
      case "Number":
        return D.number
      case "Boolean":
        return D.boolean
      case "Literal":
        return D.literal(meta.literal)
    }
    throw new Error(`Unhandled ${meta._tag}`)
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
