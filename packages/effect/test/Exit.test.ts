import * as Cause from "effect/Cause"
import * as Exit from "effect/Exit"
import { describe, expect, it } from "vitest"

describe("Exit", () => {
  describe("toJSON", () => {
    it("succeed", () => {
      expect(Exit.succeed(1).toJSON()).toEqual({
        _id: "Exit",
        _tag: "Success",
        value: 1
      })
    })

    it("fail", () => {
      expect(Exit.fail("failure").toJSON()).toEqual({
        _id: "Exit",
        _tag: "Failure",
        cause: {
          _id: "Cause",
          _tag: "Fail",
          failure: "failure"
        }
      })
      class MyError {
        readonly _tag = "MyError"
      }
      expect(Exit.fail(new MyError()).toJSON()).toEqual({
        _id: "Exit",
        _tag: "Failure",
        cause: {
          _id: "Cause",
          _tag: "Fail",
          failure: {
            _tag: "MyError"
          }
        }
      })
    })
  })

  describe("toString", () => {
    it("succeed", () => {
      expect(String(Exit.succeed(1))).toEqual(`{
  "_id": "Exit",
  "_tag": "Success",
  "value": 1
}`)
    })

    it("fail", () => {
      expect(String(Exit.fail("failure"))).toEqual(`{
  "_id": "Exit",
  "_tag": "Failure",
  "cause": {
    "_id": "Cause",
    "_tag": "Fail",
    "failure": "failure"
  }
}`)
      class Error1 {
        readonly _tag = "WithTag"
      }
      expect(String(Exit.fail(new Error1()))).toEqual(`{
  "_id": "Exit",
  "_tag": "Failure",
  "cause": {
    "_id": "Cause",
    "_tag": "Fail",
    "failure": {
      "_tag": "WithTag"
    }
  }
}`)
    })
  })

  it("vitest equality", () => {
    expect(Exit.succeed(1)).toEqual(Exit.succeed(1))
    expect(Exit.fail("failure")).toEqual(Exit.fail("failure"))
    expect(Exit.die("defect")).toEqual(Exit.die("defect"))

    expect(Exit.succeed(1)).not.toEqual(Exit.succeed(2))
    expect(Exit.fail("failure")).not.toEqual(Exit.fail("failure1"))
    expect(Exit.die("failure")).not.toEqual(Exit.fail("failure1"))
    expect(Exit.die("failure")).not.toEqual(Exit.fail("failure1"))
    expect(Exit.failCause(Cause.sequential(Cause.fail("f1"), Cause.fail("f2")))).not.toEqual(
      Exit.failCause(Cause.sequential(Cause.fail("f1"), Cause.fail("f3")))
    )
  })
})
