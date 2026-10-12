/**
 * Builds HTML from template literals that escape what they interpolate.
 *
 * `Html.make` escapes every interpolated string, so text that came from a
 * person cannot add markup. Markup that is already safe is an `Html` value:
 * what `Html.make` returns, and `Html.rawUnsafe` for trusted markup such as an
 * inlined icon. Like `Template`, an interpolation can also be an `Option` or an
 * effect, and the resulting effect keeps the errors and service requirements of
 * the effects it awaits.
 *
 * **Safety**
 *
 * Escaping `&`, `<`, `>`, `"` and `'` makes an interpolation safe in element
 * text and in quoted values of ordinary attributes, such as
 * `title="${text}"`. It does not make an interpolation safe in:
 *
 * - URL attributes (`href`, `src`, `action`, `formaction`, `srcset`, ...):
 *   `javascript:` and other schemes pass through unchanged, so validate URLs
 *   separately
 * - event handler attributes (`onclick`, ...), `style` attributes and
 *   `srcdoc`, whose values are decoded before they are run or parsed
 * - `script` and `style` elements, and HTML comments
 * - unquoted attribute values, and tag or attribute names
 *
 * @stability unstable
 * @since 4.0.4
 */
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Option from "../Option.ts"
import * as Predicate from "../Predicate.ts"
import * as Template from "./Template.ts"

// A symbol key cannot be produced by `JSON.parse` or `structuredClone`, so
// parsed data cannot pass itself off as trusted markup.
const TypeId: unique symbol = Symbol.for("~effect/http/Html")

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
 * Marks text as markup that is inserted without escaping.
 *
 * **Details**
 *
 * The caller vouches that the text is safe markup. Use it for markup written by
 * the application, never for anything a person typed.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.4
 */
export const rawUnsafe = (value: string): Html => ({ [TypeId]: TypeId, value })

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

const isSuccess = <A>(u: unknown): u is Exit.Success<A, never> => Exit.isExit(u) && u._tag === "Success"

const toTemplate = (arg: Interpolated): Template.Interpolated => {
  if (Option.isOption(arg)) {
    return Option.map(arg, render)
  }
  if (isSuccess<Value>(arg)) {
    return render(arg.value)
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
 * evaluated. The template itself is trusted markup. See the module
 * documentation for the places where escaping does not make an interpolation
 * safe.
 *
 * An array of effects is not awaited; combine it with `Effect.all` first.
 *
 * **Example** (Rendering a list)
 *
 * ```ts
 * import { Effect } from "effect"
 * import { Html } from "effect/http"
 *
 * const item = (name: string) => Html.make`<li>${name}</li>`
 *
 * const list = (names: ReadonlyArray<string>) => Html.make`<ul>${Effect.all(names.map(item))}</ul>`
 * ```
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
> => {
  const template = Template.make(strings, ...args.map(toTemplate))
  return (isSuccess<string>(template)
    ? Exit.succeed(rawUnsafe(template.value))
    : Effect.map(template, rawUnsafe)) as any
}
