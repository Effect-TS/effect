// tracing: off

import type { Refinement } from "@effect-ts/system/Function"
import type * as fc from "fast-check"

import type * as Th from "../These"
import type { AnyError, CompositionE, NamedE, NextE, PrevE, RefinementE } from "./error"
import type { ApiSelfType, Schema, SelfApi } from "./schema"
import {
  SchemaArbitrary,
  SchemaCompose,
  SchemaConstructor,
  SchemaEncoder,
  SchemaGuard,
  SchemaIdentified,
  SchemaIdentity,
  SchemaMapApi,
  SchemaMapConstructorError,
  SchemaMapParserError,
  SchemaNamed,
  SchemaParser,
  SchemaRecursive,
  SchemaRefinement
} from "./schema"

export function opaque<Shape>() {
  return <ConstructorInput, ConstructorError, ParserInput, ParserError, Encoded, Api>(
    schema: Schema<
      ParserInput,
      ParserError,
      Shape,
      ConstructorInput,
      ConstructorError,
      Shape,
      Encoded,
      Api
    >
  ): Schema<
    ParserInput,
    ParserError,
    Shape,
    ConstructorInput,
    ConstructorError,
    Shape,
    Encoded,
    Api & ApiSelfType<Shape>
  > => schema as any
}

export function recursive<
  ParserInput,
  ParsedShape,
  ConstructorInput,
  ConstructedShape extends ParsedShape,
  Encoded,
  ParserError = AnyError,
  ConstructorError = AnyError
>(
  f: (
    _: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      {}
    >
  ) => Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    {}
  >
): Schema<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape,
  Encoded,
  {}
> {
  return new SchemaRecursive(f)
}

export function named<Name extends string>(name: Name) {
  return <
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api
  >(
    self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >
  ): Schema<
    ParserInput,
    NamedE<Name, ParserError>,
    ParsedShape,
    ConstructorInput,
    NamedE<Name, ConstructorError>,
    ConstructedShape,
    Encoded,
    Api
  > => new SchemaNamed(self, name)
}

export function identity<A>(
  guard: (_: unknown) => _ is A
): Schema<A, never, A, A, never, A, A, {}> {
  return new SchemaIdentity(guard)
}

export function constructor<
  NewConstructorInput,
  NewConstructorError,
  NewConstructedShape extends ConstructedShape,
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
>(f: (_: NewConstructorInput) => Th.These<NewConstructorError, NewConstructedShape>) {
  return (
    self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >
  ): Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    NewConstructorInput,
    NewConstructorError,
    NewConstructedShape,
    Encoded,
    SelfApi<Api>
  > => new SchemaConstructor(self, f)
}

export function constructor_<
  NewConstructorInput,
  NewConstructorError,
  NewConstructedShape extends ConstructedShape,
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
>(
  self: Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >,
  f: (_: NewConstructorInput) => Th.These<NewConstructorError, NewConstructedShape>
): Schema<
  ParserInput,
  ParserError,
  ParsedShape,
  NewConstructorInput,
  NewConstructorError,
  NewConstructedShape,
  Encoded,
  SelfApi<Api>
> {
  return new SchemaConstructor(self, f)
}

export function parser<
  NewParserInput,
  NewParserError,
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
>(f: (_: NewParserInput) => Th.These<NewParserError, ParsedShape>) {
  return (
    self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >
  ): Schema<
    NewParserInput,
    NewParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    SelfApi<Api>
  > => new SchemaParser(self, f)
}

export function parser_<
  NewParserInput,
  NewParserError,
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
>(
  self: Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >,
  f: (_: NewParserInput) => Th.These<NewParserError, ParsedShape>
): Schema<
  NewParserInput,
  NewParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape,
  Encoded,
  SelfApi<Api>
> {
  return new SchemaParser(self, f)
}

export function arbitrary<A extends ParsedShape, ParsedShape>(
  f: (_: typeof fc) => fc.Arbitrary<A>
) {
  return <
    ParserInput,
    ParserError,
    ConstructorInput,
    ConstructorError,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api
  >(
    self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >
  ): Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    SelfApi<Api>
  > => new SchemaArbitrary(self, f) as any
}

export function arbitrary_<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
>(
  self: Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >,
  f: (_: typeof fc) => fc.Arbitrary<ParsedShape>
): Schema<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape,
  Encoded,
  SelfApi<Api>
> {
  return new SchemaArbitrary(self, f)
}

export function encoder<ParsedShape, A>(f: (_: ParsedShape) => A) {
  return <
    ParserInput,
    ParserError,
    ConstructorInput,
    ConstructorError,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api
  >(
    self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >
  ): Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    A,
    SelfApi<Api>
  > => new SchemaEncoder(self, f)
}

