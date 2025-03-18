import type { SchemaAST } from "effect"
import {
  Arbitrary,
  Cause,
  Context,
  Effect,
  Either,
  FastCheck,
  ParseResult,
  Predicate,
  Pretty,
  Runtime,
  Schema
} from "effect"

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
  readonly strictEqual: (actual: unknown, expected: unknown, message?: string) => void
  readonly throws: (thunk: () => void, error?: Error | ((u: unknown) => undefined)) => void
  readonly fail: (message: string) => void
}>() {}

// Provides various assertions for Schema testing
export const assertions = Effect.gen(function*() {
  const { deepStrictEqual, fail, strictEqual, throws } = yield* Assert
  const config = yield* AssertConfig

  function assertInstanceOf<C extends abstract new(...args: any) => any>(
    value: unknown,
    constructor: C,
    message?: string,
    ..._: Array<never>
  ): asserts value is InstanceType<C> {
    if (!(value instanceof constructor)) {
      fail(message ?? `expected ${value} to be an instance of ${constructor}`)
    }
  }

  const out = {
    ast: {
      equals: <A, I, R>(a: Schema.Schema<A, I, R>, b: Schema.Schema<A, I, R>) => {
        deepStrictEqual(a.ast, b.ast)
      }
    },
    make: {
      /**
       * Ensures that the given constructor produces the expected value.
       */
      succeed<const A, const B>(
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
      fail<const A, const B>(
        // Destructure to verify that "this" type is bound
        { make }: { readonly make: (a: A) => B },
        input: A,
        message: string
      ) {
        out.parseError(() => make(input), message)
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
      /**
       * Attempts to decode the given input using the provided schema. If the
       * decoding is successful, the decoded value is compared to the expected
       * value. Otherwise the test fails.
       */
      async succeed<const A, I>(
        schema: Schema.Schema<A, I>,
        input: unknown,
        expected?: A,
        options?: {
          readonly parseOptions?: SchemaAST.ParseOptions | undefined
        } | undefined
      ) {
        const decoded = ParseResult.decodeUnknown(schema)(input, options?.parseOptions)
        return out.effect.succeed(
          decoded,
          arguments.length >= 3 ? // Account for `expected` being `undefined`
            expected :
            expected ?? input
        )
      },

      /**
       * Attempts to decode the given input using the provided schema. If the
       * decoding fails, the error message is compared to the expected message.
       * Otherwise the test fails.
       */
      async fail<A, I>(
        schema: Schema.Schema<A, I>,
        input: unknown,
        message: string,
        options?: {
          readonly parseOptions?: SchemaAST.ParseOptions | undefined
        } | undefined
      ) {
        const decoded = ParseResult.decodeUnknown(schema)(input, options?.parseOptions)
        return out.effect.fail(decoded, message)
      }
    },

    encoding: {
      /**
       * Attempts to encode the given input using the provided schema. If the
       * decoding is successful, the decoded value is compared to the expected
       * value. Otherwise the test fails.
       */
      async succeed<const A, const I>(
        schema: Schema.Schema<A, I>,
        input: A,
        expected?: I,
        options?: {
          readonly parseOptions?: SchemaAST.ParseOptions | undefined
        } | undefined
      ) {
        const encoded = ParseResult.encodeUnknown(schema)(input, options?.parseOptions)
        return out.effect.succeed(
          encoded,
          arguments.length >= 3 ? // Account for `expected` being `undefined`
            expected :
            expected ?? input
        )
      },

      /**
       * Attempts to encode the given input using the provided schema. If the
       * decoding fails, the error message is compared to the expected message.
       * Otherwise the test fails.
       */
      async fail<const A, I>(
        schema: Schema.Schema<A, I>,
        input: A,
        message: string,
        options?: {
          readonly parseOptions?: SchemaAST.ParseOptions | undefined
        } | undefined
      ) {
        const encoded = ParseResult.encodeUnknown(schema)(input, options?.parseOptions)
        return out.effect.fail(encoded, message)
      }
    },

    promise: {
      /**
       * Ensures that the given promise rejects with a Fiber Failure containing the expected message.
       *
       * Useful to test `decodePromise` and `encodePromise`.
       */
      async fail<A>(promise: Promise<A>, message: string) {
        try {
          const a = await promise
          throw new Error(`Promise didn't reject, got: ${a}`)
        } catch (e: unknown) {
          if (Runtime.isFiberFailure(e) && Cause.isCause(e[Runtime.FiberFailureCauseId])) {
            const cause = e[Runtime.FiberFailureCauseId]
            if (Cause.isFailType(cause) && Predicate.hasProperty(cause.error, "message")) {
              return deepStrictEqual(cause.error.message, message)
            }
          }
          throw new Error(`Unknown promise rejection: ${e}`)
        }
      }
    },

    effect: {
      /**
       * Verifies that the effect succeeds with the expected value.
       */
      async succeed<const A, E>(
        effect: Effect.Effect<A, E>,
        a: A
      ) {
        deepStrictEqual(await Effect.runPromise(Effect.either(effect)), Either.right(a))
      },

      /**
       * Verifies that the effect fails with the expected message.
       */
      async fail<A>(
        effect: Effect.Effect<A, ParseResult.ParseIssue>,
        message: string
      ) {
        const effectWithMessage = Effect.gen(function*() {
          const decoded = yield* Effect.either(effect)
          if (Either.isLeft(decoded)) {
            const message = yield* ParseResult.TreeFormatter.formatIssue(decoded.left)
            return yield* Effect.fail(message)
          }
          return decoded.right
        })
        const result = await Effect.runPromise(Effect.either(effectWithMessage))
        return out.either.left(result, message)
      }
    },

    either: {
      /**
       * Verifies that the either is a `Right` with the expected value.
       */
      right<const R, L>(either: Either.Either<R, L>, right: R) {
        if (Either.isRight(either)) {
          deepStrictEqual(either.right, right)
        } else {
          // eslint-disable-next-line no-console
          console.log(either.left)
          fail(`expected a Right, got a Left: ${either.left}`)
        }
      },

      /**
       * Verifies that the either is a `Left` with the expected value.
       */
      left<R, const L>(either: Either.Either<R, L>, left: L) {
        if (Either.isLeft(either)) {
          deepStrictEqual(either.left, left)
        } else {
          // eslint-disable-next-line no-console
          console.log(either.right)
          fail(`expected a Left, got a Right: ${either.right}`)
        }
      },

      /**
       * Verifies that the either is a left with the expected value.
       */
      async fail<R>(either: Either.Either<R, ParseResult.ParseIssue>, message: string) {
        const eitherWithMessage = Effect.gen(function*() {
          const encoded = yield* Effect.either(either)
          if (Either.isLeft(encoded)) {
            const message = yield* ParseResult.TreeFormatter.formatIssue(encoded.left)
            return yield* Effect.fail(message)
          }
          return encoded.right
        })
        const result = await Effect.runPromise(Effect.either(eitherWithMessage))
        return out.either.left(result, message)
      }
    },

    asserts: {
      succeed<A, I, R>(schema: Schema.Schema<A, I, R>, input: unknown, options?: {
        readonly parseOptions?: SchemaAST.ParseOptions | undefined
      }) {
        deepStrictEqual(Schema.asserts(schema, options?.parseOptions)(input), undefined)
      },

      fail<A, I, R>(
        schema: Schema.Schema<A, I, R>,
        input: unknown,
        message: string,
        options?: {
          readonly parseOptions?: SchemaAST.ParseOptions | undefined
        }
      ) {
        out.parseError(() => Schema.asserts(schema, options?.parseOptions)(input), message)
      }
    },

    parseError(f: () => void, message: string) {
      throws(f, (err) => {
        assertInstanceOf(err, ParseResult.ParseError)
        strictEqual(err.message, message)
      })
    },

    pretty<A, I, R>(schema: Schema.Schema<A, I, R>, a: A, expected: string) {
      const pretty = Pretty.make(schema)
      strictEqual(pretty(a), expected)
    }
  }

  return out
})
