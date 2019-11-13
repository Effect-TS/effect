import * as assert from "assert";

import * as E from "../src";
import * as Ei from "fp-ts/lib/Either";

import { program, module } from "../src/example/Main";
import { pipe } from "fp-ts/lib/pipeable";

describe("Example", () => {
  it("should collect messages from log", async () => {
    const messages: Array<string> = [];

    const mockModule: typeof module = {
      counter: module.counter,
      printer: {
        print(s) {
          return E.liftIO(() => {
            messages.push(s);
          });
        }
      }
    };

    const result = await E.run(pipe(program, E.provide(mockModule)))();

    assert.deepEqual(result, Ei.right({ start: 0, end: 20 }));
    assert.deepEqual(messages, [
      "n: 1 (1)",
      "n: 2 (2)",
      "n: 3 (3)",
      "n: 4 (4)",
      "n: 5 (5)",
      "n: 6 (6)",
      "n: 7 (7)",
      "n: 8 (8)",
      "n: 9 (9)",
      "n: 10 (10)",
      "n: 1 (11)",
      "n: 2 (12)",
      "n: 3 (13)",
      "n: 4 (14)",
      "n: 5 (15)",
      "n: 6 (16)",
      "n: 7 (17)",
      "n: 8 (18)",
      "n: 9 (19)",
      "n: 10 (20)",
      "done - 0 <-> 20"
    ]);
  });
});
