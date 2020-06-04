import * as assert from "assert";

import * as T from "@matechs/core/Effect";
import * as Ex from "@matechs/core/Exit";
import { pipe } from "@matechs/core/Function";

// define a unique resource identifier
const CalculatorURI = "@matechs/examples/CalculatorURI";

// define the module description as an interface
interface Calculator {
  // scope it using the previously defined URI
  [CalculatorURI]: {
    add(x: number, y: number): T.Sync<number>;
    mul(x: number, y: number): T.Sync<number>;
  };
}

// access the module from environment and expose the add function
const add = (x: number, y: number): T.SyncR<Calculator, number> =>
  T.accessM(({ [CalculatorURI]: { add } }: Calculator) => add(x, y));

// access the module from environment and expose the mul function
const mul = (x: number, y: number): T.SyncR<Calculator, number> =>
  T.accessM(({ [CalculatorURI]: { mul } }: Calculator) => mul(x, y));

// our program is now independent from a concrete implementation
const addAndMul: T.SyncR<Calculator, number> = pipe(
  add(1, 2),
  T.chain((n) => mul(n, 2))
);

// define a provider for the specific Calculator module
const provideCalculator = T.provide<Calculator>({
  [CalculatorURI]: {
    add: (x, y) => T.sync(() => x + y),
    mul: (x, y) => T.sync(() => x * y)
  }
});

// run the program providing the concrete implementation
const result: Ex.Exit<never, number> = pipe(
  addAndMul,
  provideCalculator,
  T.runSync
);

assert.deepStrictEqual(result, Ex.done(6));

// define a second provider for the specific Calculator module
const provideCalculatorWithLog = (messages: Array<string>) =>
  T.provide<Calculator>({
    [CalculatorURI]: {
      add: (x, y) =>
        T.applySecond(
          T.sync(() => {
            messages.push(`called add with ${x}, ${y}`);
          }),
          T.sync(() => x + y)
        ),
      mul: (x, y) =>
        T.applySecond(
          T.sync(() => {
            messages.push(`called mul with ${x}, ${y}`);
          }),
          T.sync(() => x * y)
        )
    }
  });

// run the program providing the concrete implementation
const messages: Array<string> = [];
const resultWithLog: Ex.Exit<never, number> = pipe(
  addAndMul,
  provideCalculatorWithLog(messages),
  T.runSync
);

assert.deepStrictEqual(resultWithLog, Ex.done(6));
assert.deepStrictEqual(messages, [
  "called add with 1, 2",
  "called mul with 3, 2"
]);
