/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"

/**
 * @category models
 * @since 1.0.0
 */
export type PrimitiveValue = string | number | bigint | boolean | null | undefined

/**
 * @category models
 * @since 1.0.0
 */
export type Primitive = PrimitiveValue | ReadonlyArray<PrimitiveValue>

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
export type InterpolatedWithStream = Interpolated | Stream.Stream<Primitive, any, any>

/**
 * @category models
 * @since 1.0.0
 */
export declare namespace Interpolated {
  /**
   * @category models
   * @since 1.0.0
   */
  export type Context<A> = A extends infer T ? T extends Option.Option<infer _> ? never
    : T extends Stream.Stream<infer _A, infer _E, infer R> ? R
    : never
    : never

  /**
   * @category models
   * @since 1.0.0
   */
  export type Error<A> = A extends infer T ? T extends Option.Option<infer _> ? never
    : T extends Stream.Stream<infer _A, infer E, infer _R> ? E
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
    } else if (isSuccess(arg)) {
      values[i] = primitiveToString((arg as any).effect_instruction_i0)
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

/**
 * @category constructors
 * @since 1.0.0
 */
export function stream<A extends ReadonlyArray<InterpolatedWithStream>>(
  strings: TemplateStringsArray,
  ...args: A
): Stream.Stream<
  string,
  Interpolated.Error<A[number]>,
  Interpolated.Context<A[number]>
> {
  const chunks: Array<string | Stream.Stream<string, any, any>> = []
  let buffer = ""

  for (let i = 0, len = args.length; i < len; i++) {
    buffer += strings[i]
    const arg = args[i]
    if (Option.isOption(arg)) {
      buffer += arg._tag === "Some" ? primitiveToString(arg.value) : ""
    } else if (isSuccess(arg)) {
      buffer += primitiveToString((arg as any).effect_instruction_i0)
    } else if (Predicate.hasProperty(arg, Stream.StreamTypeId)) {
      if (buffer.length > 0) {
        chunks.push(buffer)
        buffer = ""
      }
      if (Effect.isEffect(arg)) {
        chunks.push(Effect.map(arg, primitiveToString))
      } else {
        chunks.push(Stream.map(arg, primitiveToString))
      }
    } else {
      buffer += primitiveToString(arg)
    }
  }

  buffer += strings[strings.length - 1]
  if (buffer.length > 0) {
    chunks.push(buffer)
    buffer = ""
  }

  return Stream.flatMap(
    Stream.fromIterable(chunks),
    (chunk) => typeof chunk === "string" ? Stream.succeed(chunk) : chunk,
    { concurrency: "unbounded" }
  )
}

function primitiveToString(value: Primitive): string {
  if (Array.isArray(value)) {
    return value.map(primitiveToString).join("")
  }

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

function isSuccess(u: unknown) {
  return Effect.isEffect(u) && (u as any)._op === "Success"
}
