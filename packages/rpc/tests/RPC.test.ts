import { effect as T, freeEnv as F } from "@matechs/effect";
import * as E from "@matechs/express";
import * as RPC from "../src";
import * as RPCCLI from "@matechs/rpc-client";
import * as assert from "assert";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import * as L from "@matechs/http-client-libcurl";
import { done, raise } from "@matechs/effect/lib/original/exit";

const configEnv: unique symbol = Symbol();

interface AppConfig {
  [configEnv]: {
    gap: number;
  };
}

const appConfig: AppConfig = {
  [configEnv]: {
    gap: 1
  }
};

const counterEnv: unique symbol = Symbol();

const counterM = F.define({
  [counterEnv]: {
    increment: F.fn<(n: number) => T.IO<T.NoErr, number>>(),
    ni: F.cn<T.IO<string, void>>()
  }
});

let counter = 0;

const counterService = F.implement(counterM)({
  [counterEnv]: {
    increment: (n) =>
      pipe(
        T.accessM(({ [configEnv]: c }: AppConfig) =>
          T.sync(() => {
            counter = counter + n + c.gap;
            return counter;
          })
        )
      ),
    ni: T.raiseError("not implemented")
  }
});

const { increment, ni } = RPCCLI.client(counterM);

describe("RPC", () => {
  it("should call remote service", async () => {
    const program = E.withApp(
      Do(T.effect).do(RPC.server(counterM, counterService)).bind("server", E.bind(9003)).done()
    );

    const result = await T.runToPromise(
      T.provideAll(
        pipe(
          T.noEnv,
          T.mergeEnv(appConfig),
          T.mergeEnv(E.express),
          T.mergeEnv({
            [RPC.serverConfigEnv]: {
              [counterEnv]: {
                scope: "/counter"
              }
            }
          })
        )
      )(program)
    );

    const clientEnv = pipe(
      T.noEnv,
      T.mergeEnv(L.client),
      T.mergeEnv({
        [RPCCLI.clientConfigEnv]: {
          [counterEnv]: {
            baseUrl: "http://127.0.0.1:9003/counter"
          }
        }
      })
    );

    const incResult = await T.runToPromiseExit(T.provideAll(clientEnv)(increment(1)));

    const niResult = await T.runToPromiseExit(T.provideAll(clientEnv)(ni));

    result.server.close();

    assert.deepEqual(incResult, done(2));
    assert.deepEqual(niResult, raise("not implemented"));
  });
});
