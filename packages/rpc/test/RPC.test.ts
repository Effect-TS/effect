import * as assert from "assert";
import * as E from "fp-ts/lib/Either";
import * as T from "@matechs/effect";
import { CanRemote, reinterpretRemotely, HttpClient } from "../src";
import { pipe } from "fp-ts/lib/pipeable";

interface ModuleA extends CanRemote {
  moduleA: {
    sayBye(s: string): T.Effect<T.NoEnv, T.NoErr, string>;
  };
}

const moduleA: ModuleA = {
  moduleA: {
    sayBye(s: string): T.Effect<T.NoEnv, T.NoErr, string> {
      return T.liftIO(() => {
        console.log(s);
        return s;
      });
    }
  }
};

function sayBye(s: string): T.Effect<ModuleA, T.NoErr, string> {
  return T.accessM(({ moduleA }: ModuleA) => moduleA.sayBye(s));
}

describe("RPC", () => {
  it("should add remote interpreter", async () => {
    const result = await T.run(
      pipe(
        sayBye("test-arg"),
        T.provide(moduleA),
        T.provide(reinterpretRemotely(moduleA, "url")),
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

    assert.deepEqual(result, E.right("test-arg"));
  });
});
