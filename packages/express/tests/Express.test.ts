import "isomorphic-fetch";
import * as assert from "assert";
import { effect as T, managed as M } from "@matechs/effect";
import { Do } from "fp-ts-contrib/lib/Do";
import * as EX from "../src";
import * as H from "@matechs/http-client";
import * as L from "@matechs/http-client-fetch";
import { pipe } from "fp-ts/lib/pipeable";
import { raise, done } from "@matechs/effect/lib/original/exit";
import { some } from "fp-ts/lib/Option";

describe("Express", () => {
  it("should use express", async () => {
    const routes = Do(T.effect)
      .do(
        EX.route(
          "post",
          "/",
          EX.accessReqM((r) => T.pure(EX.routeResponse(r.path === "/" ? 200 : 500, { res: 1 })))
        )
      )
      .do(
        EX.route(
          "post",
          "/access",
          EX.accessReq((r) => EX.routeResponse(r.path === "/access" ? 200 : 500, { res: 1 }))
        )
      )
      .do(EX.route("post", "/bad", T.raiseError(EX.routeError(500, { res: 1 }))))
      .do(EX.route("post", "/bad2", T.raiseAbort("abort")))
      .do(EX.route("post", "/bad3", T.raiseInterrupt))
      .do(
        EX.accessApp((app) => {
          if (!app) {
            throw new Error("Aborted app not found");
          }
        })
      )
      .do(
        EX.accessAppM((app) =>
          T.trySync(() => {
            if (!app) {
              throw new Error("Aborted app not found");
            }
          })
        )
      )
      .done();

    const program = Do(T.effect)
      .bindL("res1", () =>
        pipe(
          H.post("http://127.0.0.1:3003/", {}),
          T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
          T.result
        )
      )
      .bindL("res2", () =>
        pipe(
          H.post("http://127.0.0.1:3003/bad", {}),
          T.mapError((s) => s._tag === H.HttpErrorReason.Response && s.response && s.response.body),
          T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
          T.result
        )
      )
      .bindL("res3", () =>
        pipe(
          H.post("http://127.0.0.1:3003/bad2", {}),
          T.mapError((s) => s._tag === H.HttpErrorReason.Response && s.response && s.response.body),
          T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
          T.result
        )
      )
      .bindL("res4", () =>
        pipe(
          H.post("http://127.0.0.1:3003/bad3", {}),
          T.mapError((s) => s._tag === H.HttpErrorReason.Response && s.response && s.response.body),
          T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
          T.result
        )
      )
      .bindL("res5", () =>
        pipe(
          H.post("http://127.0.0.1:3003/access", {}),
          T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
          T.result
        )
      )
      .done();

    await pipe(
      routes,
      T.chain((_) => program),
      M.provideS(EX.managedExpress(3003, "127.0.0.1")),
      T.provideS(L.client(fetch)),
      T.provideS(EX.express),
      T.runToPromise
    ).then(({ res1, res2, res3, res4, res5 }) => {
      assert.deepEqual(res1, done({ res: 1 }));
      assert.deepEqual(res2, raise(some(`{\"res\":1}`)));
      assert.deepEqual(res3, raise(some(`{\"status\":\"aborted\",\"with\":\"abort\"}`)));
      assert.deepEqual(res4, raise(some(`{\"status\":\"interrupted\"}`)));
      assert.deepEqual(res5, done({ res: 1 }));
    });
  });
});
