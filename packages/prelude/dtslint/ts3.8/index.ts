import { Either, pipe, Effect as T } from "../../src";

const FooURI = "uris/foo";
interface Foo {
  [FooURI]: {
    getNumber: () => T.Io<number>;
  };
}

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

// $ExpectType Effect<unknown, never, number>
const a1 = T.pure(1);

// $ExpectType Effect<Bar, never, string>
const a2 = T.accessM((_: Bar) => _[BarURI].getString());

// $ExpectType Effect<Baz, never, string>
const a3 = T.accessM((_: Baz) => _[BazURI].getString());

// $ExpectType Effect<unknown, AError, never>
const a4 = T.raiseError(new AError("mmm"));

// $ExpectType Effect<AsyncRT, BError, number>
const b = T.async<BError, number>((resolve) => {
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
  T.chain((_) => a4)
);

// $ExpectType Effect<Baz & Bar, never, string>
const d = pipe(
  a2,
  T.chain((_) => a3)
);

// $ExpectType Effect<AsyncRT & Baz & Bar, AError | BError, number>
const e = pipe(
  c,
  T.chain((_) => d),
  T.chain((_) => b)
);

// $ExpectType Effect<AsyncRT & Baz & Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const f = T.Do.do(a1).do(b).bind("c", c).bind("d", d).bind("e", e).done();

// $ExpectType Provider<unknown, Foo, never>
const provideFoo = T.provide<Foo>({
  [FooURI]: {
    getNumber: () => T.pure(1)
  }
});

// $ExpectType Provider<unknown, Bar, never>
const provideBar = T.provide<Bar>(
  {
    [BarURI]: {
      getString: () => T.pure("bar")
    }
  },
  true
);

// $ExpectType Provider<Foo, Baz, never>
const provideBaz = T.provideM(
  pipe(
    T.accessM((_: Foo) => _[FooURI].getNumber()),
    T.map(
      (n): Baz => ({
        [BazURI]: {
          getString: () => T.pure(`value: ${n}`)
        }
      })
    )
  )
);

// $ExpectType Effect<Foo & AsyncRT & Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const fb = pipe(f, provideBaz);

// $ExpectType Effect<AsyncRT & Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const ff = pipe(fb, provideFoo);

pipe(ff, provideBar); // $ExpectType Effect<AsyncRT, AError | BError, { c: never; } & { d: string; } & { e: number; }>

pipe(a3, provideBaz, provideFoo, provideBar); // $ExpectType Effect<unknown, never, string>
