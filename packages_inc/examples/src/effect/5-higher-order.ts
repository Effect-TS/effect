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

// define a unique resource identifier
const LoggerURI = "@matechs/examples/LoggerURI";

// define a unique resource identifier
interface Logger {
  // scope it using the previously defined URI
  [LoggerURI]: {
    log(message: string): T.Sync<void>;
  };
}

const log = (message: string) =>
  T.accessM(({ [LoggerURI]: { log } }: Logger) => log(message));

// define a provider for the specific Add module depending on Logger
const provideAdd = pipe(
  T.access(({ [LoggerURI]: logger }: Logger) => logger),
  T.map(
    (logger): Add => ({
      [AddURI]: {
        add: (x, y) =>
          pipe(
            T.sync(() => x + y),
            T.chainTap((n) => logger.log(`result-add: ${n}`))
          )
      }
    })
  ),
  T.provideM // provide monadically
);

// define a provider for the specific Mul module
const provideMul = T.provideWith(
  (_: Logger): Mul => ({
    [MulURI]: {
      mul: (x, y) =>
        pipe(
          T.sync(() => x * y),
          T.chainTap((n) => log(`result-mul: ${n}`)),
          T.provide(_)
        )
    }
  })
);

// define a provider for the specific Log module
const provideLog = (messages: Array<string>) =>
  T.provide<Logger>({
    [LoggerURI]: {
      log: (message) =>
        T.sync(() => {
          messages.push(message);
        })
    }
  });

// run the program providing the concrete implementation
const messages: Array<string> = [];
const result: Ex.Exit<never, number> = pipe(
  addAndMul, // T.SyncR<Mul & Add, number>
  provideAdd, // T.SyncR<Logger & Add, number>
  provideMul, // T.SyncR<Logger, number>
  provideLog(messages), // T.Sync<number>
  T.runSync
);

assert.deepStrictEqual(result, Ex.done(6));
assert.deepStrictEqual(messages, ["result-add: 3", "result-mul: 6"]);
