import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as CliConfig from "../CliConfig.js"
import type * as Span from "../HelpDoc/Span.js"
import type * as Primitive from "../Primitive.js"
import * as InternalCliConfig from "./cliConfig.js"
import * as InternalSpan from "./helpDoc/span.js"

const PrimitiveSymbolKey = "@effect/cli/Primitive"

/** @internal */
export const PrimitiveTypeId: Primitive.PrimitiveTypeId = Symbol.for(
  PrimitiveSymbolKey
) as Primitive.PrimitiveTypeId

const proto = {
  _A: (_: never) => _
}

/** @internal */
export const trueValues = Schema.literal("true", "1", "y", "yes", "on")

/** @internal */
export const falseValues = Schema.literal("false", "0", "n", "no", "off")

/**
 * Represents a boolean value.
 *
 * True values can be passed as one of: `["true", "1", "y", "yes" or "on"]`.
 * False value can be passed as one of: `["false", "o", "n", "no" or "off"]`.
 *
 * @internal
 */
export class Bool implements Primitive.Primitive<boolean> {
  readonly [PrimitiveTypeId] = proto
  readonly _tag = "Bool"

  constructor(readonly defaultValue: Option.Option<boolean>) {}

  get typeName(): string {
    return "boolean"
  }

  get help(): Span.Span {
    return InternalSpan.text("A true or false value.")
  }

  get choices(): Option.Option<string> {
    return Option.some("true | false")
  }

  validate(
    value: Option.Option<string>,
    config: CliConfig.CliConfig
  ): Effect.Effect<never, string, boolean> {
    return Option.map(value, (str) => InternalCliConfig.normalizeCase(config, str)).pipe(
      Option.match({
        onNone: () =>
          Effect.orElseFail(this.defaultValue, () => `Missing default value for boolean parameter`),
        onSome: (value) =>
          Schema.is(trueValues)(value)
            ? Effect.succeed(true)
            : Schema.is(falseValues)(value)
            ? Effect.succeed(false)
            : Effect.fail(`Unable to recognize '${value}' as a valid boolean`)
      })
    )
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * Represents a date in ISO-8601 format, such as `2007-12-03T10:15:30`.
 *
 * @internal
 */
export class Date implements Primitive.Primitive<globalThis.Date> {
  readonly [PrimitiveTypeId] = proto
  readonly _tag = "Date"

  get typeName(): string {
    return "date"
  }

  get help(): Span.Span {
    return InternalSpan.text(
      "A date without a time-zone in the ISO-8601 format, such as 2007-12-03T10:15:30."
    )
  }

  get choices(): Option.Option<string> {
    return Option.some("date")
  }

  validate(
    value: Option.Option<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<never, string, globalThis.Date> {
    return attempt(
      value,
      this.typeName,
      Schema.parse(Schema.dateFromString(Schema.string))
    )
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

export class Choice<A> implements Primitive.Primitive<A> {
  readonly [PrimitiveTypeId] = proto
  readonly _tag = "Choice"

  constructor(
    readonly alternatives: ReadonlyArray.NonEmptyReadonlyArray<readonly [string, A]>
  ) {}

  get typeName(): string {
    return "choice"
  }

  get help(): Span.Span {
    const choices = pipe(
      ReadonlyArray.map(this.alternatives, ([choice]) => choice),
      ReadonlyArray.join(", ")
    )
    return InternalSpan.text(`One of the following: ${choices}`)
  }

  get choices(): Option.Option<string> {
    const choices = pipe(
      ReadonlyArray.map(this.alternatives, ([choice]) => choice),
      ReadonlyArray.join(" | ")
    )
    return Option.some(choices)
  }

  validate(
    value: Option.Option<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<never, string, A> {
    return Effect.orElseFail(
      value,
      () => `Choice options to not have a default value`
    ).pipe(
      Effect.flatMap((value) =>
        ReadonlyArray.findFirst(
          this.alternatives,
          ([choice]) => choice === value
        )
      ),
      Effect.mapBoth({
        onFailure: () => {
          const choices = pipe(
            ReadonlyArray.map(this.alternatives, ([choice]) => choice),
            ReadonlyArray.join(", ")
          )
          return `Expected one of the following cases: ${choices}`
        },
        onSuccess: ([, value]) => value
      })
    )
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * Represents a floating point number.
 *
 * @internal
 */
export class Float implements Primitive.Primitive<number> {
  readonly [PrimitiveTypeId] = proto
  readonly _tag = "Float"

  get typeName(): string {
    return "float"
  }

  get help(): Span.Span {
    return InternalSpan.text("A floating point number.")
  }

  get choices(): Option.Option<string> {
    return Option.none()
  }

  validate(
    value: Option.Option<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<never, string, number> {
    const numberFromString = Schema.string.pipe(Schema.numberFromString)
    return attempt(value, this.typeName, Schema.parse(numberFromString))
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * Represents an integer.
 *
 * @internal
 */
export class Integer implements Primitive.Primitive<number> {
  readonly [PrimitiveTypeId] = proto
  readonly _tag = "Integer"

  get typeName(): string {
    return "integer"
  }

  get help(): Span.Span {
    return InternalSpan.text("An integer.")
  }

  get choices(): Option.Option<string> {
    return Option.none()
  }

  validate(
    value: Option.Option<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<never, string, number> {
    const intFromString = Schema.string.pipe(Schema.numberFromString, Schema.int())
    return attempt(value, this.typeName, Schema.parse(intFromString))
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * Represents a user-defined piece of text.
 *
 * @internal
 */
export class Text implements Primitive.Primitive<string> {
  readonly [PrimitiveTypeId] = proto
  readonly _tag = "Text"

  get typeName(): string {
    return "text"
  }

  get help(): Span.Span {
    return InternalSpan.text("A user-defined piece of text.")
  }

  get choices(): Option.Option<string> {
    return Option.none()
  }

  validate(
    value: Option.Option<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<never, string, string> {
    return attempt(value, this.typeName, Schema.parse(Schema.string))
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

// =============================================================================
// Constructors
// =============================================================================

/** @internal */
export const boolean = (defaultValue: Option.Option<boolean>): Primitive.Primitive<boolean> =>
  new Bool(defaultValue)

/** @internal */
export const choice = <A>(
  alternatives: ReadonlyArray.NonEmptyReadonlyArray<[string, A]>
): Primitive.Primitive<A> => new Choice(alternatives)

/** @internal */
export const date: Primitive.Primitive<globalThis.Date> = new Date()

/** @internal */
export const float: Primitive.Primitive<number> = new Float()

/** @internal */
export const integer: Primitive.Primitive<number> = new Integer()

/** @internal */
export const text: Primitive.Primitive<string> = new Text()

// =============================================================================
// Refinements
// =============================================================================

/** @internal */
export const isPrimitive = (u: unknown): u is Primitive.Primitive<unknown> =>
  typeof u === "object" && u != null && PrimitiveTypeId in u

/** @internal */
export const isBool = <A>(self: Primitive.Primitive<A>): boolean =>
  isPrimitive(self) && "_tag" in self && self._tag === "Bool"

// =============================================================================
// Internals
// =============================================================================

const attempt = <E, A>(
  option: Option.Option<string>,
  typeName: string,
  parse: (value: string) => Effect.Effect<never, E, A>
): Effect.Effect<never, string, A> =>
  Effect.orElseFail(
    option,
    () => `${typeName} options do not have a default value`
  ).pipe(
    Effect.flatMap((value) =>
      Effect.orElseFail(
        parse(value),
        () => `'${value}' is not a ${typeName}`
      )
    )
  )
