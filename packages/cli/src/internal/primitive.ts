import type * as Span from "@effect/cli/HelpDoc/Span"
import * as span from "@effect/cli/internal/helpDoc/span"
import type * as Primitive from "@effect/cli/Primitive"
import { dual, pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import type { NonEmptyReadonlyArray } from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"

const PrimitiveSymbolKey = "@effect/cli/Primitive"

/** @internal */
export const PrimitiveTypeId: Primitive.PrimitiveTypeId = Symbol.for(
  PrimitiveSymbolKey
) as Primitive.PrimitiveTypeId

const proto = {
  [PrimitiveTypeId]: {
    _A: (_: never) => _
  }
}

/** @internal */
export const isBool = <A>(self: Primitive.Primitive<A>): boolean => self._tag === "Bool"

/** @internal */
export const boolean = (defaultValue: Option.Option<boolean>): Primitive.Primitive<boolean> => {
  const op = Object.create(proto)
  op._tag = "Bool"
  op.defaultValue = defaultValue
  return op
}

/** @internal */
export const choice = <A>(choices: NonEmptyReadonlyArray<readonly [string, A]>): Primitive.Primitive<A> => {
  const op = Object.create(proto)
  op._tag = "Choice"
  op.choices = choices
  return op
}

const choicesMap: {
  [K in Primitive.Primitive<any>["_tag"]]: (
    self: Extract<Primitive.Primitive<any>, { _tag: K }>
  ) => Option.Option<string>
} = {
  Bool: () => Option.some("true | false"),
  Date: () => Option.some("date"),
  Float: () => Option.none(),
  Integer: () => Option.none(),
  Choice: (self) => Option.some(self.choices.map((tuple) => tuple[0]).join(" | ")),
  Text: () => Option.none()
}

/** @internal */
export const choices = <A>(self: Primitive.Primitive<A>): Option.Option<string> => choicesMap[self._tag](self as any)

/** @internal */
export const date: Primitive.Primitive<globalThis.Date> = (() => {
  const op = Object.create(proto)
  op._tag = "Date"
  return op
})()

/** @internal */
export const float: Primitive.Primitive<number> = (() => {
  const op = Object.create(proto)
  op._tag = "Float"
  return op
})()

const helpDocMap: {
  [K in Primitive.Primitive<any>["_tag"]]: (self: Extract<Primitive.Primitive<any>, { _tag: K }>) => Span.Span
} = {
  Bool: (_: Primitive.Bool) => span.text("A true or false value."),
  Choice: (self: Primitive.Choice<any>) => span.text(`One of: ${self.choices.map(([k]) => k).join(", ")}`),
  Date: (_: Primitive.Date) =>
    span.text("A date without a time-zone in the ISO-8601 format, such as 2007-12-03T10:15:30."),
  Float: (_: Primitive.Float) => span.text("A floating point number."),
  Integer: (_: Primitive.Integer) => span.text("An integer."),
  Text: (_: Primitive.Text) => span.text("A user-defined piece of text.")
}

/** @internal */
export const helpDoc = <A>(self: Primitive.Primitive<A>): Span.Span => helpDocMap[self._tag](self as any)

/** @internal */
export const integer: Primitive.Primitive<number> = (() => {
  const op = Object.create(proto)
  op._tag = "Integer"
  return op
})()

/** @internal */
export const text: Primitive.Primitive<string> = (() => {
  const op = Object.create(proto)
  op._tag = "Text"
  return op
})()

const trueValues: Record<string, boolean> = { "true": true, "1": true, "y": true, "yes": true, "on": true }

const falseValues: Record<string, boolean> = { "false": true, "0": true, "n": true, "no": true, "off": true }

const typeNameMap: {
  [K in Primitive.Primitive<any>["_tag"]]: string
} = {
  Bool: "boolean",
  Choice: "choice",
  Date: "date",
  Float: "float",
  Integer: "integer",
  Text: "text"
}

/** @internal */
export const typeName = <A>(self: Primitive.Primitive<A>): string => typeNameMap[self._tag]

const validationMap: {
  [K in Primitive.Primitive<any>["_tag"]]: (
    self: Extract<Primitive.Primitive<any>, { _tag: K }>,
    value: Option.Option<string>
  ) => Effect.Effect<never, string, Primitive.Primitive.ValueType<Extract<Primitive.Primitive<any>, { _tag: K }>>>
} = {
  Bool: (self: Primitive.Bool, value: Option.Option<string>) => {
    if (Option.isSome(value)) {
      if (trueValues[value.value] !== undefined) {
        return Effect.succeed(true)
      }
      if (falseValues[value.value] !== undefined) {
        return Effect.succeed(false)
      }
      return Effect.fail(`${JSON.stringify(value.value)} cannot be recognized as valid boolean`)
    }
    return Effect.orElseFail(self.defaultValue, () => "Missing default value for boolean parameter")
  },
  Choice: (self: Primitive.Choice<any>, value: Option.Option<string>) =>
    pipe(
      Effect.orElseFail(value, () => "Choice options do not have a default value"),
      Effect.flatMap((value) => {
        const found = self.choices.find((tuple) => tuple[0] === value)
        return found === undefined
          ? Effect.fail(`Expected one of the following cases: ${self.choices.map((tuple) => tuple[0]).join(", ")}`)
          : Effect.succeed(found[1])
      })
    ),
  Date: (self: Primitive.Date, value: Option.Option<string>) =>
    attempt(
      value,
      (string) => {
        const ms = globalThis.Date.parse(string)
        return Number.isNaN(ms)
          ? Effect.fail(`${JSON.stringify(string)} is not a valid date`)
          : Effect.succeed(new globalThis.Date(ms))
      },
      typeNameMap[self._tag]
    ),
  Float: (self: Primitive.Float, value: Option.Option<string>) =>
    attempt(
      value,
      (string) => {
        const n = Number.parseFloat(string)
        return !Number.isNaN(n) && Number.isFinite(n)
          ? Effect.succeed(n)
          : Effect.fail(`Unable to parse float from "${string}"`)
      },
      typeNameMap[self._tag]
    ),
  Integer: (self: Primitive.Integer, value: Option.Option<string>) =>
    attempt(
      value,
      (string) => {
        const n = Number.parseInt(string, 10)
        return !Number.isNaN(n) && Number.isFinite(n)
          ? Effect.succeed(n)
          : Effect.fail(`Unable to parse integer from "${string}"`)
      },
      typeNameMap[self._tag]
    ),
  Text: (self: Primitive.Text, value: Option.Option<string>) => attempt(value, Effect.succeed, typeNameMap[self._tag])
}

/** @internal */
export const validate = dual<
  (value: Option.Option<string>) => <A>(self: Primitive.Primitive<A>) => Effect.Effect<never, string, A>,
  <A>(self: Primitive.Primitive<A>, value: Option.Option<string>) => Effect.Effect<never, string, A>
>(2, (self, value) => validationMap[self._tag](self as any, value))

const attempt = <E, A>(
  option: Option.Option<string>,
  parse: (value: string) => Effect.Effect<never, E, A>,
  typeName: string
): Effect.Effect<never, string, A> =>
  pipe(
    Effect.orElseFail(option, () => `${typeName} options do not have a default value`),
    Effect.flatMap((value) =>
      Effect.orElseFail(
        parse(value),
        () => `${JSON.stringify(value)} is not a ${typeName}`
      )
    )
  )
