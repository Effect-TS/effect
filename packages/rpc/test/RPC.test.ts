import * as assert from "assert";
import * as E from "fp-ts/lib/Either";
import * as T from "@matechs/effect";
import {
  CanRemote,
  reinterpretRemotely,
  HttpClient,
  clientHelpers
} from "../src";
import { pipe } from "fp-ts/lib/pipeable";
import { Do } from "fp-ts-contrib/lib/Do";

interface ModuleA extends CanRemote {
  moduleA: {
    sayBye(s: string): T.Effect<T.NoEnv, Error, string>;
  };
}

const moduleA: ModuleA = {
  moduleA: {
    sayBye(s: string): T.Effect<T.NoEnv, Error, string> {
      return T.left(T.error("not implemented"));
    }
  }
};

const {
  moduleA: { sayBye }
} = clientHelpers(moduleA);

describe("RPC", () => {
  it("should add remote interpreter", async () => {
    const mockHttpClient: HttpClient = {
      http: {
        post<E, A>(url: string, data: any): T.Effect<T.NoEnv, Error | E, A> {
          if (url === "url/moduleA/sayBye") {
            return T.liftIO(() => data["data"][0]) as any;
          }
          return T.left(T.error("wrong"));
        }
      }
    };

    const program = Do(T.effectMonad)
      .bind("a", sayBye("test-a"))
      .bind("b", sayBye("test-b"))
      .return(s => `${s.a} - ${s.b}`);

    const module = pipe(
      T.noEnv,
      T.mergeEnv(reinterpretRemotely(moduleA, "url")),
      T.mergeEnv(mockHttpClient)
    );

    const result = await T.run(T.provide(module)(program))();

    assert.deepEqual(result, E.right("test-a - test-b"));
  });
});
