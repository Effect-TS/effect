// tracing: off

import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"

export interface NonEmptyBrand {
  readonly NonEmpty: unique symbol
}

export const nonEmptyIdentifier = Symbol.for("@effect-ts/schema/ids/nonEmpty")

export function nonEmpty<
  ParserInput,
  ParserError,
  ParsedShape extends { length: number },
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
    ConstructedShape,
    Encoded,
    Api
  >
): S.Schema<
  ParserInput,
  S.CompositionE<
    S.NextE<S.RefinementE<S.LeafE<S.NonEmptyE<ParsedShape>>>> | S.PrevE<ParserError>
  >,
  ParsedShape & NonEmptyBrand,
  ConstructorInput,
  S.CompositionE<
    | S.NextE<S.RefinementE<S.LeafE<S.NonEmptyE<ParsedShape>>>>
    | S.PrevE<ConstructorError>
  >,
  ConstructedShape & ParsedShape & NonEmptyBrand,
  Encoded,
  Api
> {
  return pipe(
    self,
    S.refine(
      (n): n is ParsedShape & NonEmptyBrand => n.length > 0,
      (n) => S.leafE(S.nonEmptyE(n))
    ),
    S.mapApi((_) => _.Self),
    S.identified(nonEmptyIdentifier, { self })
  )
}
