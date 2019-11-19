import * as assert from "assert";
import * as E from "fp-ts/lib/Either";
import * as T from "@matechs/effect";
import * as EX from "@matechs/express";
import { pipe } from "fp-ts/lib/pipeable";
import { bindToApp, reinterpretRemotely } from "../src";
import { tracer, tracerFactoryDummy, withTracer } from "@matechs/tracing/lib";
import { httpClient } from "@matechs/http/lib";

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
      T.mergeEnv(EX.express)
    );

    const main = EX.withApp(
      Do(T.effectMonad)
        .do(withTracer(bindToApp(RS.moduleA, "moduleA", module)))
        .bind("server", EX.bind(3000, "127.0.0.1"))
        .return(s => s.server)
    );

    const s = await T.promise(T.provide(module)(main));

    const clientModule = pipe(
      T.noEnv,
      T.mergeEnv(RC.clientModuleA),
      T.mergeEnv(httpClient())
    );

    const result = await T.run(T.provide(clientModule)(RC.failing("test")))();
    const result2 = await T.run(
      T.provide(clientModule)(RC.notFailing("test"))
    )();

    const clientModuleWrong = reinterpretRemotely(
      moduleADef,
      "http://127.0.0.1:3002"
    );

    const result3 = await T.run(
      T.provide(
        pipe(T.noEnv, T.mergeEnv(clientModuleWrong), T.mergeEnv(httpClient()))
      )(RC.notFailing("test"))
    )();

    // direct call in server <- tracing is supposed to be setup depending on your env
    const result4 = await T.run(T.provide(module)(RS.notFailing("test")))();

    s.close();

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
