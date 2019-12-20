import { effect as T, derived as D } from "../src";
import * as assert from "assert";
import { done } from "../src/original/exit";

const testModuleEnv: unique symbol = Symbol();

interface TestModule {
  [testModuleEnv]: {
    nonFn: T.Effect<T.NoEnv, T.NoErr, number>;
    fn: (n: number) => T.Effect<T.NoEnv, T.NoErr, number>;
  };
}

const testModule: TestModule = {
  [testModuleEnv]: {
    fn: T.pure,
    nonFn: T.pure(1)
  }
};

const { fn, nonFn } = D.getDerived(testModule, testModuleEnv);

describe("Derived", () => {
  it("fn", async () => {
    assert.deepEqual(
      await T.runToPromiseExit(T.provideAll(testModule)(fn(1))),
      done(1)
    );
  });

  it("non-fn", async () => {
    assert.deepEqual(
      await T.runToPromiseExit(T.provideAll(testModule)(nonFn)),
      done(1)
    );
  });
});
