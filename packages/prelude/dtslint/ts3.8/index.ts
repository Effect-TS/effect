import { IO, Sync, Either } from "../../src";

const FooURI = "uris/foo";
interface Foo {
  [FooURI]: {
    getNumber: () => Sync<number>;
  };
}

const BarURI = "uris/bar";
interface Bar {
  [BarURI]: {
    getString: () => Sync<string>;
  };
}

const BazURI = "uris/baz";
interface Baz {
  [BazURI]: {
    getString: () => Sync<string>;
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
const a1 = IO.pure(1);

// $ExpectType SyncR<Bar, string>
const a2 = IO.accessM((_: Bar) => _[BarURI].getString());

// $ExpectType SyncR<Baz, string>
const a3 = IO.accessM((_: Baz) => _[BazURI].getString());

// $ExpectType SyncE<AError, never>
const a4 = IO.raiseError(new AError("mmm"));

// $ExpectType AsyncE<BError, number>
const b = IO.async<BError, number>((resolve) => {
  const timer = setTimeout(() => {
    resolve(Either.right(1));
  }, 100);
  return (cb) => {
    clearTimeout(timer);
    cb();
  };
});

// $ExpectType SyncE<AError, never>
const c = IO.pipe(
  a1,
  IO.chain((_) => a4)
);

// $ExpectType SyncR<Baz & Bar, string>
const d = IO.pipe(
  a2,
  IO.chain((_) => a3)
);

// $ExpectType AsyncRE<Baz & Bar, AError | BError, number>
const e = IO.pipe(
  c,
  IO.chain((_) => d),
  IO.chain((_) => b)
);

// $ExpectType AsyncRE<Baz & Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const f = IO.Do.do(a1).do(b).bind("c", c).bind("d", d).bind("e", e).done();

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

// $ExpectType AsyncRE<Bar & Foo, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const fb = IO.pipe(f, provideBaz);

// $ExpectType AsyncRE<Bar, AError | BError, { c: never; } & { d: string; } & { e: number; }>
const ff = IO.pipe(fb, provideFoo);

IO.pipe(ff, provideBar); // $ExpectType AsyncE<AError | BError, { c: never; } & { d: string; } & { e: number; }>

IO.pipe(a3, provideBaz, provideFoo, provideBar); // $ExpectType Sync<string>
