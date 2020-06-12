import "isomorphic-fetch"
import * as assert from "assert"

import * as EX from "../src"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import { Empty } from "@matechs/core/Layer"
import * as O from "@matechs/core/Option"
import * as H from "@matechs/http-client"
import * as L from "@matechs/http-client-fetch"

describe("Express", () => {
  it("should use express", async () => {
    const Routes = Empty.withMany(
      EX.Route(
        "post",
        "/",
        EX.accessReqM((r) =>
          T.pure(EX.routeResponse(r.path === "/" ? 200 : 500)({ res: 1 }))
        )
      ),
      EX.Route(
        "post",
        "/access",
        EX.accessReq((r) =>
          EX.routeResponse(r.path === "/access" ? 200 : 500)({ res: 1 })
        )
      ),
      EX.Route("post", "/bad", T.raiseError(EX.routeError(500)({ res: 1 }))),
      EX.Route("post", "/bad2", T.raiseAbort("abort")),
      EX.Route("post", "/bad3", T.raiseInterrupt)
    )

    const program = T.Do()
      .bindL("res1", () =>
        pipe(
          H.post("http://127.0.0.1:3003/", {}),
          T.chain((s) => T.encaseOption(s.body, () => new Error("empty body"))),
          T.result
        )
      )
      .bindL("res2", () =>
        pipe(
          H.post("http://127.0.0.1:3003/bad", {}),
          T.mapError(
            (s) =>
              s._tag === H.HttpErrorReason.Response && s.response && s.response.body
          ),
          T.chain((s) => T.encaseOption(s.body, () => new Error("empty body"))),
          T.result
        )
      )
      .bindL("res3", () =>
        pipe(
          H.post("http://127.0.0.1:3003/bad2", {}),
          T.mapError(
            (s) =>
              s._tag === H.HttpErrorReason.Response && s.response && s.response.body
          ),
          T.chain((s) => T.encaseOption(s.body, () => new Error("empty body"))),
          T.result
        )
      )
      .bindL("res4", () =>
        pipe(
          H.post("http://127.0.0.1:3003/bad3", {}),
          T.mapError(
            (s) =>
              s._tag === H.HttpErrorReason.Response && s.response && s.response.body
          ),
          T.chain((s) => T.encaseOption(s.body, () => new Error("empty body"))),
          T.result
        )
      )
      .bindL("res5", () =>
        pipe(
          H.post("http://127.0.0.1:3003/access", {}),
          T.chain((s) => T.encaseOption(s.body, () => new Error("empty body"))),
          T.result
        )
      )
      .done()

    const main = pipe(
      program,
      Routes.with(EX.Express(3003, "127.0.0.1")).with(L.Client(fetch)).use
    )

    await pipe(main, T.runToPromise).then(({ res1, res2, res3, res4, res5 }) => {
      assert.deepStrictEqual(res1, Ex.done({ res: 1 }))
      assert.deepStrictEqual(res2, Ex.raise(O.some(`{"res":1}`)))
      assert.deepStrictEqual(
        res3,
        Ex.raise(O.some(`{"status":"aborted","with":"abort"}`))
      )
      assert.deepStrictEqual(res4, Ex.raise(O.some(`{"status":"interrupted"}`)))
      assert.deepStrictEqual(res5, Ex.done({ res: 1 }))
    })
  })
})
