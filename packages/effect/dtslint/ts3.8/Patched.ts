import * as F from "../../src/freeEnv";
import * as T from "../../src/effect";
import * as TE from "../../src/eff";

export interface Test {
  c: T.Effect<T.NoEnv, string, number>;
  fm: (n: number) => T.Effect<T.NoEnv, never, void>;
  fg: (n: number) => TE.Eff<never, T.NoEnv, never, void>;
  c2: TE.Eff<never, T.NoEnv, never, void>;
}

export const testEnv = Symbol();

export interface WithTest {
  [testEnv]: Test;
}

export const testM = F.define<WithTest>({
  [testEnv]: {
    fm: F.fn(),
    c: F.cn(),
    fg: F.fn(),
    c2: F.cn()
  }
});

export const {
  [testEnv]: {
    // $ExpectType FunctionN<[number], Effect<WithTest, never, void>>
    fm,
    // $ExpectType Effect<WithTest, string, number>
    c,
    // $ExpectType FunctionN<[number], Eff<never, WithTest, never, void>>
    fg,
    // $ExpectType Eff<never, WithTest, never, void>
    c2
  }
} = F.access(testM);

// $ExpectType Provider<unknown, WithTest, never, never>
export const P1 = F.implementEff(testM)({
  [testEnv]: {
    c: T.pure(1),
    c2: TE.pure(1),
    fg: () => TE.unit,
    fm: () => T.unit
  }
});

// $ExpectType Provider<{ baz: string; } & { bar: string; } & { foo: string; } & { fuz: string; }, WithTest, never>
export const P2 = F.implement(testM)({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    c2: TE.access((_: { bar: string }) => 1),
    fg: () => TE.accessM((_: { foo: string }) => TE.unit),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
});

// $ExpectType Provider<{ baz: string; } & { bar: string; } & { foo: string; } & { fuz: string; }, WithTest, never>
export const P3 = F.implementWith(T.pure(1))(testM)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    c2: TE.access((_: { bar: string }) => 1),
    fg: () => TE.accessM((_: { foo: string }) => TE.unit),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { bar: string; } & { foo: string; } & { fuz: string; }, WithTest, never, never>
export const P4 = F.implementWithEff(TE.pure(1))(testM)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    c2: TE.access((_: { bar: string }) => 1),
    fg: () => TE.accessM((_: { foo: string }) => TE.unit),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { bar: string; } & { foo: string; } & { fuz: string; } & { goo: string; }, WithTest, never, never>
export const P5 = F.implementWithEff(TE.access((_: { goo: string }) => 1))(testM)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    c2: TE.access((_: { bar: string }) => 1),
    fg: () => TE.accessM((_: { foo: string }) => TE.unit),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { bar: string; } & { foo: string; } & { fuz: string; } & { goo: string; }, WithTest, unknown, never>
export const P6 = F.implementWithEff(TE.accessM((_: { goo: string }) => TE.shiftAfter(TE.pure(1))))(
  testM
)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    c2: TE.access((_: { bar: string }) => 1),
    fg: () => TE.accessM((_: { foo: string }) => TE.unit),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { bar: string; } & { foo: string; } & { fuz: string; } & { goo: string; }, WithTest, unknown, number>
export const P7 = F.implementWithEff(
  TE.accessM((_: { goo: string }) => TE.shiftAfter(TE.raiseError(1)))
)(testM)(() => ({
  [testEnv]: {
    c: T.access((_: { baz: string }) => 1),
    c2: TE.access((_: { bar: string }) => 1),
    fg: () => TE.accessM((_: { foo: string }) => TE.unit),
    fm: () => T.accessM((_: { fuz: string }) => T.unit)
  }
}));

// $ExpectType Provider<{ baz: string; } & { bar: string; } & { foo: string; } & { fuz: string; } & { goo: string; }, WithTest, number>
export const P8 = TE.providerToEffect(P7);

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
