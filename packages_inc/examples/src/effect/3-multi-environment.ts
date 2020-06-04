import * as assert from "assert";

import * as T from "@matechs/core/Effect";
import * as Ex from "@matechs/core/Exit";
import { pipe } from "@matechs/core/Function";

// define a unique resource identifier
const AddURI = "@matechs/examples/AddURI";

// define the module description as an interface
interface Add {
  // scope it using the previously defined URI
  [AddURI]: {
    add(x: number, y: number): T.Sync<number>;
  };
}

// define a unique resource identifier
const MulURI = "@matechs/examples/MulURI";

// define the module description as an interface
interface Mul {
  // scope it using the previously defined URI
  [MulURI]: {
    mul(x: number, y: number): T.Sync<number>;
  };
}

// access the module from environment and expose the add function
const add = (x: number, y: number): T.SyncR<Add, number> =>
  T.accessM(({ [AddURI]: { add } }: Add) => add(x, y));

// access the module from environment and expose the mul function
const mul = (x: number, y: number): T.SyncR<Mul, number> =>
  T.accessM(({ [MulURI]: { mul } }: Mul) => mul(x, y));

// our program is now independent from a concrete implementation
const addAndMul = pipe(
  add(1, 2),
  T.chain((n) => mul(n, 2))
);

// define a provider for the specific Add module
const provideAdd = T.provide<Add>({
  [AddURI]: {
    add: (x, y) => T.sync(() => x + y)
  }
});

// define a provider for the specific Mul module
const provideMul = T.provide<Mul>({
  [MulURI]: {
    mul: (x, y) => T.sync(() => x * y)
  }
});

// run the program providing the concrete implementation
const result: Ex.Exit<never, number> = pipe(
  addAndMul, // T.Effect<never, Mul & Add, never, number> -> T.SyncR<Mul & Add, number>
  provideAdd, // T.Effect<never, Mul, never, number> -> T.SyncR<Mul, number>
  provideMul, // T.Effect<never, unknown, never, number> -> T.Sync<number>
  T.runSync
);

assert.deepStrictEqual(result, Ex.done(6));
