import * as T from "@matechs/effect";
import * as S from "@matechs/effect/lib/stream";
import * as O from "../src";
import * as Rx from "rxjs";
import * as E from "fp-ts/lib/Either";
import * as A from "fp-ts/lib/Array";

import * as assert from "assert";

describe("RxJS", () => {
  it("should encaseObservable", async () => {
    const s = O.encaseObservable(Rx.interval(10), E.toError);
    const p = S.collectArray(S.take(s, 10));

    const r = await T.runToPromise(p);

    assert.deepEqual(r, A.range(0, 9));
  });
});
