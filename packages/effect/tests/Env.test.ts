import * as T from "../src/effect";
import { Do } from "fp-ts-contrib/lib/Do";
import * as assert from "assert";
import { array } from "fp-ts/lib/Array";

interface Env {
  foo: string;
}

describe("Env", () => {
  it("env should work", async () => {
    const res = await T.runToPromise(
      Do(T.effect)
        .bindL("a", () =>
          T.provideAll<Env>({ foo: "a" })(
            T.delay(
              T.access(({ foo }: Env) => foo),
              100
            )
          )
        )
        .bindL("b", () =>
          T.provideAll<Env>({ foo: "b" })(T.access(({ foo }: Env) => foo))
        )
        .return(s => `${s.a} - ${s.b}`)
    );

    assert.deepEqual(res, "a - b");
  });

  it("env should work - par", async () => {
    const res = await T.runToPromise(
      array.sequence(T.parEffect)([
        T.provideAll<Env>({ foo: "a" })(
          T.delay(
            T.access(({ foo }: Env) => foo),
            1000
          )
        ),
        T.provideAll<Env>({ foo: "b" })(T.access(({ foo }: Env) => foo))
      ])
    );

    assert.deepEqual(res.join(" - "), "a - b");
  });
});
