import * as F from "../../src/freeEnv";
import * as T from "../../src/effect";

export interface Test {
  c: T.SyncE<string, number>;
  fm: (n: number) => T.Sync<void>;
}

export const testEnv = Symbol();

export interface WithTest {
  [testEnv]: Test;
}

export const testM = F.define<WithTest>({
  [testEnv]: {
    fm: F.fn(),
    c: F.cn()
  }
});

export const {
  [testEnv]: {
    // $ExpectType FunctionN<[number], Effect<WithTest, never, void>>
    fm,
    // $ExpectType Effect<WithTest, string, number>
    c
  }
} = F.access(testM);

// $ExpectType Provider<unknown, WithTest, never>
export const P1 = F.implement(testM)({
  [testEnv]: {
    c: T.pure(1),
    fm: () => T.unit
  }
});

// $ExpectType Provider<{ baz: string; } & { fuz: string; }, WithTest, never>
export const P2 = F.implement(testM)({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
});

// $ExpectType Provider<{ baz: string; } & { fuz: string; }, WithTest, never>
export const P3 = F.implementWith(T.pure(1))(testM)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { fuz: string; }, WithTest, never>
export const P4 = F.implementWith(T.pure(1))(testM)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { fuz: string; } & { goo: string; }, WithTest, never>
export const P5 = F.implementWith(T.access((_: { goo: string }) => 1))(testM)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { fuz: string; } & { goo: string; } & AsyncContext, WithTest, never>
export const P6 = F.implementWith(T.accessM((_: { goo: string }) => T.shiftAfter(T.pure(1))))(
  testM
)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { fuz: string; } & { goo: string; } & AsyncContext, WithTest, number>
export const P7 = F.implementWith(T.accessM((_: { goo: string }) => T.shiftAfter(T.raiseError(1))))(
  testM
)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

export interface Test2 {
  fp: <A>(a: A) => T.Effect<T.NoEnv, string, A>;
}

export const testEnv2 = Symbol();

export interface WithTest2 {
  [testEnv2]: Test2;
}

export const testM2 = F.define<WithTest2>({
  [testEnv2]: {
    fp: F.fn()
  }
});

export const {
  [testEnv2]: {
    // $ExpectType "polymorphic signature not supported"
    fp
  }
} = F.access(testM2);
