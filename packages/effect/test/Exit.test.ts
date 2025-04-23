import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { Exit } from "effect"

describe("Exit", () => {
  describe("toJSON", () => {
    it("succeed", () => {
      deepStrictEqual(Exit.succeed(1).toJSON(), {
        _id: "Exit",
        _tag: "Success",
        value: 1
      })
    })

    it("fail", () => {
      deepStrictEqual(Exit.fail("failure").toJSON(), {
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
      deepStrictEqual(Exit.fail(new MyError()).toJSON(), {
        _id: "Exit",
        _tag: "Failure",
        cause: {
          _id: "Cause",
          _tag: "Fail",
          failure: new MyError()
        }
      })
    })
  })

  describe("toString", () => {
    it("succeed", () => {
      deepStrictEqual(
        String(Exit.succeed(1)),
        `{
  "_id": "Exit",
  "_tag": "Success",
  "value": 1
}`
      )
    })

    it("fail", () => {
      deepStrictEqual(
        String(Exit.fail("failure")),
        `{
  "_id": "Exit",
  "_tag": "Failure",
  "cause": {
    "_id": "Cause",
    "_tag": "Fail",
    "failure": "failure"
  }
}`
      )
      class Error1 {
        readonly _tag = "WithTag"
      }
      deepStrictEqual(
        String(Exit.fail(new Error1())),
        `{
  "_id": "Exit",
  "_tag": "Failure",
  "cause": {
    "_id": "Cause",
    "_tag": "Fail",
    "failure": {
      "_tag": "WithTag"
    }
  }
}`
      )
    })
  })
})
