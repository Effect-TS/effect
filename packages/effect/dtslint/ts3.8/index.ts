import * as T from "../../src/effect";
import { ATypeOf, EnvOf } from "../../src/overloadEff";
import { Do } from "fp-ts-contrib/lib/Do";
import { semigroupString } from "fp-ts/lib/Semigroup";

T.pure(1); // $ExpectType Sync<number>
T.effect.of(1); // $ExpectType Effect<never, unknown, never, number>

const envA = Symbol();
const envB = Symbol();

interface EnvA {
  [envA]: {
    foo: string;
  };
}

interface EnvB {
  [envB]: {
    foo: string;
  };
}

const fa = T.accessM(({ [envA]: { foo } }: EnvA) => T.pure(foo)); // $ExpectType Effect<never, EnvA, never, string>
const fb = T.accessM(({ [envB]: { foo } }: EnvB) => T.pure(foo)); // $ExpectType Effect<never, EnvB, never, string>
const fc = T.accessM(({ [envA]: { foo } }: EnvA) => T.effect.of(foo)); // $ExpectType Effect<never, EnvA, never, string>
const fd = T.accessM(({ [envB]: { foo } }: EnvB) => T.effect.of(foo)); // $ExpectType Effect<never, EnvB, never, string>

const program = T.effect.chain(fa, (_) => fb); // $ExpectType Effect<never, EnvA & EnvB, never, string>
const program2 = T.effect.chain(fa, (_) => fd); // $ExpectType Effect<never, EnvA & EnvB, never, string>
program2;
const program3 = T.effect.chain(fc, (_) => fb); // $ExpectType Effect<never, EnvA & EnvB, never, string>
program3;

const fae = T.accessM(({ [envA]: { foo } }: EnvA) => T.raiseError(foo));

T.effect.chain(fae, (_) => fb); // $ExpectType Effect<never, EnvA & EnvB, string, string>

T.provide<EnvA>({} as EnvA)(program); // $ExpectType Effect<never, EnvB, never, string>

interface Env1 {
  value: string;
}
interface Env2 {
  value2: string;
}
interface Env3 {
  value3: string;
}

export type UnionToIntersection2<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

type UString = T.SyncE<unknown, string>;
type Env1String = T.SyncRE<Env1, unknown, string>;
type Env2String = T.SyncRE<Env2, unknown, string>;
type NeverString = T.SyncRE<never, unknown, string>;
export type R2 = EnvOf<{ a: Env1String; b: UString }>; // $ExpectType Env1
export type R4 = EnvOf<{ a: Env1String; b: Env2String }>; // $ExpectType Env1 & Env2
export type ATypeOfU = ATypeOf<UString>; // $ExpectType string
export type ATypeOfO = ATypeOf<Env1String>; // $ExpectType string
export type ATypeOfNever = ATypeOf<NeverString>; // $ExpectType string

const M = T.effect;

// $ExpectType Effect<never, Env2 & Env1, string, { x: string; } & { a: never; b: never; }>
export const doAErr = Do(M)
  .bindL("x", () => T.accessM(({}: Env2) => T.pure("a")))
  .sequenceS({
    a: T.accessM(({}: Env1) => M.throwError("a")),
    b: M.throwError("b")
  })
  .return((r) => r);

// $ExpectType Effect<never, Env1 & Env2, string | number, { a: never; c: never; b: never; }>
export const doSequenceSErrorUnion = Do(M)
  .sequenceS({
    a: T.accessM(({}: Env2) => M.throwError("a")),
    c: T.accessM(({}: Env1) => M.throwError(1)),
    b: M.throwError("b")
  })
  .return((r) => r);

// $ExpectType Effect<never, Env1 & Env2, string | number, { a: never; c: never; b: never; }>
export const doSequenceSLErrorUnion = Do(M)
  .sequenceSL(() => ({
    a: T.accessM(({}: Env2) => M.throwError("a")),
    c: T.accessM(({}: Env1) => M.throwError(1)),
    b: M.throwError("b")
  }))
  .return((r) => r);

// $ExpectType Effect<never, Env2 & Env1, never, { x: string; } & { a: string; b: number; }>
export const doA = Do(M)
  .bindL("x", () => T.accessM(({}: Env2) => T.pure("a")))
  .sequenceS({
    a: T.accessM(({}: Env1) => T.pure("a")),
    b: T.pure(2)
  })
  .return((r) => r);

// $ExpectType Effect<never, unknown, string, { x: string; } & { a: never; b: never; }>
export const doB = Do(M)
  .bindL("x", () => T.pure("a"))
  .sequenceS({
    a: M.throwError("a"),
    b: M.throwError("b")
  })
  .return((r) => r);

// $ExpectType Effect<never, Env2 & Env1 & Env3, string, { x: string; } & { a: never; b: never; }>
export const doC = Do(M)
  .bindL("x", () => T.accessM(({}: Env2) => T.pure("a")))
  .sequenceS({
    a: T.accessM(({}: Env1) => M.throwError("a")),
    b: T.accessM(({}: Env3) => M.throwError("b"))
  })
  .return((r) => r);

const M2 = T.getValidationM(semigroupString);

// $ExpectType Effect<never, Env2 & Env1, string, { x: string; } & { a: never; b: never; }>
export const doA2 = Do(M2)
  .bindL("x", () => T.accessM(({}: Env2) => T.pure("a")))
  .sequenceS({
    a: T.accessM(({}: Env1) => M.throwError("a")),
    b: M.throwError("b")
  })
  .return((r) => r);

// $ExpectType Effect<never, unknown, string, { x: string; } & { a: never; b: never; }>
export const doB2 = Do(M2)
  .bindL("x", () => T.pure("a"))
  .sequenceS({
    a: M.throwError("a"),
    b: M.throwError("b")
  })
  .return((r) => r);

// $ExpectType Effect<never, Env2 & Env1 & Env3, string, { x: string; } & { a: never; b: never; }>
export const doC2 = Do(M2)
  .bindL("x", () => T.accessM(({}: Env2) => T.pure("a")))
  .sequenceS({
    a: T.accessM(({}: Env1) => M.throwError("a")),
    b: T.accessM(({}: Env3) => M.throwError("b"))
  })
  .return((r) => r);

// $ExpectType Effect<never, unknown, never, string | number>
T.effect.foldExit(
  T.raiseError(""),
  () => T.pure("1"),
  () => T.pure(1)
);

// $ExpectType AsyncRE<unknown, never, string | number>
T.shiftAfter(
  T.effect.foldExit(
    T.raiseError(""),
    () => T.pure("1"),
    () => T.pure(1)
  )
);
