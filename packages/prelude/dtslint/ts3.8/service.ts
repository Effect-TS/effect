import { Service, Effect as T } from "../../src";

interface Foo {
  foo: {
    value: string;
  };
}

const MyServiceURI = Symbol();

// $ExpectType ModuleSpec<{ [MyServiceURI]: { a: Task<number>; b: (_: number) => IoErr<Error, number>; c: (_: number) => TaskEnvErr<Foo, never, string>; }; }>
const MyService_ = Service.define({
  [MyServiceURI]: {
    a: Service.cn<T.Task<number>>(),
    b: Service.fn<(_: number) => T.IoErr<Error, number>>(),
    c: Service.fn<(_: number) => T.TaskEnvErr<Foo, never, string>>()
  }
});

export interface MyService extends Service.TypeOf<typeof MyService_> {}

// $ExpectType ModuleSpec<MyService>
export const MyService = Service.opaque<MyService>()(MyService_);

export const {
  // $ExpectType Effect<AsyncRT & MyService, never, number>
  a,
  // $ExpectType FunctionN<[number], Effect<MyService, Error, number>>
  b,
  // $ExpectType FunctionN<[number], Effect<AsyncRT & Foo & MyService, never, string>>
  c
} = Service.access(MyService)[MyServiceURI];

// $ExpectType Provider<Foo & AsyncRT, MyService, Error>
Service.implementWith(
  T.async<Error, number>(() => () => {})
)(MyService)(() => ({
  [MyServiceURI]: {
    a: T.pure(1),
    b: (n) => T.accessM((_: Foo) => T.pure(n)),
    c: (n) => T.pure(`s: ${n}`)
  }
}));

// $ExpectType Provider<Foo, MyService, never>
Service.implementWith(T.access((_: Foo) => 1))(MyService)(() => ({
  [MyServiceURI]: {
    a: T.pure(1),
    b: (n) => T.accessM((_: Foo) => T.pure(n)),
    c: (n) => T.pure(`s: ${n}`)
  }
}));

// $ExpectType Provider<Foo, MyService, string>
Service.implementWith(T.accessM((_: Foo) => T.raiseError("ooo")))(MyService)(() => ({
  [MyServiceURI]: {
    a: T.pure(1),
    b: (n) => T.accessM((_: Foo) => T.pure(n)),
    c: (n) => T.pure(`s: ${n}`)
  }
}));

// $ExpectType Provider<unknown, MyService, never>
Service.implement(MyService)({
  [MyServiceURI]: {
    a: T.pure(1),
    b: (n) => T.pure(n),
    c: (n) => T.pure(`s: ${n}`)
  }
});
