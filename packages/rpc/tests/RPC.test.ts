import { effect as T } from "@matechs/effect";
import * as E from "@matechs/express";
import * as RPC from "../src";
import * as assert from "assert";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import * as L from "@matechs/http-client-libcurl";
import { done } from "@matechs/effect/lib/original/exit";

const counterEnv: unique symbol = Symbol();

interface RPCService {
  [counterEnv]: {
    increment: (n: number) => T.Effect<T.NoEnv, T.NoErr, number>;
  };
}

let counter = 0;

const rpcService: RPCService = {
  [counterEnv]: {
    increment: n =>
      T.sync(() => {
        counter = counter + n;
        return counter;
      })
  }
};

const { increment } = RPC.client(rpcService, counterEnv);

describe("RPC", () => {
  it("should call remote service", async () => {
    const program = E.withApp(
      Do(T.effect)
        .do(RPC.bind(rpcService, counterEnv, {}))
        .bind("server", E.bind(9002))
        .done()
    );

    const result = await T.runToPromise(
      T.provideAll(
        pipe(
          T.noEnv,
          T.mergeEnv(E.express),
          T.mergeEnv(rpcService),
          T.mergeEnv(
            RPC.serverConfig(
              rpcService,
              counterEnv
            )({
              scope: "/counter"
            })
          )
        )
      )(program)
    );

    const clientProgram = increment(1);

    const clientResult = await T.runToPromiseExit(
      T.provideAll(
        pipe(
          T.noEnv,
          T.mergeEnv(L.jsonClient),
          T.mergeEnv(
            RPC.clientConfig(
              rpcService,
              counterEnv
            )({
              baseUrl: "http://127.0.0.1:9002/counter"
            })
          )
        )
      )(clientProgram)
    );

    result.server.close();

    assert.deepEqual(clientResult, done(1));
  });
});
