import * as assert from "assert";
import * as T from "@matechs/effect";
import { Do } from "fp-ts-contrib/lib/Do";
import * as EX from "../src";
import * as H from "@matechs/http/lib";
import { pipe } from "fp-ts/lib/pipeable";
import * as G from "@matechs/graceful";
import { raiseAbort, raiseInterrupt } from "waveguide/lib/wave";

describe("Express", () => {
  it("should use express", async () => {
    const program = EX.withApp(
      Do(T.effectMonad)
        .do(EX.route("post", "/", () => T.right({ res: 1 })))
        .do(EX.route("post", "/bad", () => T.left({ res: 1 })))
        .do(EX.route("post", "/bad2", () => T.fromFuture(raiseAbort("abort"))))
        .do(EX.route("post", "/bad3", () => T.fromFuture(raiseInterrupt)))
        .bind("s", EX.bind(3003, "127.0.0.1"))
        .return(s => s.s)
    );

    const module = pipe(
      T.noEnv,
      T.mergeEnv(EX.express),
      T.mergeEnv(G.graceful())
    );

    const server = await T.promise(T.provide(module)(program));

    const res = await T.run(
      pipe(
        T.provide(H.httpClient())(H.post("http://127.0.0.1:3003/", {})),
        T.map(s => s.data)
      )
    )();

    const res2 = await T.run(
      pipe(
        T.provide(H.httpClient())(H.post("http://127.0.0.1:3003/bad", {})),
        T.map(s => s.data),
        T.mapLeft(s => s.response.data)
      )
    )();

    const res3 = await T.run(
      pipe(
        T.provide(H.httpClient())(H.post("http://127.0.0.1:3003/bad2", {})),
        T.map(s => s.data),
        T.mapLeft(s => s.response.data)
      )
    )();

    const res4 = await T.run(
      pipe(
        T.provide(H.httpClient())(H.post("http://127.0.0.1:3003/bad3", {})),
        T.map(s => s.data),
        T.mapLeft(s => s.response.data)
      )
    )();

    await T.promise(T.provide(module)(G.trigger()));

    assert.deepEqual(res, T.done({ res: 1 }));
    assert.deepEqual(res2, T.raise({ res: 1 }));
    assert.deepEqual(res3, T.raise({ status: "aborted", with: "abort" }));
    assert.deepEqual(res4, T.raise({ status: "interrupted" }));
  });
});
