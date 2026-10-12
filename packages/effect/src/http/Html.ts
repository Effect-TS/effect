/**
 * Builds HTML from template literals that escape what they interpolate.
 *
 * `Html.make` escapes every interpolated string, number and boolean, so text
 * that came from a person cannot add markup. Markup that is already safe is an
 * `Html` value: what `Html.make` returns, and `Html.raw` for trusted markup
 * such as an inlined icon. Like `Template`, an interpolation can also be an
 * `Option` or an effect, and the resulting effect keeps the errors and service
 * requirements of the effects it awaits.
 *
 * Escaping covers text and quoted attribute values (`title="${text}"`). An
 * interpolation inside a tag, outside a quoted value, or inside a `script` or
 * `style` element is not made safe by it.
 *
 * @stability unstable
 * @since 4.0.4
 */
import * as Effect from "../Effect.ts"
import * as Option from "../Option.ts"
import * as Predicate from "../Predicate.ts"
import * as Template from "./Template.ts"

const TypeId = "~effect/http/Html"

/**
 * Markup that is not escaped again when it is interpolated into a template.
 *
 * @stability unstable
 * @category models
 * @since 4.0.4
 */
export interface Html {
  readonly [TypeId]: typeof TypeId
  readonly value: string
}

/**
 * Returns `true` if the provided value is an `Html`.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.4
 */
export const isHtml = (u: unknown): u is Html => Predicate.hasProperty(u, TypeId)

/**
 * A value that is escaped when it is interpolated, or, for `Html`, inserted as
 * it is. Arrays are rendered by rendering each element and concatenating the
 * results.
 *
 * @stability unstable
 * @category models
 * @since 4.0.4
 */
export type Value = Template.PrimitiveValue | Html | ReadonlyArray<Template.PrimitiveValue | Html>

/**
 * Value accepted by `Html.make`: a `Value`, an optional `Value`, or an effect
 * that produces one.
 *
 * @stability unstable
 * @category models
 * @since 4.0.4
 */
export type Interpolated =
  | Value
  | Option.Option<Value>
  | Effect.Effect<Value, any, any>

/**
 * Escapes `&`, `<`, `>`, `"` and `'` in text.
 *
 * @stability unstable
 * @category escaping
 * @since 4.0.4
 */
export const escape = (text: string): string => text.replace(/[&<>"']/g, (char) => entities[char]!)

const entities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
}

/**
 * Marks text as markup that is safe as it is. Use it for trusted markup only,
 * never for anything a person typed.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.4
 */
export const raw = (value: string): Html => ({ [TypeId]: TypeId, value })

const render = (value: Value): string => {
  if (Array.isArray(value)) {
    return value.map(render).join("")
  }
  if (isHtml(value)) {
    return value.value
  }
  switch (typeof value) {
    case "string": {
      return escape(value)
    }
    case "number":
    case "bigint": {
      return value.toString()
    }
    case "boolean": {
      return value ? "true" : "false"
    }
    default: {
      return ""
    }
  }
}

const toTemplate = (arg: Interpolated): Template.Interpolated => {
  if (Option.isOption(arg)) {
    return Option.map(arg, render)
  }
  if (Effect.isEffect(arg)) {
    return Effect.map(arg, render)
  }
  return render(arg)
}

/**
 * Creates an effect of `Html` from a template literal, escaping what is
 * interpolated.
 *
 * **Details**
 *
 * Strings are escaped, `Html` values are inserted as they are, and `Option`
 * and effect interpolations are rendered the same way once they are
 * evaluated. The template itself is trusted markup.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.4
 */
export const make = <A extends ReadonlyArray<Interpolated>>(
  strings: TemplateStringsArray,
  ...args: A
): Effect.Effect<
  Html,
  Template.Interpolated.Error<A[number]>,
  Template.Interpolated.Context<A[number]>
> => Effect.map(Template.make(strings, ...args.map(toTemplate)), raw) as any
