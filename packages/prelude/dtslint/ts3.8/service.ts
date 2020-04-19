import { Service, T } from "../../src";

interface Foo {
  foo: {
    value: string;
  };
}

const MyServiceURI = Symbol();

// $ExpectType ModuleSpec<{ [MyServiceURI]: { a: Async<number>; b: (_: number) => SyncE<Error, number>; c: (_: number) => AsyncRE<Foo, never, string>; }; }>
const MyService_ = Service.define({
  [MyServiceURI]: {
    a: Service.cn<T.Async<number>>(),
    b: Service.fn<(_: number) => T.SyncE<Error, number>>(),
    c: Service.fn<(_: number) => T.AsyncRE<Foo, never, string>>()
  }
});

export interface MyService extends Service.TypeOf<typeof MyService_> {}

// $ExpectType ModuleSpec<MyService>
export const MyService = Service.opaque<MyService>()(MyService_);

export const {
  // $ExpectType Effect<unknown, MyService, never, number>
  a,
  // $ExpectType FunctionN<[number], Effect<never, MyService, Error, number>>
  b,
  // $ExpectType FunctionN<[number], Effect<unknown, Foo & MyService, never, string>>
  c
} = Service.access(MyService)[MyServiceURI];

// $ExpectType Provider<Foo, MyService, Error, unknown>
Service.implementWith(
  T.async<Error, number>(() => () => {})
)(MyService)(() => ({
  [MyServiceURI]: {
    a: T.pure(1),
    b: (n) => T.accessM((_: Foo) => T.pure(n)),
    c: (n) => T.pure(`s: ${n}`)
  }
}));

// $ExpectType Provider<Foo, MyService, never, never>
Service.implementWith(T.access((_: Foo) => 1))(MyService)(() => ({
  [MyServiceURI]: {
    a: T.pure(1),
    b: (n) => T.accessM((_: Foo) => T.pure(n)),
    c: (n) => T.pure(`s: ${n}`)
  }
}));

// $ExpectType Provider<Foo, MyService, string, never>
Service.implementWith(T.accessM((_: Foo) => T.raiseError("ooo")))(MyService)(() => ({
  [MyServiceURI]: {
    a: T.pure(1),
    b: (n) => T.accessM((_: Foo) => T.pure(n)),
    c: (n) => T.pure(`s: ${n}`)
  }
}));

// $ExpectType Provider<unknown, MyService, never, never>
Service.implement(MyService)({
  [MyServiceURI]: {
    a: T.pure(1),
    b: (n) => T.pure(n),
    c: (n) => T.pure(`s: ${n}`)
  }
});
