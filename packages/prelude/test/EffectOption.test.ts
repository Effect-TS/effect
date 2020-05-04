import { EO, T, pipe, O, Ex } from "../src";

describe("EffectOption", () => {
  it("should use monad - some", () => {
    const program = pipe(
      T.pure(O.some(1)),
      EO.chain((n) => T.pure(O.some(n + 1))),
      EO.chain((n) => T.pure(O.some(n + 1))),
      EO.map((n) => `result: ${n}`)
    );

    expect(T.runSync(program)).toStrictEqual(Ex.done(O.some(`result: 3`)));
  });
  it("should use monad - none", () => {
    const program = pipe(
      T.pure(O.some(1)),
      EO.chain((n) => T.pure(O.some(n + 1))),
      EO.chain((n) => T.pure(O.some(n + 1))),
      EO.chain(() => T.pure(O.none)),
      EO.map((n) => `result: ${n}`)
    );

    expect(T.runSync(program)).toStrictEqual(Ex.done(O.none));
  });
  it("should use applicative - some", () => {
    const program = EO.sequenceArray([
      T.pure(O.some(0)),
      T.pure(O.some(1)),
      T.pure(O.some(2)),
      T.pure(O.some(3)),
      T.pure(O.some(4))
    ]);

    expect(T.runSync(program)).toStrictEqual(Ex.done(O.some([0, 1, 2, 3, 4])));
  });
  it("should use applicative - none", () => {
    const program = EO.sequenceArray([
      T.pure(O.some(0)),
      T.pure(O.some(1)),
      T.pure(O.some(2)),
      T.pure(O.none),
      T.pure(O.some(4))
    ]);

    expect(T.runSync(program)).toStrictEqual(Ex.done(O.none));
  });
  it("should use getFirst", () => {
    const program = EO.getFirst(
      T.pure(O.none),
      T.pure(O.none),
      T.pure(O.some(2)),
      T.pure(O.none),
      T.pure(O.some(4))
    );

    expect(T.runSync(program)).toStrictEqual(Ex.done(O.some(2)));
  });
  it("should use getFirst - with env", () => {
    const program = EO.getFirst(
      T.pure(O.none),
      T.pure(O.none),
      T.access(({ n }: { n: number }) => O.some(n)),
      T.pure(O.none),
      T.pure(O.some(4))
    );

    expect(T.runSync(pipe(program, T.provide({ n: 2 })))).toStrictEqual(Ex.done(O.some(2)));
  });
  it("should use getFirst - with error", () => {
    const program = EO.getFirst(
      T.pure(O.none),
      T.raiseError("error"),
      T.access(({ n }: { n: number }) => O.some(n)),
      T.pure(O.none),
      T.pure(O.some(4))
    );

    expect(T.runSync(pipe(program, T.provide({ n: 2 })))).toStrictEqual(Ex.raise("error"));
  });
  it("should use getLast - with env", () => {
    const program = EO.getLast(
      T.pure(O.none),
      T.pure(O.none),
      T.access(({ n }: { n: number }) => O.some(n)),
      T.pure(O.none),
      T.pure(O.some(4))
    );

    expect(T.runSync(pipe(program, T.provide({ n: 2 })))).toStrictEqual(Ex.done(O.some(4)));
  });
});