export function encoder_<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api,
  A
>(
  self: Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >,
  f: (_: ParsedShape) => A
): Schema<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape,
  A,
  SelfApi<Api>
> {
  return new SchemaEncoder(self, f)
}

export function refine<E, NewParsedShape extends ParsedShape, ParsedShape>(
  refinement: Refinement<ParsedShape, NewParsedShape>,
  error: (value: ParsedShape) => E
): <
  ParserInput,
  ParserError,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
>(
  self: Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >
) => Schema<
  ParserInput,
  CompositionE<PrevE<ParserError> | NextE<RefinementE<E>>>,
  NewParsedShape,
  ConstructorInput,
  CompositionE<PrevE<ConstructorError> | NextE<RefinementE<E>>>,
  ConstructedShape & NewParsedShape,
  Encoded,
  SelfApi<Api>
> {
  return (self) => new SchemaRefinement(self, refinement, error)
}

export function compose_<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api,
  ThatParserError,
  ThatParsedShape,
  ThatConstructorError,
  ThatConstructedShape extends ThatParsedShape,
  ThatEncoded,
  ThatApi
>(
  self: Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >,
  that: Schema<
    ParsedShape,
    ThatParserError,
    ThatParsedShape,
    ConstructedShape,
    ThatConstructorError,
    ThatConstructedShape,
    ThatEncoded,
    ThatApi
  >
): Schema<
  ParserInput,
  CompositionE<PrevE<ParserError> | NextE<ThatParserError>>,
  ThatParsedShape,
  ConstructorInput,
  CompositionE<PrevE<ConstructorError> | NextE<ThatConstructorError>>,
  ThatConstructedShape,
  ThatEncoded,
  { Self: Api; That: ThatApi }
> {
  return new SchemaCompose(self, that)
}

export function compose<
  ParsedShape,
  ConstructedShape extends ParsedShape & ThatConstructorInput,
  ThatParserError,
  ThatParsedShape,
  ThatConstructorInput,
  ThatConstructorError,
  ThatConstructedShape extends ThatParsedShape,
  ThatEncoded,
  ThatApi
>(
  that: Schema<
    ParsedShape,
    ThatParserError,
    ThatParsedShape,
    ThatConstructorInput,
    ThatConstructorError,
    ThatConstructedShape,
    ThatEncoded,
    ThatApi
  >
) {
  return <ParserInput, ParserError, ConstructorInput, ConstructorError, Encoded, Api>(
    self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >
  ): Schema<
    ParserInput,
    CompositionE<PrevE<ParserError> | NextE<ThatParserError>>,
    ThatParsedShape,
    ConstructorInput,
    CompositionE<PrevE<ConstructorError> | NextE<ThatConstructorError>>,
    ThatConstructedShape,
    ThatEncoded,
    { Self: Api; That: ThatApi }
  > => new SchemaCompose(self, that)
}

export function mapParserError<E, E1>(f: (e: E) => E1) {
  return <
    ParserInput,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api
  >(
    self: Schema<
      ParserInput,
      E,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >
  ): Schema<
    ParserInput,
    E1,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    SelfApi<Api>
  > => new SchemaMapParserError(self, f)
}

export function mapConstructorError<E, E1>(f: (e: E) => E1) {
  return <
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api
  >(
    self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      E,
      ConstructedShape,
      Encoded,
      Api
    >
  ): Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    E1,
    ConstructedShape,
    Encoded,
    SelfApi<Api>
  > => new SchemaMapConstructorError(self, f)
}

export function mapApi<E, E1>(f: (e: E) => E1) {
  return <
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape extends ParsedShape,
    Encoded
  >(
    self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      E
    >
  ): Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    E1
  > => new SchemaMapApi(self, f)
}

export function identified_<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api,
  Meta
>(
  self: Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >,
  identifier: symbol,
  meta: Meta
): Schema<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape,
  Encoded,
  Api
> {
  return new SchemaIdentified(self, identifier, meta)
}

export function identified<Api, Meta>(
  identifier: symbol,
  meta: Meta
): <
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded
>(
  self: Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >
) => Schema<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape,
  Encoded,
  Api
> {
  return (self) => new SchemaIdentified(self, identifier, meta)
}

export function guard_<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
>(
  self: Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >,
  guard: (u: unknown) => u is ParsedShape
): Schema<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape,
  Encoded,
  Api
> {
  return new SchemaGuard(self, guard)
}

export function guard<ParsedShape>(
  guard: (u: unknown) => u is ParsedShape
): <
  ParserInput,
  ParserError,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
>(
  self: Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >
) => Schema<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape,
  Encoded,
  Api
> {
  return (self) => new SchemaGuard(self, guard)
}
