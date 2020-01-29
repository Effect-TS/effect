import * as EFF from "../src/effect";
import { sequenceS, sequenceT } from "fp-ts/lib/Apply";

const seqSeffect = sequenceS(EFF.effect);
const seqTeffect = sequenceT(EFF.effect);

const firstEffect = () => EFF.accessM(({ a }: { a: number }) => EFF.pure(a));
const secondEffect = () => EFF.accessM(({ b }: { b: number }) => EFF.pure(b));
const thirdEffect = () => EFF.raiseError("error");
const fourthEffect = () => EFF.raiseError(1);

seqSeffect({
  first: firstEffect(),
  second: secondEffect(),
  third: thirdEffect(),
  fourth: fourthEffect()
}); // $ExpectType Effect<{ a: number; } & { b: number; }, string | number, { first: number; second: number; third: never; fourth: never; }>

seqTeffect(firstEffect(), secondEffect(), thirdEffect(), fourthEffect()); // $ExpectType Effect<{ a: number; } & { b: number; }, string | number, [number, number, never, never]>
