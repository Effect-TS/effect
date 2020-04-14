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

// $ExpectType Effect<unknown, never, number>
const a1 = IO.pure(1);

// $ExpectType Effect<Bar, never, string>
const a2 = IO.accessM((_: Bar) => _[BarURI].getString());

// $ExpectType Effect<Baz, never, string>
const a3 = IO.accessM((_: Baz) => _[BazURI].getString());

// $ExpectType Effect<unknown, AError, never>
const a4 = IO.raiseError(new AError("mmm"));

// $ExpectType Effect<AsyncContext, BError, number>
const b = IO.async<BError, number>((resolve) => {
  const timer = setTimeout(() => {
    resolve(Either.right(1));
  }, 100);
  return (cb) => {
    clearTimeout(timer);
    cb();
  };
});

// $ExpectType Effect<unknown, AError, never>
const c = pipe(
  a1,
  IO.chain((_) => a4)
);

// $ExpectType Effect<Baz & Bar, never, string>
const d = pipe(
  a2,
  IO.chain((_) => a3)
);

// $ExpectType Effect<AsyncContext & Baz & Bar, AError | BError, number>
const e = pipe(
  c,
  IO.chain((_) => d),
  IO.chain((_) => b)
);

// $ExpectType Effect<AsyncContext & Baz & Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const f = Do.do(a1).do(b).bind("c", c).bind("d", d).bind("e", e).done();

// $ExpectType Provider<unknown, Foo, never>
const provideFoo = IO.provideS<Foo>({
  [FooURI]: {
    getNumber: () => IO.pure(1)
  }
});

// $ExpectType Provider<unknown, Bar, never>
const provideBar = IO.provideSO<Bar>({
  [BarURI]: {
    getString: () => IO.pure("bar")
  }
});

// $ExpectType Provider<Foo, Baz, never>
const provideBaz = IO.provideSW<Baz>()(IO.accessM((_: Foo) => _[FooURI].getNumber()))((n) => ({
  [BazURI]: {
    getString: () => IO.pure(`value: ${n}`)
  }
}));

// $ExpectType Effect<Foo & AsyncContext & Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const fb = pipe(f, provideBaz);

// $ExpectType Effect<AsyncContext & Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const ff = pipe(fb, provideFoo);

pipe(ff, provideBar); // $ExpectType Effect<AsyncContext, AError | BError, { c: never; } & { d: string; } & { e: number; }>

pipe(a3, provideBaz, provideFoo, provideBar); // $ExpectType Effect<unknown, never, string>
