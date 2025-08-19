import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import type { StandardSchemaV1 } from "@standard-schema/spec"
import { Context, Effect, ParseResult, Predicate, Schema } from "effect"
import { describe, it } from "vitest"
import { AsyncString } from "../TestUtils.js"

function validate<I, A>(
  schema: StandardSchemaV1<I, A>,
  input: unknown
): StandardSchemaV1.Result<A> | Promise<StandardSchemaV1.Result<A>> {
  return schema["~standard"].validate(input)
}

const isPromise = (value: unknown): value is Promise<unknown> => value instanceof Promise

const expectSuccess = async <A>(
  result: StandardSchemaV1.Result<A>,
  a: A
) => {
  deepStrictEqual(result, { value: a })
}

const expectFailure = async <A>(
  result: StandardSchemaV1.Result<A>,
  issues: ReadonlyArray<StandardSchemaV1.Issue> | ((issues: ReadonlyArray<StandardSchemaV1.Issue>) => void)
) => {
  if (result.issues !== undefined) {
    if (Predicate.isFunction(issues)) {
      issues(result.issues)
    } else {
      deepStrictEqual(result.issues, issues)
    }
  } else {
    throw new Error("Expected issues, got undefined")
  }
}

const expectSyncSuccess = <I, A>(
  schema: StandardSchemaV1<I, A>,
  input: unknown,
  a: A
) => {
  const result = validate(schema, input)
  if (isPromise(result)) {
    throw new Error("Expected value, got promise")
  } else {
    expectSuccess(result, a)
  }
}

const expectAsyncSuccess = async <I, A>(
  schema: StandardSchemaV1<I, A>,
  input: unknown,
  a: A
) => {
  const result = validate(schema, input)
  if (isPromise(result)) {
    expectSuccess(await result, a)
  } else {
    throw new Error("Expected promise, got value")
  }
}

const expectSyncFailure = <I, A>(
  schema: StandardSchemaV1<I, A>,
  input: unknown,
  issues: ReadonlyArray<StandardSchemaV1.Issue> | ((issues: ReadonlyArray<StandardSchemaV1.Issue>) => void)
) => {
  const result = validate(schema, input)
  if (isPromise(result)) {
    throw new Error("Expected value, got promise")
  } else {
    expectFailure(result, issues)
  }
}

const expectAsyncFailure = async <I, A>(
  schema: StandardSchemaV1<I, A>,
  input: unknown,
  issues: ReadonlyArray<StandardSchemaV1.Issue> | ((issues: ReadonlyArray<StandardSchemaV1.Issue>) => void)
) => {
  const result = validate(schema, input)
  if (isPromise(result)) {
    expectFailure(await result, issues)
  } else {
    throw new Error("Expected promise, got value")
  }
}

const AsyncNonEmptyString = AsyncString.pipe(Schema.minLength(1))

