import { Arbitrary, Context, Effect, Either, FastCheck, Option, ParseResult, Predicate, Schema } from "effect"

// Defines parameters for FastCheck that exclude typed properties
export type UntypedParameters = Omit<FastCheck.Parameters<any>, "examples" | "reporter" | "asyncReporter">

// Configuration context for assertion behaviors
export class AssertConfig extends Context.Tag("AssertConfig")<AssertConfig, {
  readonly arbitrary?: {
    readonly validateGeneratedValues?: {
      readonly skip?: boolean | undefined
      readonly params?: UntypedParameters | undefined
    }
  }
  readonly testRoundtripConsistency?: {
    readonly skip?: boolean | undefined
    readonly params?: UntypedParameters | undefined
  }
}>() {}

// Provides assertion utilities for testing
export class Assert extends Context.Tag("Assert")<Assert, {
  readonly deepStrictEqual: (actual: unknown, expected: unknown) => void
  readonly throws: (fn: () => unknown, message: string) => void
}>() {}

// Provides various assertions for Schema testing
export const assertions = Effect.gen(function*() {
  const { deepStrictEqual, throws } = yield* Assert
  const config = yield* AssertConfig
  return {
    make: {
      /**
       * Ensures that the given constructor produces the expected value.
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
       * Ensures that the given constructor throws the expected error.
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
       * Verifies that the schema generates valid arbitrary values that satisfy
       * the schema.
       */
      validateGeneratedValues<A, I, R>(schema: Schema.Schema<A, I, R>, options?: {
        readonly params?: FastCheck.Parameters<[A]>
      }) {
        if (config.arbitrary?.validateGeneratedValues?.skip === true) {
          return
        }
        const params = Predicate.isObject(config.arbitrary?.validateGeneratedValues)
          ? { ...config.arbitrary?.validateGeneratedValues?.params, ...options?.params }
          : options?.params
        const is = Schema.is(schema)
        const arb = Arbitrary.make(schema)
        FastCheck.assert(FastCheck.property(arb, (a) => is(a)), params)
      }
    },

    /**
     * Verifies that the schema satisfies the roundtrip law: `decode(encode(a))`
     * is equal to `a`.
     */
    testRoundtripConsistency<A, I>(schema: Schema.Schema<A, I, never>, options?: {
      readonly ignoreEncodingErrors?: ((issue: ParseResult.ParseIssue) => boolean) | undefined
      readonly params?: FastCheck.Parameters<[A]>
    }) {
      if (config.testRoundtripConsistency?.skip === true) {
        return
      }
      const params = Predicate.isObject(config.testRoundtripConsistency?.params)
        ? { ...config.testRoundtripConsistency?.params, ...options?.params }
        : options?.params
      const arb = Arbitrary.make(schema)
      const is = Schema.is(schema)
      const encode = ParseResult.encode(schema)
      const decode = ParseResult.decode(schema)
      FastCheck.assert(
        FastCheck.property(arb, (a) => {
          const roundtrip = encode(a).pipe(
            Effect.mapError((issue) => ["encoding", issue] as const),
            Effect.flatMap((i) => decode(i).pipe(Effect.mapError((issue) => ["decoding", issue] as const))),
            Effect.either,
            Effect.runSync
          )
          if (Either.isLeft(roundtrip)) {
            if (roundtrip.left[0] === "encoding" && options?.ignoreEncodingErrors) {
              return options.ignoreEncodingErrors(roundtrip.left[1])
            }
            return false
          }
          return is(roundtrip.right)
        }),
        params
      )
    }
  }
})
