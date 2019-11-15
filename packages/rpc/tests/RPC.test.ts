import * as assert from "assert";
import * as E from "fp-ts/lib/Either";
import * as T from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import { Do } from "fp-ts-contrib/lib/Do";
import { clientModuleA, notFailing, failing } from "./rpc/client";
import { HttpClient } from "@matechs/http";
import { moduleA, Printer } from "./rpc/server";
import { bindToApp } from "../src";
import express from "express";
import R from "supertest";
import { toError } from "fp-ts/lib/Either";
import { tracer, tracerFactoryDummy, withTracer } from "@matechs/tracing/lib";

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
      T.mergeEnv(moduleA),
      T.mergeEnv(tracer),
      T.mergeEnv(tracerFactoryDummy),
      T.mergeEnv(mockPrinter)
    );

    const app = express();

    const main = withTracer(bindToApp(app, moduleA, "moduleA", module));

    await T.run(T.provide(module)(main))();

    const s = app.listen(3000, "127.0.0.1");

    // client
    const mockHttpClient: HttpClient = {
      http: {
        post<E, A>(url: string, data: any): T.Effect<T.NoEnv, Error | E, A> {
          const [_, entry, k] = url.split("/");

          return Do(T.effectMonad)
            .bindL("r", () =>
              T.tryCatch(
                () =>
                  R(`http://localhost:3000`)
                    .post(`/${entry}/${k}`)
                    .send(data)
                    .accept("text/json")
                    .then(),
                toError
              )
            )
            .doL(s =>
              T.when(s.r.status == 500)(T.left(T.error(s.r.body.message)))
            )
            .return(s => s.r.body.result);
        }
      }
    };

    const clientModule = pipe(
      T.noEnv,
      T.mergeEnv(clientModuleA),
      T.mergeEnv(mockHttpClient)
    );

    const result = await T.run(T.provide(clientModule)(failing("test")))();
    const result2 = await T.run(T.provide(clientModule)(notFailing("test")))();

    s.close();

    assert.deepEqual(result, E.left(T.error("not implemented")));
    assert.deepEqual(result2, E.right("test"));
    assert.deepEqual(messages, ["test"]);
  });
});
