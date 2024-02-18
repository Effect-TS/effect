/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

/**
 * @category models
 * @since 1.0.0
 */
export type Primitive = string | number | bigint | boolean

/**
 * @category models
 * @since 1.0.0
 */
export type Interpolated =
  | Primitive
  | Option.Option<Primitive>
  | Effect.Effect<Primitive, any, any>

/**
 * @category models
 * @since 1.0.0
 */
export declare namespace Interpolated {
  /**
   * @category models
   * @since 1.0.0
   */
  export type Context<A extends Interpolated> = A extends infer T ? T extends Option.Option<infer _> ? never
    : T extends Effect.Effect<infer _A, infer _E, infer R> ? R
    : never
    : never

  /**
   * @category models
   * @since 1.0.0
   */
  export type Error<A extends Interpolated> = A extends infer T ? T extends Option.Option<infer _> ? never
    : T extends Effect.Effect<infer _A, infer E, infer _R> ? E
    : never
    : never
}

/**
 * @category constructors
 * @since 1.0.0
 */
export function make<A extends ReadonlyArray<Interpolated>>(
  strings: TemplateStringsArray,
  ...args: A
): Effect.Effect<
  string,
  Interpolated.Error<A[number]>,
  Interpolated.Context<A[number]>
> {
  const argsLength = args.length
  const values = new Array<string>(argsLength)
  const effects: Array<
    [index: number, effect: Effect.Effect<Primitive, any, any>]
  > = []

  for (let i = 0; i < argsLength; i++) {
    const arg = args[i]

    if (Option.isOption(arg)) {
      values[i] = arg._tag === "Some" ? primitiveToString(arg.value) : ""
    } else if (Effect.isEffect(arg)) {
      effects.push([i, arg])
    } else {
      values[i] = primitiveToString(arg)
    }
  }

  if (effects.length === 0) {
    return Effect.succeed(consolidate(strings, values))
  }

  return Effect.map(
    Effect.forEach(
      effects,
      ([index, effect]) =>
        Effect.tap(effect, (value) => {
          values[index] = primitiveToString(value)
        }),
      {
        concurrency: "inherit",
        discard: true
      }
    ),
    (_) => consolidate(strings, values)
  )
}

function primitiveToString(value: Primitive) {
  switch (typeof value) {
    case "string": {
      return value
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

function consolidate(
  strings: ReadonlyArray<string>,
  values: ReadonlyArray<string>
): string {
  let out = ""
  for (let i = 0, len = values.length; i < len; i++) {
    out += strings[i]
    out += values[i]
  }
  return out + strings[strings.length - 1]
}