describe("standardSchemaV1", () => {
  it("should return a schema", () => {
    const schema = Schema.NumberFromString
    const standardSchema = Schema.standardSchemaV1(schema)
    assertTrue(Schema.isSchema(standardSchema))
  })

  it("sync decoding + sync issue formatting", () => {
    const schema = Schema.NonEmptyString
    const standardSchema = Schema.standardSchemaV1(schema)
    expectSyncSuccess(standardSchema, "a", "a")
    expectSyncFailure(standardSchema, null, [
      {
        message: "Expected string, actual null",
        path: []
      }
    ])
    expectSyncFailure(standardSchema, "", [
      {
        message: `Expected a non empty string, actual ""`,
        path: []
      }
    ])
  })

  it("sync decoding + sync custom message", () => {
    const schema = Schema.NonEmptyString.annotations({ message: () => Effect.succeed("my message") })
    const standardSchema = Schema.standardSchemaV1(schema)
    expectSyncSuccess(standardSchema, "a", "a")
    expectSyncFailure(standardSchema, null, [
      {
        message: "Expected string, actual null",
        path: []
      }
    ])
    expectSyncFailure(standardSchema, "", [
      {
        message: "my message",
        path: []
      }
    ])
  })

  it("sync decoding + async custom message", async () => {
    const schema = Schema.NonEmptyString.annotations({
      message: () => Effect.succeed("my message").pipe(Effect.delay("10 millis"))
    })
    const standardSchema = Schema.standardSchemaV1(schema)
    expectSyncSuccess(standardSchema, "a", "a")
    await expectAsyncFailure(standardSchema, null, [
      {
        message: "Expected string, actual null",
        path: []
      }
    ])
    await expectAsyncFailure(standardSchema, "", [
      {
        message: "my message",
        path: []
      }
    ])
  })

  it("async decoding + sync issue formatting", async () => {
    const schema = AsyncNonEmptyString
    const standardSchema = Schema.standardSchemaV1(schema)
    await expectAsyncSuccess(standardSchema, "a", "a")
    expectSyncFailure(standardSchema, null, [
      {
        message: "Expected string, actual null",
        path: []
      }
    ])
    await expectAsyncFailure(standardSchema, "", [
      {
        message: `Expected a string at least 1 character(s) long, actual ""`,
        path: []
      }
    ])
  })

  it("async decoding + sync custom message", async () => {
    const schema = AsyncNonEmptyString.annotations({ message: () => Effect.succeed("my message") })
    const standardSchema = Schema.standardSchemaV1(schema)
    await expectAsyncSuccess(standardSchema, "a", "a")
    expectSyncFailure(standardSchema, null, [
      {
        message: "Expected string, actual null",
        path: []
      }
    ])
    await expectAsyncFailure(standardSchema, "", [
      {
        message: "my message",
        path: []
      }
    ])
  })

  it("async decoding + async custom message", async () => {
    const schema = AsyncNonEmptyString.annotations({
      message: () => Effect.succeed("my message").pipe(Effect.delay("10 millis"))
    })
    const standardSchema = Schema.standardSchemaV1(schema)
    await expectAsyncSuccess(standardSchema, "a", "a")
    await expectAsyncFailure(standardSchema, null, [
      {
        message: "Expected string, actual null",
        path: []
      }
    ])
    await expectAsyncFailure(standardSchema, "", [
      {
        message: "my message",
        path: []
      }
    ])
  })

  describe("missing dependencies", () => {
    class MagicNumber extends Context.Tag("Min")<MagicNumber, number>() {}

    it("sync decoding should throw", () => {
      const DepString = Schema.transformOrFail(Schema.Number, Schema.Number, {
        strict: true,
        decode: (n) =>
          Effect.gen(function*() {
            const magicNumber = yield* MagicNumber
            return n * magicNumber
          }),
        encode: ParseResult.succeed
      })

      const schema = DepString
      const standardSchema = Schema.standardSchemaV1(schema as any)
      expectSyncFailure(standardSchema, 1, (issues) => {
        strictEqual(issues.length, 1)
        deepStrictEqual(issues[0].path, undefined)
        assertTrue(issues[0].message.includes("Service not found: Min"))
      })
    })

    it("async decoding should throw", () => {
      const DepString = Schema.transformOrFail(Schema.Number, Schema.Number, {
        strict: true,
        decode: (n) =>
          Effect.gen(function*() {
            const magicNumber = yield* MagicNumber
            yield* Effect.sleep("10 millis")
            return n * magicNumber
          }),
        encode: ParseResult.succeed
      })

      const schema = DepString
      const standardSchema = Schema.standardSchemaV1(schema as any)
      expectSyncFailure(standardSchema, 1, (issues) => {
        strictEqual(issues.length, 1)
        deepStrictEqual(issues[0].path, undefined)
        assertTrue(issues[0].message.includes("Service not found: Min"))
      })
    })
  })

  it("sync decoding + sync all issues formatting", () => {
    const schema = Schema.Struct({
      a: Schema.NonEmptyString,
      b: Schema.NonEmptyString
    })
    const standardSchema = Schema.standardSchemaV1(schema)
    expectSyncSuccess(standardSchema, {
      a: "a",
      b: "b"
    }, {
      a: "a",
      b: "b"
    })
    expectSyncFailure(standardSchema, null, [
      {
        message: "Expected { readonly a: NonEmptyString; readonly b: NonEmptyString }, actual null",
        path: []
      }
    ])
    expectSyncFailure(standardSchema, "", [
      {
        message: `Expected { readonly a: NonEmptyString; readonly b: NonEmptyString }, actual ""`,
        path: []
      }
    ])
    expectSyncFailure(standardSchema, {
      a: "",
      b: ""
    }, [
      {
        message: `Expected a non empty string, actual ""`,
        path: ["a"]
      },
      {
        message: `Expected a non empty string, actual ""`,
        path: ["b"]
      }
    ])
    expectSyncFailure(standardSchema, {
      a: "a",
      b: ""
    }, [
      {
        message: `Expected a non empty string, actual ""`,
        path: ["b"]
      }
    ])
    expectSyncFailure(standardSchema, {
      a: "",
      b: "b"
    }, [
      {
        message: `Expected a non empty string, actual ""`,
        path: ["a"]
      }
    ])
  })
  it("sync decoding + sync first issue formatting", () => {
    const schema = Schema.Struct({
      a: Schema.NonEmptyString,
      b: Schema.NonEmptyString
    })
    const standardSchema = Schema.standardSchemaV1(schema, { errors: "first" })
    expectSyncSuccess(standardSchema, {
      a: "a",
      b: "b"
    }, {
      a: "a",
      b: "b"
    })
    expectSyncFailure(standardSchema, null, [
      {
        message: "Expected { readonly a: NonEmptyString; readonly b: NonEmptyString }, actual null",
        path: []
      }
    ])
    expectSyncFailure(standardSchema, "", [
      {
        message: `Expected { readonly a: NonEmptyString; readonly b: NonEmptyString }, actual ""`,
        path: []
      }
    ])
    expectSyncFailure(standardSchema, {
      a: "",
      b: ""
    }, [
      {
        message: `Expected a non empty string, actual ""`,
        path: ["a"]
      }
    ])
    expectSyncFailure(standardSchema, {
      a: "a",
      b: ""
    }, [
      {
        message: `Expected a non empty string, actual ""`,
        path: ["b"]
      }
    ])
    expectSyncFailure(standardSchema, {
      a: "",
      b: "b"
    }, [
      {
        message: `Expected a non empty string, actual ""`,
        path: ["a"]
      }
    ])
  })
})
