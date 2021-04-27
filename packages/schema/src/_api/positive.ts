// tracing: off

import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"

export interface PositiveBrand {
  readonly Positive: unique symbol
}

export type Positive = number & PositiveBrand

export const positiveIdentifier = Symbol.for("@effect-ts/schema/ids/positive")

export function positive<
  ParserInput,
  ParserError,
  ParsedShape extends number,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
>(
  self: S.Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape & number,
    Encoded,
    Api
  >
): S.Schema<
  ParserInput,
  S.CompositionE<S.PrevE<ParserError> | S.NextE<S.RefinementE<S.LeafE<S.PositiveE>>>>,
  ParsedShape & PositiveBrand,
  ConstructorInput,
  S.CompositionE<
    S.PrevE<ConstructorError> | S.NextE<S.RefinementE<S.LeafE<S.PositiveE>>>
  >,
  ConstructedShape & PositiveBrand,
  Encoded,
  Api
> {
  return pipe(
    self,
    S.refine(
      (n): n is ParsedShape & Positive => n >= 0,
      (n) => S.leafE(S.positiveE(n))
    ),
    S.mapApi((_) => _.Self),
    S.identified(positiveIdentifier, { self })
  )
}
