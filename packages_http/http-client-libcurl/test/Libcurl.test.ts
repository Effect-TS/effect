import assert from "assert"

import express from "express"

import { libcurl } from "../src"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"
import * as H from "@matechs/http-client"

function run<E, A>(eff: T.AsyncRE<H.RequestEnv, E, A>): Promise<Ex.Exit<E, A>> {
  return T.runToPromiseExit(
    pipe(
      eff,
      T.provide(
        libcurl({
          requestTransformer: (_) => {
            _.setOpt("FORBID_REUSE", 1)
            return _
          }
        })
      ),
      T.provide(
        H.middlewareStack([
          H.withPathHeaders(
            { foo: "bar" },
            (path) => path === "http://127.0.0.1:4005/middle",
            true
          )
        ])
      )
    )
  )
}

function timer<S, R, E, A>(_: T.Effect<S, R, E, A>) {
  return T.Do()
    .bind(
      "s",
      T.sync(() => new Date())
    )
    .bind("r", _)
    .bind(
      "e",
      T.sync(() => new Date())
    )
    .doL(({ e, s }) =>
      T.sync(() => {
        assert.strictEqual(e.getTime() - s.getTime() < 250, true)
      })
    )
    .return(({ r }) => r)
}

describe("Libcurl", () => {
  jest.setTimeout(10000)

  it("post-patch-put-del", async () => {
    const app = express()

    app.post("/post", express.json(), (req, res) => {
      res.send(req.body)
    })

    app.put("/put", express.json(), (req, res) => {
      res.send(req.body)
    })

    app.patch("/patch", express.json(), (req, res) => {
      res.send(req.body)
    })

    app.delete("/delete", express.json(), (req, res) => {
      res.send(req.body)
    })

    const s = app.listen(4001)

    const post = await run(
      timer(
        H.post("http://127.0.0.1:4001/post", {
          foo: "bar"
        })
      )
    )

    const postText = await run(
      timer(
        H.postReturnText("http://127.0.0.1:4001/post", {
          foo: "bar"
        })
      )
    )

    const postNoBody = await run(timer(H.post("http://127.0.0.1:4001/post", {})))

    const put = await run(
      timer(
        H.put("http://127.0.0.1:4001/put", {
          foo: "bar"
        })
      )
    )

    const patch = await run(
      timer(
        H.patch("http://127.0.0.1:4001/patch", {
          foo: "bar"
        })
      )
    )

    const del = await run(timer(H.del("http://127.0.0.1:4001/delete", { foo: "bar" })))

    await new Promise((res) =>
      s.close(() => {
        res()
      })
    )

    assert.deepStrictEqual(Ex.isDone(post), true)
    assert.deepStrictEqual(Ex.isDone(post) && post.value.body, O.some({ foo: "bar" }))

    assert.deepStrictEqual(Ex.isDone(postText), true)
    assert.deepStrictEqual(
      Ex.isDone(postText) && postText.value.body,
      O.some(JSON.stringify({ foo: "bar" }))
    )

    assert.deepStrictEqual(Ex.isDone(postNoBody), true)
    assert.deepStrictEqual(Ex.isDone(postNoBody) && postNoBody.value.body, O.some({}))

    assert.deepStrictEqual(Ex.isDone(put), true)
    assert.deepStrictEqual(Ex.isDone(put) && put.value.body, O.some({ foo: "bar" }))

    assert.deepStrictEqual(Ex.isDone(patch), true)
    assert.deepStrictEqual(Ex.isDone(patch) && patch.value.body, O.some({ foo: "bar" }))

    assert.deepStrictEqual(Ex.isDone(del), true)
    assert.deepStrictEqual(Ex.isDone(del) && del.value.body, O.some({ foo: "bar" }))
  })

  it("get 404", async () => {
    const app = express()

    const s = app.listen(4006)

    const result = await run(
      pipe(
        timer(H.get("http://127.0.0.1:4006/")),
        T.mapError(
          H.foldHttpError(
            (_) => 0,
            ({ status }) => status
          )
        )
      )
    )

    await new Promise((res) =>
      s.close(() => {
        res()
      })
    )

    assert.deepStrictEqual(Ex.isRaise(result), true)
    assert.deepStrictEqual(Ex.isRaise(result) && result.error, 404)
  })

  it("headers", async () => {
    const app = express()

    app.get("/h", express.json(), (req, res) => {
      res.send({
        foo: req.header("foo")
      })
    })

    const s = app.listen(4002)

    const result = await run(
      pipe(
        timer(H.get("http://127.0.0.1:4002/h")),
        H.withHeaders({
          foo: "bar"
        })
      )
    )

    await new Promise((res) =>
      s.close(() => {
        res()
      })
    )

    assert.deepStrictEqual(Ex.isDone(result), true)
    assert.deepStrictEqual(
      Ex.isDone(result) && result.value.body,
      O.some({ foo: "bar" })
    )
  })

  it("headers middleware", async () => {
    const app = express()

    app.get("/middle", express.json(), (req, res) => {
      res.send({
        foo: req.header("foo")
      })
    })

    const s = app.listen(4005)

    const result = await run(timer(H.get("http://127.0.0.1:4005/middle")))

    await new Promise((res) =>
      s.close(() => {
        res()
      })
    )

    assert.deepStrictEqual(Ex.isDone(result), true)
    assert.deepStrictEqual(
      Ex.isDone(result) && result.value.body,
      O.some({ foo: "bar" })
    )
  })

  it("replace headers", async () => {
    const app = express()

    app.get("/h", express.json(), (req, res) => {
      res.send({
        foo: req.header("foo"),
        bar: req.header("bar")
      })
    })

    const s = app.listen(4004)

    const result = await run(
      pipe(
        timer(H.get("http://127.0.0.1:4004/h")),
        H.withHeaders(
          {
            foo: "baz"
          },
          true
        ),
        H.withHeaders({
          foo: "bar",
          bar: "baz"
        })
      )
    )

    await new Promise((res) =>
      s.close(() => {
        res()
      })
    )

    assert.deepStrictEqual(Ex.isDone(result), true)
    assert.deepStrictEqual(
      Ex.isDone(result) && result.value.body,
      O.some({ foo: "baz" })
    )
  })

  it("data", async () => {
    const app = express()

    app.use("/data", express.urlencoded({ extended: true }), (req, res) => {
      res.send({
        foo: req.body["foo"]
      })
    })

    const s = app.listen(4003)

    const post = await run(
      timer(H.postData("http://127.0.0.1:4003/data", { foo: "bar" }))
    )

    const put = await run(
      timer(H.putData("http://127.0.0.1:4003/data", { foo: "bar" }))
    )

    const patch = await run(
      timer(H.patchData("http://127.0.0.1:4003/data", { foo: "bar" }))
    )

    const del = await run(
      timer(H.delData("http://127.0.0.1:4003/data", { foo: "bar" }))
    )

    await new Promise((res) =>
      s.close(() => {
        res()
      })
    )

    assert.deepStrictEqual(Ex.isDone(post), true)
    assert.deepStrictEqual(Ex.isDone(post) && post.value.body, O.some({ foo: "bar" }))

    assert.deepStrictEqual(Ex.isDone(put), true)
    assert.deepStrictEqual(Ex.isDone(put) && put.value.body, O.some({ foo: "bar" }))

    assert.deepStrictEqual(Ex.isDone(patch), true)
    assert.deepStrictEqual(Ex.isDone(patch) && patch.value.body, O.some({ foo: "bar" }))

    assert.deepStrictEqual(Ex.isDone(del), true)
    assert.deepStrictEqual(Ex.isDone(del) && del.value.body, O.some({ foo: "bar" }))
  })

  it.skip("binary", async () => {
    // TODO: make it work
    const app = express()

    app.use("/binary", express.raw(), (req, res) => {
      const body = req.body as Buffer
      res.send(body)
    })

    const s = app.listen(4017)

    const post = await run(
      pipe(
        H.postBinaryGetBinary(
          "http://127.0.0.1:4017/binary",
          Buffer.from(`{ foo: "bar" }`)
        )
      )
    )

    const put = await run(
      pipe(
        H.putBinaryGetBinary(
          "http://127.0.0.1:4017/binary",
          Buffer.from(`{ foo: "bar" }`)
        )
      )
    )

    const patch = await run(
      pipe(
        H.patchBinaryGetBinary(
          "http://127.0.0.1:4017/binary",
          Buffer.from(`{ foo: "bar" }`)
        )
      )
    )

    const del = await run(pipe(H.delBinaryGetBinary("http://127.0.0.1:4017/binary")))

    await new Promise((res) =>
      s.close(() => {
        res()
      })
    )

    const binaryString = (b: O.Option<Buffer>): O.Option<string> =>
      pipe(
        b,
        O.map((b) => b.toString("utf-8"))
      )

    assert.deepStrictEqual(post, true)
    assert.deepStrictEqual(Ex.isDone(post), true)
    assert.deepStrictEqual(
      Ex.isDone(post) && binaryString(post.value.body),
      O.some(`{ foo: "bar" }`)
    )

    assert.deepStrictEqual(Ex.isDone(put), true)
    assert.deepStrictEqual(
      Ex.isDone(put) && binaryString(put.value.body),
      O.some(`{ foo: "bar" }`)
    )

    assert.deepStrictEqual(Ex.isDone(patch), true)
    assert.deepStrictEqual(
      Ex.isDone(patch) && binaryString(patch.value.body),
      O.some(`{ foo: "bar" }`)
    )

    assert.deepStrictEqual(Ex.isDone(del), true)
    assert.deepStrictEqual(Ex.isDone(del) && binaryString(del.value.body), O.some(``)) // TODO: Verify spec; del binary body does not touch the server
  })

  it("get https", async () => {
    const result = await run(H.get("https://jsonplaceholder.typicode.com/todos/1"))

    assert.deepStrictEqual(Ex.isDone(result), true)
    assert.deepStrictEqual(
      Ex.isDone(result) && result.value.body,
      O.some({
        userId: 1,
        id: 1,
        title: "delectus aut autem",
        completed: false
      })
    )
  })

  it("malformed", async () => {
    const result = await run(H.get("ht-ps://wrong.com/todos/1"))

    expect(Ex.isRaise(result)).toStrictEqual(true)
    expect(
      Ex.isRaise(result) &&
        result.error._tag === H.HttpErrorReason.Request &&
        result.error.error
    ).toEqual(new Error("Unsupported protocol"))
  })

  it("cancel", async () => {
    let res

    const cancel = T.run(
      pipe(H.get("https://jsonplaceholder.typicode.com/todos/1"), T.provide(libcurl())),
      (r) => {
        res = r
      }
    )

    cancel()

    assert.deepStrictEqual(res && Ex.isInterrupt(res), true)
  })
})
