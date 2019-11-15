import * as assert from "assert";
import * as E from "fp-ts/lib/Either";
import * as T from "@matechs/effect";
import { CanRemote, deriveRemote, HttpClient } from "../src";
import { pipe } from "fp-ts/lib/pipeable";

interface ModuleA extends CanRemote {
  moduleA: {
    sayHi(s: string): T.Effect<T.NoEnv, T.NoErr, void>;
    sayBye(s: string, s2: string): T.Effect<T.NoEnv, T.NoErr, string>;
  };
}

const moduleA: ModuleA = {
  moduleA: {
    sayHi(s: string): T.Effect<T.NoEnv, T.NoErr, void> {
      return T.liftIO(() => {
        console.log(s);
      });
    },
    sayBye(s: string, s2: string): T.Effect<T.NoEnv, T.NoErr, string> {
      return T.liftIO(() => {
        console.log(s);
        return s;
      });
    }
  }
};

describe("RPC", () => {
  it("should add remote interpreter", async () => {
    const remoteA = deriveRemote(moduleA, "url");

    const sayBye = remoteA.moduleA.sayBye("test-arg", "test");

    const result = await T.run(
      pipe(
        sayBye,
        T.provide({
          http: {
            post<E, A>(
              url: string,
              data: any
            ): T.Effect<T.NoEnv, Error | E, A> {
              if (url === "url/moduleA/sayBye") {
                return T.liftIO(() => data["data"][0]) as any;
              }
              return T.left(T.error("wrong"));
            }
          }
        } as HttpClient)
      )
    )();

    assert.deepEqual(result, E.right("test-arg"))
  });
});
