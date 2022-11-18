export const GuardId: unique symbol = Symbol.for(
  "@fp-ts/codec/Guard"
)

export type GuardId = typeof GuardId

export const ArbitraryId: unique symbol = Symbol.for(
  "@fp-ts/codec/Arbitrary"
)

export type ArbitraryId = typeof ArbitraryId

export const ShowId: unique symbol = Symbol.for(
  "@fp-ts/codec/Show"
)

export type ShowId = typeof ShowId

export const JsonDecoderId: unique symbol = Symbol.for(
  "@fp-ts/codec/JsonDecoder"
)

export type JsonDecoderId = typeof JsonDecoderId

export const JsonEncoderId: unique symbol = Symbol.for(
  "@fp-ts/codec/JsonEncoder"
)

export type JsonEncoderId = typeof JsonEncoderId

export const DecoderId: unique symbol = Symbol.for(
  "@fp-ts/codec/Decoder"
)

export type DecoderId = typeof DecoderId
