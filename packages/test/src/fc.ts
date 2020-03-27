import { effect as T, stream as S, managed as M } from "@matechs/effect";
import fc, { Arbitrary } from "fast-check";
import prand from "pure-rand";
import { some } from "fp-ts/lib/Option";
import { sequenceS, EnforceNonEmptyRecord } from "fp-ts/lib/Apply";
import { pipe } from "fp-ts/lib/pipeable";

export const RandomGenURI = "@matechs/test/RandomGenURI";

export interface RandomGen {
  [RandomGenURI]: {
    randomGenerator: fc.Random;
  };
}

export const provideGenerator = T.provideSW<RandomGen>()(
  T.sync(() => {
    const mersenne = prand.mersenne(Math.random());

    return new fc.Random(mersenne);
  })
)((rnd) => ({
  [RandomGenURI]: {
    randomGenerator: rnd
  }
}));

export const arb = <T0>(a: Arbitrary<T0>) =>
  S.fromSource(
    M.encaseEffect(T.access((_: RandomGen) => T.sync(() => some(a.generate(_[RandomGenURI].randomGenerator).value))))
  );

export const propertyM = (iterations: number) => <NER extends Record<string, S.Stream<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, S.Stream<any, any, any>>
) => <R>(
  f: (_: { [K in keyof NER]: [NER[K]] extends [S.Stream<any, any, infer A>] ? A : never }) => T.Effect<R, any, void>
) =>
  pipe(
    sequenceS(S.stream)<NER>(r),
    S.chain((x) => S.encaseEffect(f(x))),
    S.take(iterations),
    S.drain
  );

export const property = (iterations: number) => <NER extends Record<string, S.Stream<any, any, any>>>(
  r: EnforceNonEmptyRecord<NER> & Record<string, S.Stream<any, any, any>>
) => (f: (_: { [K in keyof NER]: [NER[K]] extends [S.Stream<any, any, infer A>] ? A : never }) => void) =>
  pipe(
    sequenceS(S.stream)<NER>(r),
    S.chain((x) => S.encaseEffect(T.sync(() => f(x)))),
    S.take(iterations),
    S.drain
  );
