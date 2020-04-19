import * as F from "../../src/freeEnv";
import * as T from "../../src/effect";

export interface Test {
  c: T.AsyncE<string, number>;
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
    // $ExpectType Effect<unknown, WithTest, string, number>
    c,
    // $ExpectType FunctionN<[number], Effect<never, WithTest, never, void>>
    fm
  }
} = F.access(testM);

// $ExpectType Provider<unknown, WithTest, never, never>
export const P1 = F.implement(testM)({
  [testEnv]: {
    c: T.pure(1),
    fm: () => T.unit
  }
});

// $ExpectType Provider<{ baz: string; } & { fuz: string; }, WithTest, never, never>
export const P2 = F.implement(testM)({
  [testEnv]: {
    c: T.shiftAfter(T.access((_: { baz: string }) => 1)),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
});

// $ExpectType Provider<{ baz: string; } & { fuz: string; }, WithTest, never, never>
export const P2_ = F.implement(testM)({
  [testEnv]: {
    c: T.shiftAfter(T.access((_: { baz: string }) => 1)),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
});

// $ExpectType Provider<{ baz: string; } & { fuz: string; }, WithTest, never, never>
export const P3 = F.implementWith(T.pure(1))(testM)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { fuz: string; }, WithTest, never, never>
export const P4 = F.implementWith(T.pure(1))(testM)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { fuz: string; } & { goo: string; }, WithTest, never, never>
export const P5 = F.implementWith(T.access((_: { goo: string }) => 1))(testM)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { fuz: string; } & { goo: string; }, WithTest, never, unknown>
export const P6 = F.implementWith(T.accessM((_: { goo: string }) => T.shiftAfter(T.pure(1))))(
  testM
)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { fuz: string; } & { goo: string; }, WithTest, never, unknown>
export const P6_ = F.implementWith(T.accessM((_: { goo: string }) => T.shiftAfter(T.pure(1))))(
  testM
)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { fuz: string; } & { goo: string; }, WithTest, number, unknown>
export const P7 = F.implementWith(T.accessM((_: { goo: string }) => T.shiftAfter(T.raiseError(1))))(
  testM
)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

export interface Test2 {
  fp: <A>(a: A) => T.AsyncE<string, A>;
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

// $ExpectType Effect<unknown, { baz: string; } & { fuz: string; } & { goo: string; }, number, void>
export const _7f = P7(fm(1));

// $ExpectType Effect<never, { baz: string; } & { fuz: string; }, never, void>
export const _4f = P4(fm(1));

// $ExpectType Effect<unknown, { baz: string; } & { fuz: string; }, string, number>
export const _4c = P4(c);

// $ExpectType Effect<unknown, { baz: string; } & { fuz: string; } & { goo: string; }, string | number, number>
export const _7c = P7(c);
