import * as assert from "assert";
import * as O from "../src/operators";
import * as Rx from "rxjs";
import { filter, catchError } from "rxjs/operators";
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

    await T.runToPromise(T.delay(T.unit, 10));

    assert.deepEqual(numbers, [0, 2]);
  });

  it("chainEffect effect raise", async () => {
    const numbers: number[] = [];
    const errors: any[] = [];

    Rx.from([0, 1, 2, 3])
      .pipe(filter(n => n % 2 === 0))
      .pipe(O.chainEffect(() => T.raiseError("error")))
      .pipe(
        catchError(e => {
          errors.push(e);
          return Rx.from([]);
        })
      )
      .subscribe();

    await T.runToPromise(T.delay(T.unit, 10));

    assert.deepEqual(numbers, []);
    // note: https://rxjs-dev.firebaseapp.com/api/operators/catchError
    // rxjs only catches first error
    assert.deepEqual(errors, ["error"]);
  });

  it("chainEffect effect abort", async () => {
    const numbers: number[] = [];
    const errors: any[] = [];

    Rx.from([0, 1, 2, 3])
      .pipe(filter(n => n % 2 === 0))
      .pipe(O.chainEffect(() => T.raiseAbort("error")))
      .pipe(
        catchError(e => {
          errors.push(e);
          return Rx.from([]);
        })
      )
      .subscribe();

    await T.runToPromise(T.delay(T.unit, 10));

    assert.deepEqual(numbers, []);
    // note: https://rxjs-dev.firebaseapp.com/api/operators/catchError
    // rxjs only catches first error
    assert.deepEqual(errors, ["error"]);
  });

  it("chainEffect effect interrupt", async () => {
    const numbers: number[] = [];
    const errors: any[] = [];

    Rx.from([0, 1, 2, 3])
      .pipe(filter(n => n % 2 === 0))
      .pipe(O.chainEffect(() => T.raiseInterrupt))
      .pipe(
        catchError(e => {
          errors.push(e);
          return Rx.from([]);
        })
      )
      .subscribe();

    await T.runToPromise(T.delay(T.unit, 10));

    assert.deepEqual(numbers, []);
    // note: https://rxjs-dev.firebaseapp.com/api/operators/catchError
    // rxjs only catches first error
    assert.deepEqual(errors, [new Error("interrupted")]);
  });

  it("chainEffect observable error", async () => {
    const numbers: number[] = [];
    const errors: any[] = [];

    Rx.concat(Rx.from([0, 1, 2, 3]), Rx.throwError("error"))
      .pipe(filter(n => n % 2 === 0))
      .pipe(
        O.chainEffect(n =>
          T.sync(() => {
            numbers.push(n);
          })
        )
      )
      .pipe(
        catchError(e => {
          errors.push(e);
          return Rx.EMPTY;
        })
      )
      .subscribe();

    await T.runToPromise(T.delay(T.unit, 10));

    assert.deepEqual(numbers, [0, 2]);
    assert.deepEqual(errors, ["error"]);
  });
});
