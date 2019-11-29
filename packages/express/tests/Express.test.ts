import * as assert from "assert";
import * as T from "@matechs/effect";
import { Do } from "fp-ts-contrib/lib/Do";
import * as EX from "../src";
import * as H from "@matechs/http/lib";
import { pipe } from "fp-ts/lib/pipeable";
import * as G from "@matechs/graceful";
import { raise, done } from "waveguide/lib/exit";

describe("Express", () => {
  it("should use express", async () => {
    const program = EX.withApp(
      Do(T.effect)
        .do(EX.route("post", "/", () => T.pure({ res: 1 })))
        .do(EX.route("post", "/bad", () => T.raiseError({ res: 1 })))
        .do(EX.route("post", "/bad2", () => T.raiseAbort("abort")))
        .do(EX.route("post", "/bad3", () => T.raiseInterrupt))
        .bind("s", EX.bind(3003, "127.0.0.1"))
        .return(s => s.s)
    );

    const module = pipe(
      T.noEnv,
      T.mergeEnv(EX.express),
      T.mergeEnv(G.graceful())
    );

    await T.runToPromise(T.provide(module)(program));

    const res = await T.runToPromiseExit(
      pipe(
        T.provide(H.httpClient())(H.post("http://127.0.0.1:3003/", {})),
        T.map(s => s.data)
      )
    );

    const res2 = await T.runToPromiseExit(
      pipe(
        T.provide(H.httpClient())(H.post("http://127.0.0.1:3003/bad", {})),
        T.map(s => s.data),
        T.mapErrorWith(s => s.response && s.response.data)
      )
    );

    const res3 = await T.runToPromiseExit(
      pipe(
        T.provide(H.httpClient())(H.post("http://127.0.0.1:3003/bad2", {})),
        T.map(s => s.data),
        T.mapErrorWith(s => s.response && s.response.data)
      )
    );

    const res4 = await T.runToPromiseExit(
      pipe(
        T.provide(H.httpClient())(H.post("http://127.0.0.1:3003/bad3", {})),
        T.map(s => s.data),
        T.mapErrorWith(s => s.response && s.response.data)
      )
    );

    await T.runToPromise(T.provide(module)(G.trigger()));

    assert.deepEqual(res, done({ res: 1 }));
    assert.deepEqual(res2, raise({ res: 1 }));
    assert.deepEqual(res3, raise({ status: "aborted", with: "abort" }));
    assert.deepEqual(res4, raise({ status: "interrupted" }));
  });
});
