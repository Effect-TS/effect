/**
 * @since 1.0.0
 */
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Data from "effect/Data"
import type { Effect } from "effect/Effect"
import type { Either } from "effect/Either"
import { dual, identity } from "effect/Function"
import type { Option } from "effect/Option"

/**
 * @category models
 * @since 1.0.0
 */
export interface SchemaC<I, A, C> extends Schema.Schema<I, A> {
  (input: C): A
  readonly either: (input: C) => Either<ParseError, A>
  readonly effect: (input: C) => Effect<never, ParseError, A>
  readonly option: (input: C) => Option<A>
}

/**
 * @category combinators
 * @since 1.0.0
 */
export const withConstructor: {
  <A, C>(f: (input: C) => A): <I>(self: Schema.Schema<I, A>) => SchemaC<I, A, C>
  <I, A, C>(self: Schema.Schema<I, A>, f: (input: C) => A): SchemaC<I, A, C>
} = dual(
  2,
  <I, A, C>(
    self: Schema.Schema<I, A>,
    f: (input: C) => A
  ): SchemaC<I, A, C> => {
    const validate = Schema.validateSync(self)
    const validateEither = Schema.validateEither(self)
    const validateEffect = Schema.validate(self)
    const validateOption = Schema.validateOption(self)

    function make(input: C): A {
      return validate(f(input))
    }
    make.ast = self.ast
    make.either = function makeEither(input: C): Either<ParseError, A> {
      return validateEither(f(input))
    }
    make.effect = function makeEffect(input: C): Effect<never, ParseError, A> {
      return validateEffect(f(input))
    }
    make.option = function makeOption(input: C): Option<A> {
      return validateOption(f(input))
    }

    return make as any
  }
)

/**
 * @category combinators
 * @since 1.0.0
 */
export const withConstructorSelf = <I, A>(
  self: Schema.Schema<I, A>
): SchemaC<I, A, A> => withConstructor(self, identity)

/**
 * @category combinators
 * @since 1.0.0
 */
export const withConstructorTagged: {
  <A extends { readonly _tag: string }>(
    tag: A["_tag"]
  ): <I>(self: Schema.Schema<I, A>) => SchemaC<I, A, Omit<A, "_tag">>

  <I, A extends { readonly _tag: string }>(
    self: Schema.Schema<I, A>,
    tag: A["_tag"]
  ): SchemaC<I, A, Omit<A, "_tag">>
} = dual(
  2,
  <I, A extends { readonly _tag: string }>(
    self: Schema.Schema<I, A>,
    tag: A["_tag"]
  ): SchemaC<I, A, Omit<A, "_tag">> =>
    withConstructor(
      self,
      (input) => (({
        _tag: tag,
        ...input
      }) as A)
    )
)

/**
 * @category combinators
 * @since 1.0.0
 */
export const withConstructorDataTagged: {
  <A extends { readonly _tag: string }>(
    tag: A["_tag"]
  ): <I>(self: Schema.Schema<I, A>) => SchemaC<I, Data.Data<A>, Omit<A, "_tag">>

  <I extends Record<string, any>, A extends { readonly _tag: string }>(
    self: Schema.Schema<I, A>,
    tag: A["_tag"]
  ): SchemaC<I, Data.Data<A>, Omit<A, "_tag">>
} = dual(
  2,
  <I extends Record<string, any>, A extends { readonly _tag: string }>(
    self: Schema.Schema<I, A>,
    tag: A["_tag"]
  ): SchemaC<I, Data.Data<A>, Omit<A, "_tag">> => withConstructor(Schema.data(self), Data.tagged(tag) as any)
)

/**
 * @category combinators
 * @since 1.0.0
 */
export const withTo = <A>() => <I, X extends A, C>(self: SchemaC<I, X, C>): SchemaC<I, A, C> => self as any
