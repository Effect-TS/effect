/* istanbul ignore file */

import { Effect as T, pipe, Either as E, fluent, Exit as Ex } from "../src";
import * as assert from "assert";

const BarURI = "uris/bar";
interface Bar {
  [BarURI]: {
    getString: () => T.Io<string>;
  };
}

const BazURI = "uris/baz";
interface Baz {
  [BazURI]: {
    getString: () => T.Io<string>;
  };
}

class AError extends Error {
  constructor(message: string) {
    super(message);
  }
}

class BError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const a1 = T.pure(1);
const a2 = T.accessM((_: Bar) => _[BarURI].getString());
const a3 = T.accessM((_: Baz) => _[BazURI].getString());
const a4 = T.raiseError(new AError("mmm"));

const b = T.async<BError, number>((resolve) => {
  const timer = setTimeout(() => {
    resolve(E.right(1));
  }, 100);
  return (cb) => {
    clearTimeout(timer);
    cb();
  };
});

const c = pipe(
  a1,
  T.chain((_) => a4)
);

const d = pipe(
  a2,
  T.chain((_) => a3)
);

const e = fluent(c)
  .pipe((_) => d)
  .pipe(T.chain((_) => b))
  .done();

const f = T.Do.do(a1).do(b).bind("c", c).bind("d", d).bind("e", e).done();

const provideBar = T.provide<Bar>(
  {
    [BarURI]: {
      getString: () => T.pure("bar")
    }
  },
  "inverted"
);

const provideBaz = T.provideM(
  pipe(
    a2,
    T.map(
      (s): Baz => ({
        [BazURI]: {
          getString: () => T.pure(`value: ${s}`)
        }
      })
    )
  )
);

describe("Prelude", () => {
  it("should run effect composition", async () => {
    await fluent(f)
      .pipe(provideBaz)
      .pipe(provideBar)
      .pipe(T.runToPromiseExit)
      .done()
      .then((exit) => {
        assert.deepStrictEqual(Ex.isRaise(exit) && exit.error, new AError("mmm"));
      });
  });

  it("should run effect composition - sync", () => {
    const exit = pipe(a3, provideBaz, provideBar, T.runSync);

    assert.deepStrictEqual(Ex.isDone(exit) && exit.value, "value: bar");
  });

  it("should use either fold", () => {
    const useFold = pipe(
      E.left<number, string>(1),
      E.fold(
        (n) => T.raiseError(n),
        (s) => T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`))
      ),
      T.provide({
        foo: "ok"
      }),
      T.runSync
    );

    expect(useFold).toStrictEqual(Ex.raise(1));
  });
});
