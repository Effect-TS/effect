import { effect as T, stream as S, managed as M } from "@matechs/effect";
import fc, { Arbitrary } from "fast-check";
import prand from "pure-rand";
import { some } from "fp-ts/lib/Option";

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
