import * as H from "@matechs/http-client"
import { T, Ex, O, pipe, M } from "@matechs/prelude"
import * as J from "@matechs/test-jest"
import express from "express"

import { expressM } from "../resources/expressM"

/* istanbul ignore file */

export const headersSpec = J.testM(
  "headers",
  M.use(expressM(4012), ({ app }) =>
    T.Do()
      .do(
        T.sync(() => {
          app.get("/h", express.json(), (req, res) => {
            res.send({
              foo: req.header("foo")
            })
          })
        })
      )
      .bindL("get", () =>
        T.result(
          pipe(
            H.get("http://127.0.0.1:4012/h"),
            H.withHeaders({
              foo: "bar"
            })
          )
        )
      )
      .return(({ get }) => {
        J.assert.deepStrictEqual(Ex.isDone(get), true)
        J.assert.deepStrictEqual(
          Ex.isDone(get) && get.value.body,
          O.some({ foo: "bar" })
        )
      })
  )
)
