import * as _ from "../../src/effect";
import { ATypeOf, EnvOf } from "../../src/overload";
import { Do } from "fp-ts-contrib/lib/Do";
import { semigroupString } from "fp-ts/lib/Semigroup";

_.pure(1); // $ExpectType Effect<unknown, never, number>
_.effect.of(1); // $ExpectType Effect<unknown, unknown, number>

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

const fa = _.accessM(({ [envA]: { foo } }: EnvA) => _.pure(foo)); // $ExpectType Effect<EnvA, never, string>
const fb = _.accessM(({ [envB]: { foo } }: EnvB) => _.pure(foo)); // $ExpectType Effect<EnvB, never, string>
const fc = _.accessM(({ [envA]: { foo } }: EnvA) => _.effect.of(foo)); // $ExpectType Effect<EnvA, unknown, string>
const fd = _.accessM(({ [envB]: { foo } }: EnvB) => _.effect.of(foo)); // $ExpectType Effect<EnvB, unknown, string>

const program = _.effect.chain(fa, (_) => fb); // $ExpectType Effect<EnvA & EnvB, never, string>
const program2 = _.effect.chain(fa, (_) => fd); // $ExpectType Effect<EnvA & EnvB, unknown, string>
program2;
const program3 = _.effect.chain(fc, (_) => fb); // $ExpectType Effect<EnvA & EnvB, unknown, string>
program3;

const fae = _.accessM(({ [envA]: { foo } }: EnvA) => _.raiseError(foo));

_.effect.chain(fae, (_) => fb); // $ExpectType Effect<EnvA & EnvB, string, string>

_.provideS<EnvA>({} as EnvA)(program); // $ExpectType Effect<EnvB, never, string>

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

type UString = _.Effect<unknown, unknown, string>;
type Env1String = _.Effect<Env1, unknown, string>;
type Env2String = _.Effect<Env2, unknown, string>;
type NeverString = _.Effect<never, unknown, string>;
export type R1 = EnvOf<{ a: Env1String; b: NeverString }>; // $ExpectType Env1
export type R2 = EnvOf<{ a: Env1String; b: UString }>; // $ExpectType Env1
export type R3 = EnvOf<{ a: NeverString; b: UString }>; // $ExpectType unknown
export type R4 = EnvOf<{ a: Env1String; b: Env2String }>; // $ExpectType Env1 & Env2
export type ATypeOfU = ATypeOf<UString>; // $ExpectType string
export type ATypeOfO = ATypeOf<Env1String>; // $ExpectType string
export type ATypeOfNever = ATypeOf<NeverString>; // $ExpectType string

const M = _.effect;

// $ExpectType Effect<Env2 & Env1, unknown, { x: string; } & { a: never; b: never; }>
export const doAErr = Do(M)
  .bindL("x", () => _.accessM(({}: Env2) => M.of("a")))
  .sequenceS({
    a: _.accessM(({}: Env1) => M.throwError("a")),
    b: M.throwError("b")
  })
  .return((r) => r);

// $ExpectType Effect<Env1 & Env2, string | number, { a: never; c: never; b: never; }>
export const doSequenceSErrorUnion = Do(M)
  .sequenceS({
    a: _.accessM(({}: Env2) => M.throwError("a")),
    c: _.accessM(({}: Env1) => M.throwError(1)),
    b: M.throwError("b")
  })
  .return((r) => r);

// $ExpectType Effect<Env1 & Env2, string | number, { a: never; c: never; b: never; }>
export const doSequenceSLErrorUnion = Do(M)
  .sequenceSL(() => ({
    a: _.accessM(({}: Env2) => M.throwError("a")),
    c: _.accessM(({}: Env1) => M.throwError(1)),
    b: M.throwError("b")
  }))
  .return((r) => r);

// $ExpectType Effect<Env2 & Env1, unknown, { x: string; } & { a: string; b: number; }>
export const doA = Do(M)
  .bindL("x", () => _.accessM(({}: Env2) => M.of("a")))
  .sequenceS({
    a: _.accessM(({}: Env1) => M.of("a")),
    b: M.of(2)
  })
  .return((r) => r);

// $ExpectType Effect<unknown, unknown, { x: string; } & { a: never; b: never; }>
export const doB = Do(M)
  .bindL("x", () => M.of("a"))
  .sequenceS({
    a: M.throwError("a"),
    b: M.throwError("b")
  })
  .return((r) => r);

// $ExpectType Effect<Env2 & Env1 & Env3, unknown, { x: string; } & { a: never; b: never; }>
export const doC = Do(M)
  .bindL("x", () => _.accessM(({}: Env2) => M.of("a")))
  .sequenceS({
    a: _.accessM(({}: Env1) => M.throwError("a")),
    b: _.accessM(({}: Env3) => M.throwError("b"))
  })
  .return((r) => r);

const M2 = _.getValidationM(semigroupString);

// $ExpectType Effect<Env2 & Env1, string, { x: string; } & { a: never; b: never; }>
export const doA2 = Do(M2)
  .bindL("x", () => _.accessM(({}: Env2) => M.of("a")))
  .sequenceS({
    a: _.accessM(({}: Env1) => M.throwError("a")),
    b: M.throwError("b")
  })
  .return((r) => r);

// $ExpectType Effect<unknown, string, { x: string; } & { a: never; b: never; }>
export const doB2 = Do(M2)
  .bindL("x", () => M.of("a"))
  .sequenceS({
    a: M.throwError("a"),
    b: M.throwError("b")
  })
  .return((r) => r);

// $ExpectType Effect<Env2 & Env1 & Env3, string, { x: string; } & { a: never; b: never; }>
export const doC2 = Do(M2)
  .bindL("x", () => _.accessM(({}: Env2) => M.of("a")))
  .sequenceS({
    a: _.accessM(({}: Env1) => M.throwError("a")),
    b: _.accessM(({}: Env3) => M.throwError("b"))
  })
  .return((r) => r);

// $ExpectType Effect<unknown, never, string | number>
_.effect.foldExit(
  _.raiseError(""),
  () => _.pure("1"),
  () => _.pure(1)
);
