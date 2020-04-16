import { E, pipe, T, F, S, SE, M } from "../../src";

// $ExpectType Effect<{ bar: string; } & { foo: string; }, number, string>
export const X = pipe(
  E.left(1),
  E.fold(
    (n) => T.accessM((_: { bar: string }) => T.raiseError(n)),
    (s) => T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`))
  )
);

// $ExpectType Stream<{ bar: string; } & { foo: string; }, number, string>
export const S_ = pipe(
  E.left(1),
  E.fold(
    (n) => S.encaseEffect(T.accessM((_: { bar: string }) => T.raiseError(n))),
    (s) => S.encaseEffect(T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`)))
  )
);

// $ExpectType StreamEither<{ bar: string; } & { foo: string; }, number, string>
export const SE_ = pipe(
  E.left(1),
  E.fold(
    (n) => SE.encaseEffect(T.accessM((_: { bar: string }) => T.raiseError(n))),
    (s) => SE.encaseEffect(T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`)))
  )
);

// $ExpectType Managed<{ bar: string; } & { foo: string; }, number, string>
export const M_ = pipe(
  E.left(1),
  E.fold(
    (n) => M.encaseEffect(T.accessM((_: { bar: string }) => T.raiseError(n))),
    (s) => M.encaseEffect(T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`)))
  )
);

// $ExpectType number
export const Y = pipe(
  E.left(1),
  E.fold((n) => n, F.identity)
);

// $ExpectType Either<never, number>
export const Z = pipe(
  E.left(1),
  E.orElse((n) => E.right(n))
);

// $ExpectType Either<string, never>
export const A = pipe(
  E.left(1),
  E.orElse((_) => E.left("n"))
);

// $ExpectType string
export const B = pipe(
  E.left(""),
  E.getOrElse((_) => "n")
);

// $ExpectType Either<string | number, string | symbol>
export const C = E.sequenceT(E.left(1), E.left(""), E.right("ok"), E.right(Symbol()));

// $ExpectType Either<string | number | symbol, { a: never; b: never; c: string; d: symbol; }>
export const D = E.sequenceS({
  a: E.left(1),
  b: E.left(""),
  c: E.right<symbol, string>("ok"),
  d: E.right(Symbol())
});

// $ExpectType Either<"a" | "b" | "c" | "d" | "e" | "g" | "h", { c: never; } & { d: never; } & { e: never; f: never; } & { g: never; h: never; } & { i: number; } & { j: number; }>
export const E_ = E.Do.do(E.left("a" as const))
  .doL(() => E.left("b" as const))
  .bindL("c", () => E.left("c" as const))
  .bind("d", E.left("d" as const))
  .sequenceS({ e: E.left("e" as const), f: E.left("e" as const) })
  .sequenceSL(() => ({ g: E.left("g" as const), h: E.left("h" as const) }))
  .let("i", 1)
  .letL("j", () => 1)
  .done();
