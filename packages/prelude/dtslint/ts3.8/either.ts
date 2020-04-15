import { Either, pipe, T, F, S, SE, M } from "../../src";

// $ExpectType Effect<{ bar: string; } & { foo: string; }, number, string>
export const X = pipe(
  Either.left(1),
  Either.fold(
    (n) => T.accessM((_: { bar: string }) => T.raiseError(n)),
    (s) => T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`))
  )
);

// $ExpectType Stream<{ bar: string; } & { foo: string; }, number, string>
export const S_ = pipe(
  Either.left(1),
  Either.fold(
    (n) => S.encaseEffect(T.accessM((_: { bar: string }) => T.raiseError(n))),
    (s) => S.encaseEffect(T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`)))
  )
);

// $ExpectType StreamEither<{ bar: string; } & { foo: string; }, number, string>
export const SE_ = pipe(
  Either.left(1),
  Either.fold(
    (n) => SE.encaseEffect(T.accessM((_: { bar: string }) => T.raiseError(n))),
    (s) => SE.encaseEffect(T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`)))
  )
);

// $ExpectType Managed<{ bar: string; } & { foo: string; }, number, string>
export const M_ = pipe(
  Either.left(1),
  Either.fold(
    (n) => M.encaseEffect(T.accessM((_: { bar: string }) => T.raiseError(n))),
    (s) => M.encaseEffect(T.accessM((_: { foo: string }) => T.sync(() => `${_.foo} - ${s}`)))
  )
);

// $ExpectType number
export const Y = pipe(
  Either.left(1),
  Either.fold((n) => n, F.identity)
);

// $ExpectType Either<never, number>
export const Z = pipe(
  Either.left(1),
  Either.orElse((n) => Either.right(n))
);

// $ExpectType Either<string, never>
export const A = pipe(
  Either.left(1),
  Either.orElse((_) => Either.left("n"))
);

// $ExpectType string
export const B = pipe(
  Either.left(""),
  Either.getOrElse((_) => "n")
);

// $ExpectType Either<string | number, string | symbol>
export const C = Either.sequenceT(
  Either.left(1),
  Either.left(""),
  Either.right("ok"),
  Either.right(Symbol())
);

// $ExpectType Either<string | number | symbol, { a: never; b: never; c: string; d: symbol; }>
export const D = Either.sequenceS({
  a: Either.left(1),
  b: Either.left(""),
  c: Either.right<symbol, string>("ok"),
  d: Either.right(Symbol())
});

// $ExpectType Either<"a" | "b" | "c" | "d" | "e" | "g" | "h", { c: never; } & { d: never; } & { e: never; f: never; } & { g: never; h: never; } & { i: number; } & { j: number; }>
export const E = Either.Do.do(Either.left("a" as const))
  .doL(() => Either.left("b" as const))
  .bindL("c", () => Either.left("c" as const))
  .bind("d", Either.left("d" as const))
  .sequenceS({ e: Either.left("e" as const), f: Either.left("e" as const) })
  .sequenceSL(() => ({ g: Either.left("g" as const), h: Either.left("h" as const) }))
  .let("i", 1)
  .letL("j", () => 1)
  .done();
