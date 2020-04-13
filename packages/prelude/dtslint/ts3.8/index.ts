import { IO, pipe, Either, Do } from "../../src";

const FooURI = "uris/foo";
interface Foo {
  [FooURI]: {
    getNumber: () => IO.Sync<number>;
  };
}

const BarURI = "uris/bar";
interface Bar {
  [BarURI]: {
    getString: () => IO.Sync<string>;
  };
}

const BazURI = "uris/baz";
interface Baz {
  [BazURI]: {
    getString: () => IO.Sync<string>;
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

// $ExpectType Eff<never, unknown, never, number>
const a1 = IO.pure(1);

// $ExpectType Eff<never, Bar, never, string>
const a2 = IO.accessM((_: Bar) => _[BarURI].getString());

// $ExpectType Eff<never, Baz, never, string>
const a3 = IO.accessM((_: Baz) => _[BazURI].getString());

// $ExpectType Eff<never, unknown, AError, never>
const a4 = IO.raiseError(new AError("mmm"));

// $ExpectType Eff<unknown, unknown, BError, number>
const b = IO.async<BError, number>((resolve) => {
  const timer = setTimeout(() => {
    resolve(Either.right(1));
  }, 100);
  return (cb) => {
    clearTimeout(timer);
    cb();
  };
});

// $ExpectType Eff<never, unknown, AError, never>
const c = pipe(
  a1,
  IO.chain((_) => a4)
);

// $ExpectType Eff<never, Baz & Bar, never, string>
const d = pipe(
  a2,
  IO.chain((_) => a3)
);

// $ExpectType Eff<unknown, Baz & Bar, AError | BError, number>
const e = pipe(
  c,
  IO.chain((_) => d),
  IO.chain((_) => b)
);

// $ExpectType Eff<unknown, Baz & Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const f = Do.do(a1).do(b).bind("c", c).bind("d", d).bind("e", e).done();

// $ExpectType Provider<unknown, Foo, never, never>
const provideFoo = IO.provideS<Foo>({
  [FooURI]: {
    getNumber: () => IO.pure(1)
  }
});

// $ExpectType Provider<unknown, Bar, never, never>
const provideBar = IO.provideSO<Bar>({
  [BarURI]: {
    getString: () => IO.pure("bar")
  }
});

// $ExpectType Provider<Foo, Baz, never, never>
const provideBaz = IO.provideSW<Baz>()(IO.accessM((_: Foo) => _[FooURI].getNumber()))((n) => ({
  [BazURI]: {
    getString: () => IO.pure(`value: ${n}`)
  }
}));

// $ExpectType Eff<unknown, Foo & Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const fb = pipe(f, provideBaz);

// $ExpectType Eff<unknown, Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const ff = pipe(fb, provideFoo);

pipe(ff, provideBar); // $ExpectType Eff<unknown, unknown, AError | BError, { c: never; } & { d: string; } & { e: number; }>

pipe(a3, provideBaz, provideFoo, provideBar); // $ExpectType Eff<never, unknown, never, string>
