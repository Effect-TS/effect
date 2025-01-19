import { Arbitrary, Context, Effect, Either, FastCheck, Option, Predicate, Schema } from "effect"

export type UntypedParameters = Omit<FastCheck.Parameters<any>, "examples" | "reporter" | "asyncReporter">

export class AssertConfig extends Context.Tag("AssertConfig")<AssertConfig, {
  readonly arbitrary?: {
    readonly is?: {
      readonly skip?: true | undefined
      readonly params?: UntypedParameters | undefined
    }
  }
  readonly roundtrip?: {
    readonly skip?: true | undefined
    readonly params?: UntypedParameters | undefined
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
        if (config.arbitrary?.is?.skip === true) {
          return
        }
        if (Predicate.isObject(config.arbitrary?.is)) {
          params = { ...config.arbitrary?.is?.params, ...params }
        }
        const is = Schema.is(schema)
        const arb = Arbitrary.make(schema)
        FastCheck.assert(FastCheck.property(arb, (a) => is(a)), params)
      }
    },

    /**
     * Assert that the given schema abides to the soft schema law.
     *
     * This means that for all values `a` that satisfy the schema:
     *
     * `decode(encode(a))` is equal to `a`
     */
    roundtrip<A, I>(schema: Schema.Schema<A, I, never>, params?: FastCheck.Parameters<[A]>) {
      if (config.roundtrip?.skip === true) {
        return
      }
      if (Predicate.isObject(config.roundtrip?.params)) {
        params = { ...config.roundtrip?.params, ...params }
      }
      const arb = Arbitrary.make(schema)
      const is = Schema.is(schema)
      const encode = Schema.encode(schema)
      const decode = Schema.decode(schema)
      FastCheck.assert(
        FastCheck.property(arb, (a) => {
          const roundtrip = encode(a).pipe(
            Effect.mapError(() => "encoding" as const),
            Effect.flatMap((i) => decode(i).pipe(Effect.mapError(() => "decoding" as const))),
            Effect.either,
            Effect.runSync
          )
          if (Either.isLeft(roundtrip)) {
            return roundtrip.left === "encoding"
          }
          return is(roundtrip.right)
        }),
        params
      )
    }
  }
})
