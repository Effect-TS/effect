import { Arbitrary, Context, Effect, FastCheck, Option, Predicate, Schema } from "effect"

export type UntypedParameters = Omit<FastCheck.Parameters<any>, "examples" | "reporter" | "asyncReporter">

export class AssertConfig extends Context.Tag("AssertConfig")<AssertConfig, {
  readonly arbitrary?: {
    readonly is?: boolean | UntypedParameters | undefined
  }
}>() {}

export class Assert extends Context.Tag("Assert")<Assert, {
  readonly deepStrictEqual: (actual: unknown, expected: unknown) => void
  readonly throws: (fn: () => unknown, message: string) => void
}>() {}

export const assertions = Effect.gen(function*() {
  const { deepStrictEqual, throws } = yield* Assert
  const config = yield* AssertConfig
  return {
    make: {
      /**
       * Assert that the given constructor returns the expected value
       */
      succeed<A, B>(
        // Destructure to verify that "this" type is bound
        { make }: { readonly make: (a: A) => B },
        input: A,
        expected: Option.Option<B> = Option.none()
      ) {
        deepStrictEqual(make(input), Option.getOrElse(expected, () => input))
      },

      /**
       * Assert that the given constructor throws the expected error
       */
      fail<A, B>(
        // Destructure to verify that "this" type is bound
        { make }: { readonly make: (a: A) => B },
        input: A,
        message: string
      ) {
        throws(() => make(input), message)
      }
    },
    arbitrary: {
      /**
       * Assert that the given schema generates arbitrary values that satisfy the schema
       */
      is<A, I, R>(schema: Schema.Schema<A, I, R>, params?: FastCheck.Parameters<[A]>) {
        if (config.arbitrary?.is === false) {
          return
        }
        if (Predicate.isObject(config.arbitrary?.is)) {
          params = { ...config.arbitrary?.is, ...params }
        }
        const is = Schema.is(schema)
        const arb = Arbitrary.make(schema)
        FastCheck.assert(FastCheck.property(arb, (a) => is(a)), params)
      }
    }
  }
})
