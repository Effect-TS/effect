import { Service, IO } from "../../src";

interface Foo {
  foo: {
    value: string;
  };
}

const MyServiceURI = Symbol();

// $ExpectType ModuleSpec<{ [MyServiceURI]: { a: Async<number>; b: (_: number) => SyncE<Error, number>; c: (_: number) => AsyncRE<Foo, never, string>; }; }>
const MyService_ = Service.define({
  [MyServiceURI]: {
    a: Service.cn<IO.Async<number>>(),
    b: Service.fn<(_: number) => IO.SyncE<Error, number>>(),
    c: Service.fn<(_: number) => IO.AsyncRE<Foo, never, string>>()
  }
});

export interface MyService extends Service.TypeOf<typeof MyService_> {}

// $ExpectType ModuleSpec<MyService>
export const MyService = Service.opaque<MyService>()(MyService_);

export const {
  // $ExpectType Eff<unknown, MyService, never, number>
  a,
  // $ExpectType FunctionN<[number], Eff<never, MyService, Error, number>>
  b,
  // $ExpectType FunctionN<[number], Eff<unknown, Foo & MyService, never, string>>
  c
} = Service.access(MyService)[MyServiceURI];

// $ExpectType Provider<Foo, MyService, unknown, Error>
Service.implementWithEff(
  IO.async<Error, number>(() => () => {})
)(MyService)(() => ({
  [MyServiceURI]: {
    a: IO.pure(1),
    b: (n) => IO.accessM((_: Foo) => IO.pure(n)),
    c: (n) => IO.pure(`s: ${n}`)
  }
}));

// $ExpectType Provider<Foo, MyService, never>
Service.implementWith(IO.access((_: Foo) => 1))(MyService)(() => ({
  [MyServiceURI]: {
    a: IO.pure(1),
    b: (n) => IO.accessM((_: Foo) => IO.pure(n)),
    c: (n) => IO.pure(`s: ${n}`)
  }
}));

// $ExpectType Provider<Foo, MyService, never, string>
Service.implementWithEff(IO.accessM((_: Foo) => IO.raiseError("ooo")))(MyService)(() => ({
  [MyServiceURI]: {
    a: IO.pure(1),
    b: (n) => IO.accessM((_: Foo) => IO.pure(n)),
    c: (n) => IO.pure(`s: ${n}`)
  }
}));

// $ExpectType Provider<unknown, MyService, never>
Service.implement(MyService)({
  [MyServiceURI]: {
    a: IO.pure(1),
    b: (n) => IO.pure(n),
    c: (n) => IO.pure(`s: ${n}`)
  }
});
