import * as assert from "assert";
import { effect as T } from "@matechs/effect";
import * as EX from "@matechs/express";
import * as RPC from "../src";
import * as G from "@matechs/graceful";
import * as RC from "./rpc/client";
import * as RS from "./rpc/server";
import { pipe } from "fp-ts/lib/pipeable";
import { tracer } from "@matechs/tracing";
import { httpClient } from "@matechs/http/lib";
import { moduleADef, Printer } from "./rpc/interface";
import { Do } from "fp-ts-contrib/lib/Do";
import { ExitTag, done, raise } from "@matechs/effect/lib/original/exit";

describe("RPC", () => {
  it("perform call through rpc", async () => {
    // server

    const messages: string[] = [];

    const mockPrinter: Printer = {
      printer: {
        print(s) {
          return T.sync(() => {
            messages.push(s);
          });
        }
      }
    };

    const module = pipe(
      T.noEnv,
      T.mergeEnv(RS.moduleA),
      T.mergeEnv(tracer()),
      T.mergeEnv(mockPrinter),
      T.mergeEnv(EX.express),
      T.mergeEnv(G.graceful())
    );

    const main = EX.withApp(
      Do(T.effect)
        .do(RPC.bindToApp(RS.moduleA, "moduleA", module))
        .bind("server", EX.bind(3000, "127.0.0.1"))
        .return(s => s.server)
    );

    await T.runToPromise(T.provide(module)(main));

    const clientModule = pipe(
      T.noEnv,
      T.mergeEnv(RC.clientModuleA),
      T.mergeEnv(httpClient())
    );

    const result = await T.runToPromiseExit(
      T.provide(clientModule)(RC.failing("test"))
    );
    const result2 = await T.runToPromiseExit(
      T.provide(clientModule)(RC.notFailing("test"))
    );

    const clientModuleWrong = RPC.reinterpretRemotely(
      moduleADef,
      "http://127.0.0.1:3002"
    );

    const result3 = await T.runToPromiseExit(
      T.provide(
        pipe(T.noEnv, T.mergeEnv(clientModuleWrong), T.mergeEnv(httpClient()))
      )(RC.notFailing("test"))
    );

    // direct call in server
    const result4 = await T.runToPromiseExit(
      T.provide(module)(RS.notFailing("test"))
    );

    await T.runToPromise(T.provide(module)(G.trigger()));

    assert.deepEqual(result, raise(new Error("not implemented")));
    assert.deepEqual(result2, done("test"));
    assert.deepEqual(
      result3._tag === ExitTag.Raise && result3.error.message,
      "connect ECONNREFUSED 127.0.0.1:3002"
    );
    assert.deepEqual(result4, done("test"));
    assert.deepEqual(messages, ["test", "test"]);
  });
});
