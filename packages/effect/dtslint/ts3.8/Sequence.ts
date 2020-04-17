import * as T from "../../src/effect";
import { sequenceS, sequenceT } from "fp-ts/lib/Apply";

const seqS = sequenceS(T.effect);
const seqT = sequenceT(T.effect);

const firstEffect = () => T.accessM(({ a }: { a: number }) => T.pure(a));
const secondEffect = () => T.accessM(({ b }: { b: number }) => T.pure(b));
const thirdEffect = () => T.raiseError("error");
const fourthEffect = () => T.raiseError(1);

// $ExpectType Effect<never, { a: number; } & { b: number; }, string | number, { first: number; second: number; third: never; fourth: never; }>
seqS({
  first: firstEffect(),
  second: secondEffect(),
  third: thirdEffect(),
  fourth: fourthEffect()
});

// $ExpectType Effect<never, { a: number; } & { b: number; }, string | number, [number, number, never, never]>
seqT(firstEffect(), secondEffect(), thirdEffect(), fourthEffect());
