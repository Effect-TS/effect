import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { Cause, FiberId } from "effect"
import { assert, describe, it } from "vitest"

describe("Cause/cause", () => {
  it("property tests", () => {
    Util.roundtrip(S.cause(S.NumberFromString, S.unknown))
  })

  it("decoding", async () => {
    const schema = S.cause(S.NumberFromString)
    await Util.expectParseSuccess(
      schema,
      { _tag: "Fail", error: "1" },
      Cause.fail(1)
    )
    await Util.expectParseSuccess(
      schema,
      { _tag: "Empty" },
      Cause.empty
    )
    await Util.expectParseSuccess(
      schema,
      {
        _tag: "Parallel",
        left: { _tag: "Fail", error: "1" },
        right: { _tag: "Empty" }
      },
      Cause.parallel(Cause.fail(1), Cause.empty)
    )
    await Util.expectParseSuccess(
      schema,
      {
        _tag: "Sequential",
        left: { _tag: "Fail", error: "1" },
        right: { _tag: "Empty" }
      },
      Cause.sequential(Cause.fail(1), Cause.empty)
    )
    await Util.expectParseSuccess(
      schema,
      {
        _tag: "Die",
        defect: { stack: "fail", message: "error" }
      },
      Cause.die({ stack: "fail", message: "error" })
    )
    await Util.expectParseSuccess(
      schema,
      {
        _tag: "Interrupt",
        fiberId: {
          _tag: "Composite",
          left: {
            _tag: "Runtime",
            id: 1,
            startTimeMillis: 1000
          },
          right: {
            _tag: "None"
          }
        }
      },
      Cause.interrupt(FiberId.composite(FiberId.runtime(1, 1000), FiberId.none))
    )

    await Util.expectParseFailure(
      schema,
      null,
      `Expected <anonymous type literal schema>, actual null`
    )
    await Util.expectParseFailure(
      schema,
      {},
      `/_tag is missing`
    )
    await Util.expectParseFailure(
      schema,
      { _tag: "Parallel", left: { _tag: "Fail" }, right: { _tag: "Interrupt" } },
      `union member: /left union member: /error is missing`
    )
  })

  it("encoding", async () => {
    const schema = S.cause(S.NumberFromString)
    const schemaUnknown = S.cause(S.NumberFromString, S.unknown)

    await Util.expectEncodeSuccess(schema, Cause.fail(1), { _tag: "Fail", error: "1" })
    await Util.expectEncodeSuccess(schema, Cause.empty, { _tag: "Empty" })
    await Util.expectEncodeSuccess(schema, Cause.parallel(Cause.fail(1), Cause.empty), {
      _tag: "Parallel",
      left: { _tag: "Fail", error: "1" },
      right: { _tag: "Empty" }
    })
    await Util.expectEncodeSuccess(schema, Cause.sequential(Cause.fail(1), Cause.empty), {
      _tag: "Sequential",
      left: { _tag: "Fail", error: "1" },
      right: { _tag: "Empty" }
    })
    await Util.expectEncodeSuccess(schema, Cause.die("fail"), {
      _tag: "Die",
      defect: "fail"
    })
    await Util.expectEncodeSuccess(
      schema,
      Cause.interrupt(FiberId.composite(FiberId.runtime(1, 1000), FiberId.none)),
      {
        _tag: "Interrupt",
        fiberId: {
          _tag: "Composite",
          left: {
            _tag: "Runtime",
            id: 1,
            startTimeMillis: 1000
          },
          right: {
            _tag: "None"
          }
        }
      }
    )

    let failWithStack = S.encodeSync(schema)(Cause.die(new Error("fail")))
    assert(failWithStack._tag === "Die")
    assert.include(failWithStack.defect, "Error: fail")
    assert.include(failWithStack.defect, "cause.test.ts")

    failWithStack = S.encodeSync(schemaUnknown)(Cause.die(new Error("fail")))
    assert(failWithStack._tag === "Die")
    assert.strictEqual((failWithStack.defect as any).message, "fail")
    assert.include((failWithStack.defect as any).stack, "cause.test.ts")
  })
})
