import express from "express"

import { expressM } from "../resources/expressM"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import * as M from "@matechs/core/Managed"
import * as O from "@matechs/core/Option"
import * as H from "@matechs/http-client"
import * as J from "@matechs/test-jest"

/* istanbul ignore file */

export const dataSpec = J.testM(
  "data",
  M.use(expressM(4013), ({ app }) =>
    T.Do()
      .do(
        T.sync(() => {
          app.use("/data", express.urlencoded({ extended: true }), (req, res) => {
            res.send({
              foo: req.body["foo"]
            })
          })
        })
      )
      .bindL("post", () =>
        T.result(H.postData("http://127.0.0.1:4013/data", { foo: "bar" }))
      )
      .bindL("put", () =>
        T.result(H.postData("http://127.0.0.1:4013/data", { foo: "bar" }))
      )
      .bindL("patch", () =>
        T.result(H.postData("http://127.0.0.1:4013/data", { foo: "bar" }))
      )
      .bindL("del", () =>
        T.result(H.postData("http://127.0.0.1:4013/data", { foo: "bar" }))
      )
      .return(({ del, patch, post, put }) => {
        J.assert.deepStrictEqual(Ex.isDone(post), true)
        J.assert.deepStrictEqual(
          Ex.isDone(post) && post.value.body,
          O.some({ foo: "bar" })
        )

        J.assert.deepStrictEqual(Ex.isDone(put), true)
        J.assert.deepStrictEqual(
          Ex.isDone(put) && put.value.body,
          O.some({ foo: "bar" })
        )

        J.assert.deepStrictEqual(Ex.isDone(patch), true)
        J.assert.deepStrictEqual(
          Ex.isDone(patch) && patch.value.body,
          O.some({ foo: "bar" })
        )

        J.assert.deepStrictEqual(Ex.isDone(del), true)
        J.assert.deepStrictEqual(
          Ex.isDone(del) && del.value.body,
          O.some({ foo: "bar" })
        )
      })
  )
)
