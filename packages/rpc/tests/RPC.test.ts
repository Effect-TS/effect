import { effect as T } from "@matechs/effect";
import * as E from "@matechs/express";
import * as RPC from "../src";
import * as assert from "assert";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import * as L from "@matechs/http-client-libcurl";
import { done, raise } from "@matechs/effect/lib/original/exit";

const counterEnv: unique symbol = Symbol();

interface RPCService {
  [counterEnv]: {
    increment: (n: number) => T.Effect<T.NoEnv, T.NoErr, number>;
    ni: () => T.Effect<T.NoEnv, string, void>;
  };
}

let counter = 0;

const rpcService: RPCService = {
  [counterEnv]: {
    increment: n =>
      T.sync(() => {
        counter = counter + n;
        return counter;
      }),
    ni: () => T.raiseError("not implemented")
  }
};

const { increment, ni } = RPC.client(rpcService, counterEnv);

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

    const clientEnv = pipe(
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
    );

    const incResult = await T.runToPromiseExit(
      T.provideAll(clientEnv)(increment(1))
    );

    const niResult = await T.runToPromiseExit(
      T.provideAll(clientEnv)(ni())
    );

    result.server.close();

    assert.deepEqual(incResult, done(1));
    assert.deepEqual(niResult, raise("not implemented"));
  });
});
