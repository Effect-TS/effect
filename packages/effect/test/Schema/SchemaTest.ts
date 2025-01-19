import type { SchemaAST } from "effect"
import { Arbitrary, Context, Effect, Either, FastCheck, ParseResult, Predicate, Schema } from "effect"

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
  readonly fail: (fmessage: string) => void
}>() {}

// Provides various assertions for Schema testing
export const assertions = Effect.gen(function*() {
  const { deepStrictEqual, fail, throws } = yield* Assert
  const config = yield* AssertConfig

  const expectRight = <R, L>(e: Either.Either<R, L>, right: R) => {
    if (Either.isRight(e)) {
      deepStrictEqual(e.right, right)
    } else {
      // eslint-disable-next-line no-console
      console.log(e.left)
      fail(`expected a Right, got a Left: ${e.left}`)
    }
  }

  const expectLeft = <R, L>(e: Either.Either<R, L>, left: L) => {
    if (Either.isLeft(e)) {
      deepStrictEqual(e.left, left)
    } else {
      // eslint-disable-next-line no-console
      console.log(e.right)
      fail(`expected a Left, got a Right: ${e.right}`)
    }
  }

  return {
    make: {
      /**
       * Ensures that the given constructor produces the expected value.
       */
      succeed<A, B>(
        // Destructure to verify that "this" type is bound
        { make }: { readonly make: (a: A) => B },
        input: A,
        expected?: B
      ) {
        deepStrictEqual(make(input), expected ?? input)
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
        readonly params?: FastCheck.Parameters<[A]> | undefined
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
      readonly params?: FastCheck.Parameters<[A]> | undefined
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
    },

    decoding: {
      async succeed<A, I>(
        schema: Schema.Schema<A, I>,
        input: unknown,
        expected?: A,
        options?: {
          readonly parseOptions?: SchemaAST.ParseOptions | undefined
        } | undefined
      ) {
        const decoding = Effect.gen(function*() {
          const decoded = yield* Effect.either(ParseResult.decodeUnknown(schema)(input, options?.parseOptions))
          if (Either.isLeft(decoded)) {
            const message = yield* ParseResult.TreeFormatter.formatIssue(decoded.left)
            return yield* Effect.fail(message)
          }
          return decoded.right
        })
        const result = await Effect.runPromise(Effect.either(decoding))
        expectRight(
          result,
          arguments.length >= 3 ? // Account for `expected` being `undefined`
            expected :
            expected ?? input
        )
      },

      async fail<A, I>(
        schema: Schema.Schema<A, I>,
        input: unknown,
        message: string,
        options?: {
          readonly parseOptions?: SchemaAST.ParseOptions | undefined
        } | undefined
      ) {
        const decoding = Effect.gen(function*() {
          const decoded = yield* Effect.either(ParseResult.decodeUnknown(schema)(input, options?.parseOptions))
          if (Either.isLeft(decoded)) {
            const message = yield* ParseResult.TreeFormatter.formatIssue(decoded.left)
            return yield* Effect.fail(message)
          }
          return decoded.right
        })
        const result = await Effect.runPromise(Effect.either(decoding))
        expectLeft(result, message)
      }
    },

    encoding: {
      async succeed<A, I>(
        schema: Schema.Schema<A, I>,
        input: A,
        expected?: I,
        options?: {
          readonly parseOptions?: SchemaAST.ParseOptions | undefined
        } | undefined
      ) {
        const encoding = Effect.gen(function*() {
          const encoded = yield* Effect.either(ParseResult.encodeUnknown(schema)(input, options?.parseOptions))
          if (Either.isLeft(encoded)) {
            const message = yield* ParseResult.TreeFormatter.formatIssue(encoded.left)
            return yield* Effect.fail(message)
          }
          return encoded.right
        })
        const result = await Effect.runPromise(Effect.either(encoding))
        expectRight(
          result,
          arguments.length >= 3 ? // Account for `expected` being `undefined`
            expected :
            expected ?? input
        )
      },

      async fail<A, I>(
        schema: Schema.Schema<A, I>,
        input: A,
        message: string,
        options?: {
          readonly parseOptions?: SchemaAST.ParseOptions | undefined
        } | undefined
      ) {
        const encoding = Effect.gen(function*() {
          const encoded = yield* Effect.either(ParseResult.encodeUnknown(schema)(input, options?.parseOptions))
          if (Either.isLeft(encoded)) {
            const message = yield* ParseResult.TreeFormatter.formatIssue(encoded.left)
            return yield* Effect.fail(message)
          }
          return encoded.right
        })
        const result = await Effect.runPromise(Effect.either(encoding))
        expectLeft(result, message)
      }
    }
  }
})
