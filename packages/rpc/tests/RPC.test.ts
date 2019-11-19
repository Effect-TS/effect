import * as assert from "assert";
import * as E from "fp-ts/lib/Either";
import * as T from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import { bindToApp, reinterpretRemotely, serverHelpers } from "../src";
import {
  tracer,
  tracerFactoryDummy,
  withControllerSpan,
  withTracer
} from "@matechs/tracing/lib";
import { httpClient } from "@matechs/http/lib";
import express from "express";

import { moduleADef, Printer } from "./rpc/interface";

import * as RC from "./rpc/client";
import * as RS from "./rpc/server";

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
      T.mergeEnv(mockPrinter)
    );

    const app = express();

    const main = withTracer(bindToApp(app, RS.moduleA, "moduleA", module));

    await T.run(T.provide(module)(main))();

    const s = app.listen(3000, "127.0.0.1");

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
