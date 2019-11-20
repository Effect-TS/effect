## experimental

The idea behind this package is to allow you to easily derive an RPC implementation for your effects.

Docs at [https://mikearnaldi.github.io/matechs-effect/modules/_matechs_rpc.html](https://mikearnaldi.github.io/matechs-effect/modules/_matechs_rpc.html)

In general we cannot allow any effect to be serialized, in particular an effect that supports RPC integration has to satisfy:

```ts
export type CanRemote = {
  [k: string]: { [h: string]: (...args: any[]) => T.Effect<any, Error, any> };
};
```

An example effect that support RPC:

```ts
interface ModuleA extends CanRemote {
  moduleA: {
    sayHi(a: Serializable, b: Serializable): T.Effect<YourEnv, Error, SerializableOutput>;
  };
}
```

An example effect that cannot support RPC:

```ts
interface ModuleA {
  moduleA: {
    runStuff<A>(f: (a:A) => void): T.Effect<YourEnv, Error, SerializableOutput>;
  };
}
```

Note: you can always extract the RPC part as a separate effect and have your full effect extending the base RPC one.

```ts
interface ModuleARPC extends CanRemote {
  moduleA: {
    sayHi(a: Serializable, b: Serializable): T.Effect<YourEnv, Error, SerializableOutput>;
  };
}
interface ModuleANoRPC {
  moduleA: {
    runStuff<A>(f: (a:A) => void): T.Effect<YourEnv, Error, SerializableOutput>;
  };
}
type ModuleA = ModuleARPC & ModuleANoRPC
```

In order to implement a client suppose you have an effect on the server side:

```ts
export interface ModuleA extends CanRemote {
  moduleA: {
    sayHiAndReturn(s: string): T.Effect<T.NoEnv, Error, string>;
  };
}

export const moduleA: ModuleA = {
  moduleA: {
    sayHiAndReturn(s: string): T.Effect<T.NoEnv, Error, string> {
      return T.left(T.error("not implemented"));
    }
  }
};

// in general you need to write this manually for effects that don't support CanRemote,
// in case of CanRemote you can use automatic derivation.
export const {
  moduleA: { sayHiAndReturn }
} = serverHelpers(moduleA);

// this gets translated to:
export function sayHiAndReturn(s: string): Effect<ModuleA, Error, string> {
    return accessM(({moduleA}: ModuleA) => moduleA.sayHiAndReturn(s))
}
```

You can implement a client in this way:

```ts
export const clientModuleA = reinterpretRemotely(moduleA, "url");

export const {
  moduleA: { sayHiAndReturn }
} = clientHelpers(moduleA);

// this gets translated to:
export function sayHiAndReturn(s: string): Effect<Remote<ModuleA>, Error, string> {
    return accessM(({moduleA}: Remote<ModuleA>) => moduleA.sayHiAndReturn(s))
}
```

Your module gets reinterpreted in terms of http calls by `reinterpretRemotely` and `clientHelpers/serverHelpers` fix up the dependencies accordingly to server/client context.

You can then compose `sayHiAndReturn` in your program in exactly the same way for both client and server.

Examples available in `test/rpc` and `demo/`
