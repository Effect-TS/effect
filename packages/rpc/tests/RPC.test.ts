import * as assert from "assert";
import * as E from "fp-ts/lib/Either";
import * as T from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import { Do } from "fp-ts-contrib/lib/Do";
import { sayHiAndReturn, clientModuleA } from "./rpc/client";
import { HttpClient } from "@matechs/http";
import { moduleA } from "./rpc/server";
import { bindToApp } from "../src";
import express from "express";
import R from "supertest";
import { isRight, toError } from "fp-ts/lib/Either";

describe("RPC", () => {
  it("should bind module to express and perform an rpc call", async () => {
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
            .return(s => s.r.body);
        }
      }
    };

    const program = Do(T.effectMonad)
      .bind("a", sayHiAndReturn("test-a"))
      .bind("b", sayHiAndReturn("test-b"))
      .return(s => `${s.a} - ${s.b}`);

    const clientModule = pipe(
      T.noEnv,
      T.mergeEnv(clientModuleA),
      T.mergeEnv(mockHttpClient)
    );

    const result = await T.run(T.provide(clientModule)(program))();

    s.close();

    assert.deepEqual(result, E.left(T.error("not implemented")));
  });

  it("should add remote interpreter", async () => {
    const mockHttpClient: HttpClient = {
      http: {
        post<E, A>(url: string, data: any): T.Effect<T.NoEnv, Error | E, A> {
          if (url === "url/moduleA/sayHiAndReturn") {
            return T.liftIO(() => data["data"][0]) as any;
          }
          return T.left(T.error("wrong"));
        }
      }
    };

    const program = Do(T.effectMonad)
      .bind("a", sayHiAndReturn("test-a"))
      .bind("b", sayHiAndReturn("test-b"))
      .return(s => `${s.a} - ${s.b}`);

    const module = pipe(
      T.noEnv,
      T.mergeEnv(clientModuleA),
      T.mergeEnv(mockHttpClient)
    );

    const result = await T.run(T.provide(module)(program))();

    assert.deepEqual(result, E.right("test-a - test-b"));
  });
});
