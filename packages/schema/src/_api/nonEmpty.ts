// tracing: off

import { pipe } from "@effect-ts/core/Function"

import type * as S from "../_schema"
import { leafE, nonEmptyE } from "../_schema/error"
import { mapApi, refine } from "../_schema/primitives"

export interface NonEmptyBrand {
  readonly NonEmpty: unique symbol
}

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
    refine(
      (n): n is ParsedShape & NonEmptyBrand => n.length > 0,
      (n) => leafE(nonEmptyE(n))
    ),
    mapApi((_) => _.Self)
  )
}
