import * as assert from "assert";
import * as O from "../src/operators";
import * as Rx from "rxjs";
import { filter } from "rxjs/operators";
import { effect as T } from "@matechs/effect";

describe("Operators", () => {
  it("chainEffect", async () => {
    const numbers: number[] = [];

    Rx.from([0, 1, 2, 3])
      .pipe(filter(n => n % 2 === 0))
      .pipe(
        O.chainEffect(n =>
          T.sync(() => {
            numbers.push(n);
          })
        )
      )
      .subscribe();

    assert.deepEqual(numbers, [0, 2]);
  });
});
