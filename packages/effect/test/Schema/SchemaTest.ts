import { Context, Effect, Option } from "effect"

export class Assertion extends Context.Tag("Assertion")<Assertion, {
  readonly deepStrictEqual: (actual: unknown, expected: unknown) => void
  readonly throws: (fn: () => unknown, message: string) => void
}>() {}

export const assertions = Effect.gen(function*() {
  const { deepStrictEqual, throws } = yield* Assertion
  return {
    make: {
      succeed<A, B>(
        // Destructure to verify that "this" type is bound
        { make }: { readonly make: (a: A) => B },
        input: A,
        expected: Option.Option<B> = Option.none()
      ) {
        deepStrictEqual(make(input), Option.getOrElse(expected, () => input))
      },

      fail<A, B>(
        // Destructure to verify that "this" type is bound
        { make }: { readonly make: (a: A) => B },
        input: A,
        message: string
      ) {
        throws(() => make(input), message)
      }
    }
  }
})
