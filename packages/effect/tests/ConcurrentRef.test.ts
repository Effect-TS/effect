import * as assert from "assert";
import { Do } from "fp-ts-contrib/lib/Do";
import { effect as T, concurrentRef as R } from "../src";

interface Config {
  initial: number;
}

describe("ConcurrentRef", () => {
  it("should use ref", async () => {
    const program = Do(T.effect)
      .bindL("initial", () => T.access(({ initial }: Config) => initial))
      .bindL("ref", ({ initial }) => R.makeConcurrentRef(initial))
      .bindL("next", ({ ref }) => ref.modify((n) => T.pure([n + 1, n + 1] as const)))
      .doL(({ ref, next }) => ref.set(T.pure(next + 1)))
      .doL(({ ref }) => ref.update((n) => T.pure(n + 1)))
      .bindL("result", ({ ref }) => ref.get)
      .return((s) => s.result);

    const result = await T.runToPromise(
      T.provideS<Config>({ initial: 0 })(program)
    );

    assert.deepEqual(result, 3);
  });

  it("should prevent concurrency issues", async () => {
    const program = Do(T.parEffect)
      .bindL("initial", () => T.access(({ initial }: Config) => initial))
      .bindL("ref", ({ initial }) => R.makeConcurrentRef(initial))
      .sequenceSL(({ ref }) => ({
        first: ref.modify((n) => T.delay(T.pure([n + 1, n + 1] as const), 10)),
        second: ref.modify((n) => T.delay(T.pure([n + 1, n + 1] as const), 10))
      }))
      .return(({ first, second }) => ({ first, second }));

    const result = await T.runToPromise(
      T.provideS<Config>({ initial: 0 })(program)
    );

    assert.notDeepEqual(result.first, result.second);
  });
});
