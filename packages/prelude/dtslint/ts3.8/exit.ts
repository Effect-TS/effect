import { Exit, pipe, Effect as T } from "../../src";

// $ExpectType Effect<{ foo: string; } & { bar: string; }, string | number, string | number>
export const X = pipe(
  Exit.raise(1),
  Exit.fold(
    () => T.pure(2),
    (n) => T.raiseError(n),
    () => T.access((_: { foo: string }) => _.foo),
    () => T.accessM((_: { bar: string }) => T.raiseError(_.bar))
  )
);

// $ExpectType string | number | boolean | symbol
export const Y = pipe(
  Exit.raise(1),
  Exit.fold(
    () => 2,
    Symbol,
    () => true,
    () => "okok"
  )
);
