import * as assert from "assert";
import * as E from "fp-ts/lib/Either";
import * as T from "@matechs/effect";
import * as EX from "@matechs/express";
import { pipe } from "fp-ts/lib/pipeable";
import * as RPC from "../src";
import { tracer, tracerFactoryDummy } from "@matechs/tracing/lib";
import { httpClient } from "@matechs/http/lib";
import * as G from "@matechs/graceful";
import { moduleADef, Printer } from "./rpc/interface";

import * as RC from "./rpc/client";
import * as RS from "./rpc/server";
import { Do } from "fp-ts-contrib/lib/Do";

describe("RPC", () => {
  it("perform call through rpc", async () => {
    // server

    const argsMap = {};

    const messages = [];

    const mockPrinter: Printer = {
      printer: {
        print(s) {
          return T.liftIO(() => {
            messages.push(s);
          });
        }
      }
    };

    const module = pipe(
      T.noEnv,
      T.mergeEnv(RS.moduleA),
      T.mergeEnv(tracer),
      T.mergeEnv(tracerFactoryDummy),
      T.mergeEnv(mockPrinter),
      T.mergeEnv(EX.express),
      T.mergeEnv(G.graceful())
    );

    const main = EX.withApp(
      Do(T.effectMonad)
        .do(RPC.bindToApp(RS.moduleA, "moduleA", module))
        .bind("server", EX.bind(3000, "127.0.0.1"))
        .return(s => s.server)
    );

    await T.promise(T.provide(module)(main));

    const clientModule = pipe(
      T.noEnv,
      T.mergeEnv(RC.clientModuleA),
      T.mergeEnv(httpClient())
    );

    const result = await T.run(T.provide(clientModule)(RC.failing("test")))();
    const result2 = await T.run(
      T.provide(clientModule)(RC.notFailing("test"))
    )();

    const clientModuleWrong = RPC.reinterpretRemotely(
      moduleADef,
      "http://127.0.0.1:3002"
    );

    const result3 = await T.run(
      T.provide(
        pipe(T.noEnv, T.mergeEnv(clientModuleWrong), T.mergeEnv(httpClient()))
      )(RC.notFailing("test"))
    )();

    // direct call in server
    const result4 = await T.run(T.provide(module)(RS.notFailing("test")))();

    await T.promise(T.provide(module)(G.trigger()));

    assert.deepEqual(result, E.left(T.error("not implemented")));
    assert.deepEqual(result2, E.right("test"));
    assert.deepEqual(
      E.isLeft(result3) && result3.left.message,
      "connect ECONNREFUSED 127.0.0.1:3002"
    );
    assert.deepEqual(result4, E.right("test"));
    assert.deepEqual(messages, ["test", "test"]);
  });
});
