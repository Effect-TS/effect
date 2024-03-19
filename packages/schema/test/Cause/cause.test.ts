import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { Cause, FiberId } from "effect"
import { assert, describe, it } from "vitest"

describe("Cause > cause", () => {
  it("property tests", () => {
    Util.roundtrip(S.cause({ error: S.NumberFromString, defect: S.unknown }))
  })

  it("decoding", async () => {
    const schema = S.cause({ error: S.NumberFromString })
    await Util.expectDecodeUnknownSuccess(
      schema,
      { _tag: "Fail", error: "1" },
      Cause.fail(1)
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      { _tag: "Empty" },
      Cause.empty
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      {
        _tag: "Parallel",
        left: { _tag: "Fail", error: "1" },
        right: { _tag: "Empty" }
      },
      Cause.parallel(Cause.fail(1), Cause.empty)
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      {
        _tag: "Sequential",
        left: { _tag: "Fail", error: "1" },
        right: { _tag: "Empty" }
      },
      Cause.sequential(Cause.fail(1), Cause.empty)
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      {
        _tag: "Die",
        defect: { stack: "fail", message: "error" }
      },
      Cause.die(new Error("error"))
    )
    await Util.expectDecodeUnknownSuccess(
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

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `(CauseEncoded<NumberFromString> <-> Cause<number>)
└─ Encoded side transformation failure
   └─ Expected CauseEncoded<NumberFromString>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      {},
      `(CauseEncoded<NumberFromString> <-> Cause<number>)
└─ Encoded side transformation failure
   └─ CauseEncoded<NumberFromString>
      └─ { _tag: "Empty" | "Fail" | "Die" | "Interrupt" | "Sequential" | "Parallel" }
         └─ ["_tag"]
            └─ is missing`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { _tag: "Parallel", left: { _tag: "Fail" }, right: { _tag: "Interrupt" } },
      `(CauseEncoded<NumberFromString> <-> Cause<number>)
└─ Encoded side transformation failure
   └─ CauseEncoded<NumberFromString>
      └─ Union member
         └─ { _tag: "Parallel"; left: CauseEncoded<NumberFromString>; right: CauseEncoded<NumberFromString> }
            └─ ["left"]
               └─ CauseEncoded<NumberFromString>
                  └─ Union member
                     └─ { _tag: "Fail"; error: NumberFromString }
                        └─ ["error"]
                           └─ is missing`
    )
  })

  it("encoding", async () => {
    const schema = S.cause({ error: S.NumberFromString })
    const schemaUnknown = S.cause({ error: S.NumberFromString, defect: S.unknown })

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
    assert(
      typeof failWithStack.defect === "object" && failWithStack.defect !== null && "message" in failWithStack.defect &&
        "stack" in failWithStack.defect && "name" in failWithStack.defect
    )
    assert.strictEqual(failWithStack.defect.name, "Error")
    assert.strictEqual(failWithStack.defect.message, "fail")
    assert.include(failWithStack.defect.stack, "cause.test.ts")

    failWithStack = S.encodeSync(schemaUnknown)(Cause.die(new Error("fail")))
    assert(failWithStack._tag === "Die")
    assert.strictEqual((failWithStack.defect as Error).message, "fail")
    assert.include((failWithStack.defect as any).stack, "cause.test.ts")
  })
})
