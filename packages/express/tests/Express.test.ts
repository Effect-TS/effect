import * as assert from "assert";
import * as T from "@matechs/effect";
import * as E from "fp-ts/lib/Either";
import { Do } from "fp-ts-contrib/lib/Do";
import * as EX from "../src";
import * as H from "@matechs/http/lib";
import { pipe } from "fp-ts/lib/pipeable";

describe("Express", () => {
  it("should use express", async () => {
    const program = EX.withApp(
      Do(T.effectMonad)
        .do(EX.post("/", () => T.right({ res: 1 })))
        .do(EX.post("/bad", () => T.left({ res: 1 })))
        .bind("s", EX.bind(3003, "127.0.0.1"))
        .return(s => s.s)
    );

    const server = await T.promise(T.provide(EX.express)(program));

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

    server.close();

    assert.deepEqual(res, E.right({ res: 1 }));
    assert.deepEqual(res2, E.left({ res: 1 }));
  });
});
