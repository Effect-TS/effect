import { O, pipe, T, S, SE, M } from "../../src";

// $ExpectType Effect<{ bar: string; } & { foo: string; }, string, string>
export const X = pipe(
  O.some(1),
  O.fold(
    () => T.accessM((_: { bar: string }) => T.raiseError(_.bar)),
    (s) => T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`))
  )
);

// $ExpectType Managed<{ bar: string; } & { foo: string; }, string, string>
export const Y = pipe(
  O.some(1),
  O.fold(
    () => M.encaseEffect(T.accessM((_: { bar: string }) => T.raiseError(_.bar))),
    (s) => M.encaseEffect(T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`)))
  )
);

// $ExpectType StreamEither<{ bar: string; } & { foo: string; }, string, string>
export const A = pipe(
  O.some(1),
  O.fold(
    () => SE.encaseEffect(T.accessM((_: { bar: string }) => T.raiseError(_.bar))),
    (s) => SE.encaseEffect(T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`)))
  )
);

// $ExpectType Stream<{ bar: string; } & { foo: string; }, string, string>
export const B = pipe(
  O.some(1),
  O.fold(
    () => S.encaseEffect(T.accessM((_: { bar: string }) => T.raiseError(_.bar))),
    (s) => S.encaseEffect(T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`)))
  )
);

// $ExpectType string | number
export const Z = pipe(
  O.some(1),
  O.fold(
    () => 0,
    (s) => ""
  )
);
