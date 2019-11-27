import * as T from "@matechs/effect";
import * as S from "@matechs/effect/lib/stream";
import * as O from "../src";
import * as Rx from "rxjs";
import * as E from "fp-ts/lib/Either";
import * as A from "fp-ts/lib/Array";

import * as assert from "assert";
import { raise } from "waveguide/lib/exit";

describe("RxJS", () => {
  jest.setTimeout(5000)

  it("should encaseObservable", async () => {
    const s = O.encaseObservable(Rx.interval(10), E.toError);
    const p = S.collectArray(S.take(s, 10));

    const r = await T.runToPromise(p);

    assert.deepEqual(r, A.range(0, 9));
  });

  it("should encaseObservable - complete", async () => {
    const s = O.encaseObservable(Rx.from([0, 1, 2]), E.toError);
    const p = S.collectArray(s);

    const r = await T.runToPromise(p);

    assert.deepEqual(r, A.range(0, 2));
  });

  it("should encaseObservable - error", async () => {
    const s = O.encaseObservable(Rx.throwError(new Error("error")), E.toError);
    const p = S.collectArray(S.take(s, 10));

    const r = await T.runToPromiseExit(p);

    assert.deepEqual(r, raise(new Error("error")));
  });

  it("should toObservable", async () => {
    const s = S.fromArray([0, 1, 2]);
    const o = O.toObservable(s);

    const r = await T.runToPromise(o);

    const a = [];

    const sub = r.subscribe(n => {
      a.push(n);
    });

    await T.runToPromise(T.delay(T.unit, 10));

    assert.deepEqual(a, [0, 1, 2]);
    assert.deepEqual(sub.closed, true)
  });
});
