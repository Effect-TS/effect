import * as Predicate from "effect/Predicate"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { InvalidKey } from "../JoseError.ts"

/** @internal */
export const maxArrayLength = 256

const ArrayLength = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: maxArrayLength }))

/**
 * Copy only own fields, evaluating accessors once before Schema validation.
 * @internal
 */
export const object = (input: unknown): unknown => {
  if (!Predicate.isObject(input)) return input
  const descriptors = Object.getOwnPropertyDescriptors(input)
  const copy: Record<string, unknown> = {}

  Object.setPrototypeOf(copy, null)
  for (const name of Object.getOwnPropertyNames(descriptors)) {
    const descriptor = descriptors[name]

    copy[name] = Object.hasOwn(descriptor, "value")
      ? descriptor.value
      : descriptor.get?.call(input)
  }

  return copy
}

const array = (input: ReadonlyArray<unknown>) =>
  Result.gen(function*() {
    const length = yield* Schema.decodeResult(ArrayLength)(input.length).pipe(
      Result.mapError(() => InvalidKey.make({}))
    )

    // Capture bounded own slots before any accessor can mutate the array.
    const descriptors = Array.from({ length }, (_, index) => Object.getOwnPropertyDescriptor(input, index))

    return descriptors.map((descriptor) => {
      if (descriptor === undefined) return undefined
      return Object.hasOwn(descriptor, "value")
        ? descriptor.value
        : descriptor.get?.call(input)
    })
  })

/** @internal */
export const jwk = (input: unknown) =>
  Result.gen(function*() {
    const copy = object(input)

    if (Predicate.isObject(copy) && Array.isArray(copy.key_ops)) {
      copy.key_ops = yield* array(copy.key_ops)
    }

    return copy
  })

/** @internal */
export const keySet = (input: unknown) =>
  Result.gen(function*() {
    const copy = object(input)

    if (Predicate.isObject(copy) && Array.isArray(copy.keys)) {
      const keys = yield* array(copy.keys)

      copy.keys = yield* Result.all(keys.map(jwk))
    }

    return copy
  })

/**
 * Struct decoding creates ordinary objects; detach owned output as well.
 * @internal
 */
export const detach = <A>(value: A): A => {
  if (Predicate.isObject(value)) Object.setPrototypeOf(value, null)

  return value
}
