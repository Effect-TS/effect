import { Ex, pipe, T } from "../../src";

// $ExpectType Effect<{ foo: string; } & { bar: string; }, string | number, string | number>
export const X = pipe(
  Ex.raise(1),
  Ex.fold(
    () => T.pure(2),
    (n) => T.raiseError(n),
    () => T.access((_: { foo: string }) => _.foo),
    () => T.accessM((_: { bar: string }) => T.raiseError(_.bar))
  )
);

// $ExpectType string | number | boolean | symbol
export const Y = pipe(
  Ex.raise(1),
  Ex.fold(
    () => 2,
    Symbol,
    () => true,
    () => "okok"
  )
);
