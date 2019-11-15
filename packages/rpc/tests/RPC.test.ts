import * as assert from "assert";
import * as E from "fp-ts/lib/Either";
import * as T from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import { Do } from "fp-ts-contrib/lib/Do";
import { clientModuleA, notFailing, failing } from "./rpc/client";
import { HttpClient } from "@matechs/http";
import { moduleA } from "./rpc/server";
import { bindToApp } from "../src";
import express from "express";
import R from "supertest";
import { isRight, toError } from "fp-ts/lib/Either";

describe("RPC", () => {
  it("perform call through rpc", async () => {
    // server

    const argsMap = {};

    const module = pipe(T.noEnv, T.mergeEnv(moduleA));

    const app = express();

    bindToApp(app, module);

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
  });
});
