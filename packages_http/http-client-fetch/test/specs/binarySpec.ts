import express from "express"

import { expressM } from "../resources/expressM"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import * as M from "@matechs/core/Managed"
import * as O from "@matechs/core/Option"
import * as H from "@matechs/http-client"
import * as J from "@matechs/test-jest"

/* istanbul ignore file */

export const binarySpec = J.testM(
  "binary",
  M.use(expressM(4017), ({ app }) =>
    T.Do()
      .do(
        T.sync(() => {
          app.use("/binary", express.raw(), (req, res) => {
            const body = req.body as Buffer
            res.send(body)
          })
        })
      )
      .bindL("post", () =>
        T.result(
          H.postBinaryGetBinary(
            "http://127.0.0.1:4017/binary",
            Buffer.from(`{ foo: "bar" }`)
          )
        )
      )
      .bindL("put", () =>
        T.result(
          H.putBinaryGetBinary(
            "http://127.0.0.1:4017/binary",
            Buffer.from(`{ foo: "bar" }`)
          )
        )
      )
      .bindL("patch", () =>
        T.result(
          H.patchBinaryGetBinary(
            "http://127.0.0.1:4017/binary",
            Buffer.from(`{ foo: "bar" }`)
          )
        )
      )
      .bindL("del", () =>
        T.result(H.delBinaryGetBinary("http://127.0.0.1:4017/binary"))
      )
      .return(({ del, patch, post, put }) => {
        const binaryString = (b: O.Option<Buffer>): O.Option<string> =>
          pipe(
            b,
            O.map((b) => b.toString("utf-8"))
          )

        J.assert.deepStrictEqual(Ex.isDone(post), true)
        J.assert.deepStrictEqual(
          Ex.isDone(post) && binaryString(post.value.body),
          O.some(`{ foo: "bar" }`)
        )

        J.assert.deepStrictEqual(Ex.isDone(put), true)
        J.assert.deepStrictEqual(
          Ex.isDone(put) && binaryString(put.value.body),
          O.some(`{ foo: "bar" }`)
        )

        J.assert.deepStrictEqual(Ex.isDone(patch), true)
        J.assert.deepStrictEqual(
          Ex.isDone(patch) && binaryString(patch.value.body),
          O.some(`{ foo: "bar" }`)
        )

        J.assert.deepStrictEqual(Ex.isDone(del), true)
        J.assert.deepStrictEqual(
          Ex.isDone(del) && binaryString(del.value.body),
          O.some(``)
        )
      })
  )
)
