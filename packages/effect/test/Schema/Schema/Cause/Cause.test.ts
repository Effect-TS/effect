import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Cause, FiberId } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Cause", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.Cause({ error: S.NumberFromString, defect: S.Defect }))
  })

  it("decoding", async () => {
    const schema = S.Cause({ error: S.NumberFromString, defect: S.Defect })
    await Util.assertions.decoding.succeed(
      schema,
      { _tag: "Fail", error: "1" },
      Cause.fail(1)
    )
    await Util.assertions.decoding.succeed(
      schema,
      { _tag: "Empty" },
      Cause.empty
    )
    await Util.assertions.decoding.succeed(
      schema,
      {
        _tag: "Parallel",
        left: { _tag: "Fail", error: "1" },
        right: { _tag: "Empty" }
      },
      Cause.parallel(Cause.fail(1), Cause.empty)
    )
    await Util.assertions.decoding.succeed(
      schema,
      {
        _tag: "Sequential",
        left: { _tag: "Fail", error: "1" },
        right: { _tag: "Empty" }
      },
      Cause.sequential(Cause.fail(1), Cause.empty)
    )
    await Util.assertions.decoding.succeed(
      schema,
      {
        _tag: "Die",
        defect: { stack: "fail", message: "error" }
      },
      Cause.die(new Error("error", { cause: { stack: "fail", message: "error" } }))
    )
    await Util.assertions.decoding.succeed(
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

    await Util.assertions.decoding.fail(
      schema,
      null,
      `(CauseEncoded<NumberFromString> <-> Cause<number>)
└─ Encoded side transformation failure
   └─ Expected CauseEncoded<NumberFromString>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      {},
      `(CauseEncoded<NumberFromString> <-> Cause<number>)
└─ Encoded side transformation failure
   └─ CauseEncoded<NumberFromString>
      └─ { readonly _tag: "Empty" | "Fail" | "Die" | "Interrupt" | "Sequential" | "Parallel" }
         └─ ["_tag"]
            └─ is missing`
    )
    await Util.assertions.decoding.fail(
      schema,
      { _tag: "Parallel", left: { _tag: "Fail" }, right: { _tag: "Interrupt" } },
      `(CauseEncoded<NumberFromString> <-> Cause<number>)
└─ Encoded side transformation failure
   └─ CauseEncoded<NumberFromString>
      └─ { readonly _tag: "Parallel"; readonly left: CauseEncoded<NumberFromString>; readonly right: CauseEncoded<NumberFromString> }
         └─ ["left"]
            └─ CauseEncoded<NumberFromString>
               └─ { readonly _tag: "Fail"; readonly error: NumberFromString }
                  └─ ["error"]
                     └─ is missing`
    )
  })

  describe("encoding", () => {
    it("handles array-based defects without throwing", async () => {
      const schema = S.Cause({ error: S.String, defect: S.Defect })
      await Util.assertions.encoding.succeed(schema, Cause.die([{ toString: "" }]), {
        _tag: "Die",
        defect: "[{\"toString\":\"\"}]"
      })
    })

    it("should raise an error when a non-encodable Cause is passed", async () => {
      const schema = S.Cause({ error: S.String, defect: Util.Defect })
      await Util.assertions.encoding.fail(
        schema,
        Cause.die(null),
        `(CauseEncoded<string> <-> Cause<string>)
└─ Type side transformation failure
   └─ Cause<string>
      └─ CauseEncoded<string>
         └─ { readonly _tag: "Die"; readonly defect: object }
            └─ ["defect"]
               └─ Expected object, actual null`
      )
    })

    it("using the built-in Defect schema as defect argument", async () => {
      const schema = S.Cause({ error: S.NumberFromString, defect: S.Defect })
      const schemaUnknown = S.Cause({ error: S.NumberFromString, defect: S.Unknown })

      await Util.assertions.encoding.succeed(schema, Cause.fail(1), { _tag: "Fail", error: "1" })
      await Util.assertions.encoding.succeed(schema, Cause.empty, { _tag: "Empty" })
      await Util.assertions.encoding.succeed(schema, Cause.parallel(Cause.fail(1), Cause.empty), {
        _tag: "Parallel",
        left: { _tag: "Fail", error: "1" },
        right: { _tag: "Empty" }
      })
      await Util.assertions.encoding.succeed(schema, Cause.sequential(Cause.fail(1), Cause.empty), {
        _tag: "Sequential",
        left: { _tag: "Fail", error: "1" },
        right: { _tag: "Empty" }
      })
      await Util.assertions.encoding.succeed(schema, Cause.die("fail"), {
        _tag: "Die",
        defect: "fail"
      })
      await Util.assertions.encoding.succeed(
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
      assertTrue(failWithStack._tag === "Die")
      deepStrictEqual(failWithStack.defect, {
        name: "Error",
        message: "fail"
      })

      failWithStack = S.encodeSync(schemaUnknown)(Cause.die(new Error("fail")))
      assertTrue(failWithStack._tag === "Die")
      strictEqual((failWithStack.defect as Error).message, "fail")
    })
  })
})
