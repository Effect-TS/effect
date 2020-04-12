import { Service, Async, SyncE, AsyncRE, IO } from "../../src";

interface Foo {
  foo: {
    value: string;
  };
}

const MyServiceURI = Symbol();

// $ExpectType ModuleSpec<{ [MyServiceURI]: { a: Async<number>; b: (_: number) => SyncE<Error, number>; c: (_: number) => AsyncRE<Foo, never, string>; }; }>
const MyService_ = Service.define({
  [MyServiceURI]: {
    a: Service.cn<Async<number>>(),
    b: Service.fn<(_: number) => SyncE<Error, number>>(),
    c: Service.fn<(_: number) => AsyncRE<Foo, never, string>>()
  }
});

export interface MyService extends Service.TypeOf<typeof MyService_> {}

// $ExpectType ModuleSpec<MyService>
export const MyService = Service.opaque<MyService>()(MyService_);

export const {
  // $ExpectType AsyncR<MyService, number>
  a,
  // $ExpectType FunctionN<[number], SyncRE<MyService, Error, number>>
  b,
  // $ExpectType FunctionN<[number], AsyncR<Foo & MyService, string>>
  c
} = Service.access(MyService)[MyServiceURI];

// $ExpectType Provider<Foo, MyService, unknown, Error>
Service.implementWith(
  IO.async<Error, number>(() => () => {})
)(MyService)(() => ({
  [MyServiceURI]: {
    a: IO.pure(1),
    b: (n) => IO.accessM((_: Foo) => IO.pure(n)),
    c: (n) => IO.pure(`s: ${n}`)
  }
}));

// $ExpectType Provider<Foo, MyService, never, never>
Service.implementWith(IO.access((_: Foo) => 1))(MyService)(() => ({
  [MyServiceURI]: {
    a: IO.pure(1),
    b: (n) => IO.accessM((_: Foo) => IO.pure(n)),
    c: (n) => IO.pure(`s: ${n}`)
  }
}));

// $ExpectType Provider<Foo, MyService, never, string>
Service.implementWith(IO.accessM((_: Foo) => IO.raiseError("ooo")))(MyService)(() => ({
  [MyServiceURI]: {
    a: IO.pure(1),
    b: (n) => IO.accessM((_: Foo) => IO.pure(n)),
    c: (n) => IO.pure(`s: ${n}`)
  }
}));

// $ExpectType Provider<unknown, MyService, never, never>
Service.implement(MyService)({
  [MyServiceURI]: {
    a: IO.pure(1),
    b: (n) => IO.pure(n),
    c: (n) => IO.pure(`s: ${n}`)
  }
});
