import "isomorphic-fetch"
import * as assert from "assert"

import * as KOA from "../src"

import { sequenceT } from "@matechs/core/Base/Apply"
import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import * as M from "@matechs/core/Managed"
import * as O from "@matechs/core/Option"
import * as H from "@matechs/http-client"
import * as L from "@matechs/http-client-fetch"

describe("Koa", () => {
  it("should use koa", async () => {
    const config = T.Do()
      .do(
        KOA.route(
          "post",
          "/",
          KOA.accessReqM()((r) =>
            T.pure(KOA.routeResponse(r.path === "/" ? 200 : 500)({ res: 1 }))
          )
        )
      )
      .do(
        KOA.route(
          "post",
          "/access",
          KOA.accessReq()((r) =>
            KOA.routeResponse(r.path === "/access" ? 200 : 500)({ res: 1 })
          )
        )
      )
      .do(
        pipe(
          T.sequenceT(
            KOA.route(
              "post",
              "/",
              KOA.accessReqM()((r) =>
                T.pure(KOA.routeResponse(r.path === "/sub" ? 200 : 500)({ res: 1 }))
              )
            ),
            KOA.route(
              "post",
              "/access",
              KOA.accessReq()((r) =>
                KOA.routeResponse(r.path === "/sub/access" ? 200 : 500)({ res: 1 })
              )
            )
          ),
          KOA.withSubRouter("/sub")
        )
      )
      .do(
        KOA.route(
          "post",
          "/delay",
          T.delay(T.pure(KOA.routeResponse(200)({ res: 1 })), 0)
        )
      )
      .do(KOA.route("post", "/bad", T.raiseError(KOA.routeError(500)({ res: 1 }))))
      .do(KOA.route("post", "/bad2", T.raiseAbort("abort")))
      .do(KOA.route("post", "/bad3", T.raiseInterrupt))
      .do(
        KOA.middleware((ctx, next) => {
          ctx.set("X-Request-Id", "my-id")
          return next()
        })
      )
      .do(
        KOA.middlewareM((cont) =>
          T.Do()
            .do(
              KOA.accessMiddlewareReq()((ctx) => ctx.set("X-Request-Id-2", "my-id-2"))
            )
            .do(cont)
            .done()
        )
      )
      .do(
        KOA.accessApp((app) => {
          if (!app) {
            throw new Error("Aborted app not found")
          }
        })
      )
      .do(
        KOA.accessAppM((app) =>
          T.trySync(() => {
            if (!app) {
              throw new Error("Aborted app not found")
            }
          })
        )
      )
      .done()

    const program = T.Do()
      .bindL("res", () =>
        pipe(
          H.post("http://127.0.0.1:3004/", {}),
          T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
          T.result
        )
      )
      .bindL("res2", () =>
        pipe(
          H.post("http://127.0.0.1:3004/bad", {}),
          T.mapError(
            (s) =>
              s._tag === H.HttpErrorReason.Response && s.response && s.response.body
          ),
          T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
          T.result
        )
      )
      .bindL("res3", () =>
        pipe(
          H.post("http://127.0.0.1:3004/bad2", {}),
          T.mapError(
            (s) =>
              s._tag === H.HttpErrorReason.Response && s.response && s.response.body
          ),
          T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
          T.result
        )
      )
      .bindL("res4", () =>
        pipe(
          H.post("http://127.0.0.1:3004/bad3", {}),
          T.mapError(
            (s) =>
              s._tag === H.HttpErrorReason.Response && s.response && s.response.body
          ),
          T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
          T.result
        )
      )
      .bindL("res5", () =>
        pipe(
          H.post("http://127.0.0.1:3004/access", {}),
          T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
          T.result
        )
      )
      .bindL("res6", () =>
        pipe(
          H.post("http://127.0.0.1:3004/sub", {}),
          T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
          T.result
        )
      )
      .bindL("res7", () =>
        pipe(
          H.post("http://127.0.0.1:3004/sub/access", {}),
          T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
          T.result
        )
      )
      .bindL("res8", () =>
        pipe(
          H.post("http://127.0.0.1:3004/", {}),
          T.chain((s) =>
            T.fromOption(() => new Error("empty body"))(
              sequenceT(O.optionMonad)(
                O.fromNullable(s.headers["x-request-id"]),
                O.fromNullable(s.headers["x-request-id-2"])
              )
            )
          ),
          T.result
        )
      )
      .bindL("res9", () =>
        pipe(
          H.post("http://127.0.0.1:3004/delay", {}),
          T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
          T.result
        )
      )
      .done()

    await pipe(
      T.chain_(config, (_) => program),
      M.provide(KOA.managedKoa(3004, "127.0.0.1")),
      KOA.provideKoa,
      T.provide(L.client(fetch)),
      T.runToPromise
    ).then(({ res, res2, res3, res4, res5, res6, res7, res8, res9 }) => {
      assert.deepStrictEqual(res, Ex.done({ res: 1 }))
      assert.deepStrictEqual(res5, Ex.done({ res: 1 }))
      assert.deepStrictEqual(res6, Ex.done({ res: 1 }))
      assert.deepStrictEqual(res7, Ex.done({ res: 1 }))
      assert.deepStrictEqual(res9, Ex.done({ res: 1 }))
      assert.deepStrictEqual(res8, Ex.done(["my-id", "my-id-2"]))
      assert.deepStrictEqual(res2, Ex.raise(O.some('{"res":1}')))
      assert.deepStrictEqual(
        res3,
        Ex.raise(O.some('{"status":"aborted","with":"abort"}'))
      )
      assert.deepStrictEqual(res4, Ex.raise(O.some('{"status":"interrupted"}')))
    })
  })
})
