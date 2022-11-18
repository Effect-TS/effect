export const CodecInterpreterId: unique symbol = Symbol.for(
  "@fp-ts/codec/interpreter/CodecInterpreter"
)

export type CodecInterpreterId = typeof CodecInterpreterId

export const GuardInterpreterId: unique symbol = Symbol.for(
  "@fp-ts/codec/interpreter/Guard"
)

export type GuardInterpreterId = typeof GuardInterpreterId

export const ArbitraryInterpreterId: unique symbol = Symbol.for(
  "@fp-ts/codec/interpreter/Arbitrary"
)

export type ArbitraryInterpreterId = typeof ArbitraryInterpreterId

export const ShowInterpreterId: unique symbol = Symbol.for(
  "@fp-ts/codec/interpreter/Show"
)

export type ShowInterpreterIdId = typeof ShowInterpreterId

export const JsonDecoderInterpreterId: unique symbol = Symbol.for(
  "@fp-ts/codec/interpreter/JsonDecoderInterpreter"
)

export type JsonDecoderInterpreterId = typeof JsonDecoderInterpreterId

export const JsonEncoderInterpreterId: unique symbol = Symbol.for(
  "@fp-ts/codec/interpreter/JsonEncoderInterpreter"
)

export type JsonEncoderInterpreterId = typeof JsonEncoderInterpreterId
