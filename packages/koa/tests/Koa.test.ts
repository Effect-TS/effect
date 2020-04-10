import "isomorphic-fetch";
import * as assert from "assert";
import { effect as T } from "@matechs/effect";
import { Do } from "fp-ts-contrib/lib/Do";
import * as KOA from "../src";
import * as H from "@matechs/http-client";
import * as L from "@matechs/http-client-fetch";
import { pipe } from "fp-ts/lib/pipeable";
import { raise, done } from "@matechs/effect/lib/original/exit";
import { some } from "fp-ts/lib/Option";
import { sequenceT } from "fp-ts/lib/Apply";

describe("Koa", () => {
  it("should use koa", async () => {
    const program = Do(T.effect)
      .do(
        KOA.withRouter(
          sequenceT(T.effect)(
            KOA.route(
              "post",
              "/",
              KOA.accessReqM((r) =>
                T.pure(KOA.routeResponse(r.path === "/" ? 200 : 500, { res: 1 }))
              )
            ),
            KOA.route(
              "post",
              "/access",
              KOA.accessReq((r) => KOA.routeResponse(r.path === "/access" ? 200 : 500, { res: 1 }))
            ),
            KOA.withSubRouter(
              "/sub",
              sequenceT(T.effect)(
                KOA.route(
                  "post",
                  "/",
                  KOA.accessReqM((r) =>
                    T.pure(KOA.routeResponse(r.path === "/sub" ? 200 : 500, { res: 1 }))
                  )
                ),
                KOA.route(
                  "post",
                  "/access",
                  KOA.accessReq((r) =>
                    KOA.routeResponse(r.path === "/sub/access" ? 200 : 500, { res: 1 })
                  )
                )
              )
            ),
            KOA.route("post", "/bad", T.raiseError(KOA.routeError(500, { res: 1 }))),
            KOA.route("post", "/bad2", T.raiseAbort("abort")),
            KOA.route("post", "/bad3", T.raiseInterrupt)
          )
        )
      )
      .do(
        KOA.accessApp((app) => {
          if (!app) {
            throw new Error("Aborted app not found");
          }
        })
      )
      .do(
        KOA.accessAppM((app) =>
          T.trySync(() => {
            if (!app) {
              throw new Error("Aborted app not found");
            }
          })
        )
      )
      .return(() => {
        //
      });

    const main = KOA.bracketWithApp(3004, "127.0.0.1")(program);
    const fiber = await T.runToPromise(KOA.provideKoa(T.fork(main)));

    await T.runToPromise(T.delay(T.unit, 200));

    const res = await T.runToPromiseExit(
      pipe(
        H.post("http://127.0.0.1:3004/", {}),
        T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
        T.provideS(L.client(fetch))
      )
    );

    const res2 = await T.runToPromiseExit(
      pipe(
        H.post("http://127.0.0.1:3004/bad", {}),
        T.mapError((s) => s._tag === H.HttpErrorReason.Response && s.response && s.response.body),
        T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
        T.provideS(L.client(fetch))
      )
    );

    const res3 = await T.runToPromiseExit(
      pipe(
        H.post("http://127.0.0.1:3004/bad2", {}),
        T.mapError((s) => s._tag === H.HttpErrorReason.Response && s.response && s.response.body),
        T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
        T.provideS(L.client(fetch))
      )
    );

    const res4 = await T.runToPromiseExit(
      pipe(
        H.post("http://127.0.0.1:3004/bad3", {}),
        T.mapError((s) => s._tag === H.HttpErrorReason.Response && s.response && s.response.body),
        T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
        T.provideS(L.client(fetch))
      )
    );

    const res5 = await T.runToPromiseExit(
      pipe(
        H.post("http://127.0.0.1:3004/access", {}),
        T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
        T.provideS(L.client(fetch))
      )
    );

    const res6 = await T.runToPromiseExit(
      pipe(
        H.post("http://127.0.0.1:3004/sub", {}),
        T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
        T.provideS(L.client(fetch))
      )
    );

    const res7 = await T.runToPromiseExit(
      pipe(
        H.post("http://127.0.0.1:3004/sub/access", {}),
        T.chain((s) => T.fromOption(() => new Error("empty body"))(s.body)),
        T.provideS(L.client(fetch))
      )
    );

    await T.runToPromise(fiber.interrupt);

    assert.deepEqual(res, done({ res: 1 }));
    assert.deepEqual(res5, done({ res: 1 }));
    assert.deepEqual(res6, done({ res: 1 }));
    assert.deepEqual(res7, done({ res: 1 }));
    assert.deepEqual(res2, raise(some(`{\"res\":1}`))); // TODO: verify we want that decoded as string
    assert.deepEqual(res3, raise(some(`{\"status\":\"aborted\",\"with\":\"abort\"}`)));
    assert.deepEqual(res4, raise(some(`{\"status\":\"interrupted\"}`)));
  });
});
