import express from "express"

import { expressM } from "../resources/expressM"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import * as M from "@matechs/core/Managed"
import * as O from "@matechs/core/Option"
import * as H from "@matechs/http-client"
import * as J from "@matechs/test-jest"

/* istanbul ignore file */

export const headersMiddlewareSpec = J.testM(
  "headers middleware",
  M.use(expressM(4015), ({ app }) =>
    T.Do()
      .do(
        T.sync(() => {
          app.get("/middle", express.json(), (req, res) => {
            res.send({
              foo: req.header("foo")
            })
          })
        })
      )
      .bindL("get", () => T.result(H.get("http://127.0.0.1:4015/middle")))
      .return(({ get }) => {
        J.assert.deepStrictEqual(Ex.isDone(get), true)
        J.assert.deepStrictEqual(
          Ex.isDone(get) && get.value.body,
          O.some({ foo: "bar" })
        )
      })
  )
)
