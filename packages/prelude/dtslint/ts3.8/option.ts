import {
  Option,
  pipe,
  Effect as T,
  Function as F,
  Stream as S,
  StreamEither as SE,
  Managed as M
} from "../../src";

// $ExpectType Effect<{ bar: string; } & { foo: string; }, string, string>
export const X = pipe(
  Option.some(1),
  Option.fold(
    () => T.accessM((_: { bar: string }) => T.raiseError(_.bar)),
    (s) => T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`))
  )
);

// $ExpectType Managed<{ bar: string; } & { foo: string; }, string, string>
export const Y = pipe(
  Option.some(1),
  Option.fold(
    () => M.encaseEffect(T.accessM((_: { bar: string }) => T.raiseError(_.bar))),
    (s) => M.encaseEffect(T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`)))
  )
);

// $ExpectType StreamEither<{ bar: string; } & { foo: string; }, string, string>
export const A = pipe(
  Option.some(1),
  Option.fold(
    () => SE.encaseEffect(T.accessM((_: { bar: string }) => T.raiseError(_.bar))),
    (s) => SE.encaseEffect(T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`)))
  )
);

// $ExpectType string | number
export const Z = pipe(
  Option.some(1),
  Option.fold(
    () => 0,
    (s) => ""
  )
);
