export const GuardId: unique symbol = Symbol.for(
  "@fp-ts/codec/interpreter/Guard"
)

export type GuardId = typeof GuardId

export const ArbitraryId: unique symbol = Symbol.for(
  "@fp-ts/codec/interpreter/Arbitrary"
)

export type ArbitraryId = typeof ArbitraryId

export const ShowId: unique symbol = Symbol.for(
  "@fp-ts/codec/interpreter/Show"
)

export type ShowId = typeof ShowId

export const JsonDecoderId: unique symbol = Symbol.for(
  "@fp-ts/codec/interpreter/JsonDecoderInterpreter"
)

export type JsonDecoderId = typeof JsonDecoderId

export const JsonEncoderId: unique symbol = Symbol.for(
  "@fp-ts/codec/interpreter/JsonEncoderInterpreter"
)

export type JsonEncoderId = typeof JsonEncoderId
