import { E, pipe, T, flowF, combineProviders } from "../../src";

const FooURI = "uris/foo";
interface Foo {
  [FooURI]: {
    getNumber: () => T.Sync<number>;
  };
}

const BarURI = "uris/bar";
interface Bar {
  [BarURI]: {
    getString: () => T.Sync<string>;
  };
}

const BazURI = "uris/baz";
interface Baz {
  [BazURI]: {
    getString: () => T.Sync<string>;
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

// $ExpectType Sync<number>
const a1 = T.pure(1);

// $ExpectType Effect<never, Bar, never, string>
const a2 = T.accessM((_: Bar) => _[BarURI].getString());

// $ExpectType Effect<never, Baz, never, string>
const a3 = T.accessM((_: Baz) => _[BazURI].getString());

// $ExpectType SyncE<AError, never>
const a4 = T.raiseError(new AError("mmm"));

// $ExpectType AsyncE<BError, number>
const b = T.async<BError, number>((resolve) => {
  const timer = setTimeout(() => {
    resolve(E.right(1));
  }, 100);
  return (cb) => {
    clearTimeout(timer);
    cb();
  };
});

// $ExpectType Effect<never, unknown, AError, never>
const c = pipe(
  a1,
  T.chain((_) => a4)
);

// $ExpectType Effect<never, Baz & Bar, never, string>
const d = pipe(
  a2,
  T.chain((_) => a3)
);

// $ExpectType Effect<unknown, Baz & Bar, AError | BError, number>
const e = pipe(
  c,
  T.chain((_) => d),
  T.chain((_) => b)
);

// $ExpectType Effect<unknown, Baz & Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const f = T.Do.do(a1).do(b).bind("c", c).bind("d", d).bind("e", e).done();

// $ExpectType Provider<unknown, Foo, never, never>
const provideFoo = T.provide<Foo>({
  [FooURI]: {
    getNumber: () => T.pure(1)
  }
});

// $ExpectType Provider<unknown, Bar, never, never>
const provideBar = T.provide<Bar>(
  {
    [BarURI]: {
      getString: () => T.pure("bar")
    }
  },
  "inverted"
);

// $ExpectType Provider<Foo, Baz, never, never>
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

// $ExpectType Provider<Foo, Baz, never, unknown>
const provideBazA = T.provideM(
  pipe(
    T.shiftAfter(T.accessM((_: Foo) => _[FooURI].getNumber())),
    T.map(
      (n): Baz => ({
        [BazURI]: {
          getString: () => T.pure(`value: ${n}`)
        }
      })
    )
  )
);

// $ExpectType Effect<unknown, Foo & Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const fb = pipe(f, provideBaz);

// $ExpectType Effect<unknown, Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const ff = pipe(fb, provideFoo);

pipe(ff, provideBar); // $ExpectType Effect<unknown, unknown, AError | BError, { c: never; } & { d: string; } & { e: number; }>

pipe(a3, provideBaz, provideFoo, provideBar); // $ExpectType Effect<never, unknown, never, string>

// $ExpectType Provider<unknown, Baz & Bar & Foo, never, never>
const combinedP = combineProviders().with(provideBaz).with(provideBar).with(provideFoo).asEffect();

// $ExpectType Provider<unknown, Baz & Bar & Foo, never, unknown>
const combinedP2 = combineProviders()
  .with(provideBazA)
  .with(provideBar)
  .with(provideFoo)
  .asEffect();

pipe(a3, combinedP); // $ExpectType Effect<never, unknown, never, string>
pipe(a3, combinedP2); // $ExpectType Effect<unknown, unknown, never, string>

// $ExpectType (_: number) => number
export const h = flowF((_: number) => `s: ${_}`)
  .flow((s) => s.length)
  .done();
