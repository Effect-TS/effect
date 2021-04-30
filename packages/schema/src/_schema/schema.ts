// tracing: off

import type { Refinement } from "@effect-ts/core/Function"
import type * as fc from "fast-check"

import type * as Th from "../These"
import type { CompositionE, NamedE, NextE, PrevE, RefinementE } from "./error"

export const SchemaSym = Symbol()
export type SchemaSym = typeof SchemaSym

/**
 * A `Schema` is a functional representation of a data model of type `ParsedShape`
 * that can be:
 *
 * 1) parsed from a `ParsedShape` starting from an input of type `ParserInput`
 *    maybe failing for a reason `ParserError`
 *
 * 2) constructed smartly as `ConstructedShape` that extends `ParsedShape`
 *    starting from an input of type `ConstructorInput`
 *
 * 3) encoded into an `Encoded` value
 *
 * 4) interacted with via `Api`
 */
export abstract class Schema<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
> {
  readonly [SchemaSym]: SchemaSym = SchemaSym
  readonly _ParserInput!: (_: ParserInput) => void
  readonly _ParserError!: () => ParserError
  readonly _ParsedShape!: () => ParsedShape
  readonly _ConstructorInput!: (_: ConstructorInput) => void
  readonly _ConstructorError!: () => ConstructorError
  readonly _ConstructedShape!: () => ConstructedShape
  readonly _Encoded!: () => Encoded
  abstract readonly Api: Api

  readonly [">>>"] = <
    ThatParserError,
    ThatParsedShape,
    ThatConstructorError,
    ThatConstructedShape extends ThatParsedShape,
    ThatEncoded,
    ThatApi
  >(
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
    {
      Self: Api
      That: ThatApi
    }
  > => new SchemaCompose(this, that)
}

export type SchemaAny = Schema<any, any, any, any, any, any, any, any>
export type SchemaUPI = Schema<unknown, any, any, any, any, any, any, any>

export interface ApiSelfType<AS = unknown> {
  _AS: AS
}

export type GetApiSelfType<T extends ApiSelfType<unknown>, D> = unknown extends T["_AS"]
  ? D
  : T["_AS"]

export const SchemaContinuationSymbol = Symbol()
export type SchemaContinuationSymbol = typeof SchemaContinuationSymbol

export interface HasContinuation {
  readonly [SchemaContinuationSymbol]: Schema<
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown
  >
}

export function hasContinuation<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
>(
  schema: Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >
): schema is Schema<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape,
  Encoded,
  Api
> &
  HasContinuation {
  return SchemaContinuationSymbol in schema
}

export type ParserInputOf<
  X extends Schema<any, any, any, any, any, any, any, any>
> = Parameters<X["_ParserInput"]>[0]

export type ParserErrorOf<
  X extends Schema<any, any, any, any, any, any, any, any>
> = ReturnType<X["_ParserError"]>

export type ConstructorInputOf<
  X extends Schema<any, any, any, any, any, any, any, any>
> = Parameters<X["_ConstructorInput"]>[0]

export type ConstructorErrorOf<
  X extends Schema<any, any, any, any, any, any, any, any>
> = ReturnType<X["_ConstructorError"]>

export type EncodedOf<
  X extends Schema<any, any, any, any, any, any, any, any>
> = ReturnType<X["_Encoded"]>

export type ParsedShapeOf<
  X extends Schema<any, any, any, any, any, any, any, any>
> = ReturnType<X["_ParsedShape"]>

export type ConstructedShapeOf<
  X extends Schema<any, any, any, any, any, any, any, any>
> = ReturnType<X["_ConstructedShape"]>

export type ApiOf<X extends Schema<any, any, any, any, any, any, any, any>> = X["Api"]

export interface SelfApi<Api> {
  Self: Api
}

export class SchemaIdentity<A> extends Schema<A, never, A, A, never, A, A, {}> {
  readonly Api = {}

  constructor(readonly guard: (_: unknown) => _ is A) {
    super()
  }
}

export class SchemaConstructor<
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
  >
  extends Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    NewConstructorInput,
    NewConstructorError,
    NewConstructedShape,
    Encoded,
    SelfApi<Api>
  >
  implements HasContinuation {
  readonly Api = { Self: this.self.Api };
  readonly [SchemaContinuationSymbol]: SchemaAny
  constructor(
    readonly self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >,
    readonly of: (
      i: NewConstructorInput
    ) => Th.These<NewConstructorError, NewConstructedShape>
  ) {
    super()
    this[SchemaContinuationSymbol] = self
  }
}

export class SchemaParser<
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
  >
  extends Schema<
    NewParserInput,
    NewParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    SelfApi<Api>
  >
  implements HasContinuation {
  readonly Api = { Self: this.self.Api };
  readonly [SchemaContinuationSymbol]: SchemaAny
  constructor(
    readonly self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >,
    readonly parser: (i: NewParserInput) => Th.These<NewParserError, ParsedShape>
  ) {
    super()
    this[SchemaContinuationSymbol] = self
  }
}

export class SchemaArbitrary<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api
  >
  extends Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    SelfApi<Api>
  >
  implements HasContinuation {
  readonly Api = { Self: this.self.Api };
  readonly [SchemaContinuationSymbol]: SchemaAny
  constructor(
    readonly self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >,
    readonly arbitrary: (_: typeof fc) => fc.Arbitrary<ParsedShape>
  ) {
    super()
    this[SchemaContinuationSymbol] = self
  }
}

export class SchemaEncoder<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api,
    Encoded2
  >
  extends Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded2,
    SelfApi<Api>
  >
  implements HasContinuation {
  readonly Api = { Self: this.self.Api };
  readonly [SchemaContinuationSymbol]: SchemaAny
  constructor(
    readonly self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >,
    readonly encoder: (_: ParsedShape) => Encoded2
  ) {
    super()
    this[SchemaContinuationSymbol] = self
  }
}

export class SchemaRefinement<
  E,
  NewParsedShape extends ParsedShape,
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded,
  Api
> extends Schema<
  ParserInput,
  CompositionE<PrevE<ParserError> | NextE<RefinementE<E>>>,
  NewParsedShape,
  ConstructorInput,
  CompositionE<PrevE<ConstructorError> | NextE<RefinementE<E>>>,
  ConstructedShape & NewParsedShape,
  Encoded,
  SelfApi<Api>
> {
  readonly Api = { Self: this.self.Api }
  constructor(
    readonly self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >,
    readonly refinement: Refinement<ParsedShape, NewParsedShape>,
    readonly error: (value: ParsedShape) => E
  ) {
    super()
  }
}

export class SchemaCompose<
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
> extends Schema<
  ParserInput,
  CompositionE<PrevE<ParserError> | NextE<ThatParserError>>,
  ThatParsedShape,
  ConstructorInput,
  CompositionE<PrevE<ConstructorError> | NextE<ThatConstructorError>>,
  ThatConstructedShape,
  ThatEncoded,
  { Self: Api; That: ThatApi }
> {
  readonly Api = { Self: this.self.Api, That: this.that.Api }
  constructor(
    readonly self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >,
    readonly that: Schema<
      ParsedShape,
      ThatParserError,
      ThatParsedShape,
      ConstructedShape,
      ThatConstructorError,
      ThatConstructedShape,
      ThatEncoded,
      ThatApi
    >
  ) {
    super()
  }
}

export class SchemaMapParserError<
    ParserInput,
    ParserError,
    ParserError2,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api
  >
  extends Schema<
    ParserInput,
    ParserError2,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    SelfApi<Api>
  >
  implements HasContinuation {
  readonly Api = { Self: this.self.Api };

  readonly [SchemaContinuationSymbol]: SchemaAny = this.self

  constructor(
    readonly self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >,
    readonly mapError: (_: ParserError) => ParserError2
  ) {
    super()
  }
}

export class SchemaMapConstructorError<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructorError2,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api
  >
  extends Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError2,
    ConstructedShape,
    Encoded,
    SelfApi<Api>
  >
  implements HasContinuation {
  readonly Api = { Self: this.self.Api };

  readonly [SchemaContinuationSymbol]: SchemaAny = this.self

  constructor(
    readonly self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >,
    readonly mapError: (_: ConstructorError) => ConstructorError2
  ) {
    super()
  }
}

export class SchemaMapApi<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api,
    Api2
  >
  extends Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api2
  >
  implements HasContinuation {
  readonly Api = this.mapApi(this.self.Api);

  readonly [SchemaContinuationSymbol]: SchemaAny = this.self

  constructor(
    readonly self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >,
    readonly mapApi: (_: Api) => Api2
  ) {
    super()
  }
}

export class SchemaNamed<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api,
    Name extends string
  >
  extends Schema<
    ParserInput,
    NamedE<Name, ParserError>,
    ParsedShape,
    ConstructorInput,
    NamedE<Name, ConstructorError>,
    ConstructedShape,
    Encoded,
    Api
  >
  implements HasContinuation {
  readonly Api = this.self.Api;

  readonly [SchemaContinuationSymbol]: SchemaAny = this.self

  constructor(
    readonly self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >,
    readonly name: Name
  ) {
    super()
  }
}

export class SchemaRecursive<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape extends ParsedShape,
  Encoded
> extends Schema<
  ParserInput,
  ParserError,
  ParsedShape,
  ConstructorInput,
  ConstructorError,
  ConstructedShape,
  Encoded,
  {}
> {
  readonly Api = {}

  constructor(
    readonly self: (
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
  ) {
    super()
  }
}

export class SchemaIdentified<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api,
    Meta
  >
  extends Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >
  implements HasContinuation {
  readonly Api = this.self.Api;

  readonly [SchemaContinuationSymbol]: SchemaAny = this.self

  constructor(
    readonly self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >,
    readonly identifier: symbol,
    readonly meta: Meta
  ) {
    super()
  }
}

export class SchemaGuard<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape extends ParsedShape,
    Encoded,
    Api
  >
  extends Schema<
    ParserInput,
    ParserError,
    ParsedShape,
    ConstructorInput,
    ConstructorError,
    ConstructedShape,
    Encoded,
    Api
  >
  implements HasContinuation {
  readonly Api = this.self.Api;

  readonly [SchemaContinuationSymbol]: SchemaAny = this.self

  constructor(
    readonly self: Schema<
      ParserInput,
      ParserError,
      ParsedShape,
      ConstructorInput,
      ConstructorError,
      ConstructedShape,
      Encoded,
      Api
    >,
    readonly guard: (u: unknown) => u is ParsedShape
  ) {
    super()
  }
}
