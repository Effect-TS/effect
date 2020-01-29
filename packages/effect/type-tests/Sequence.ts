import * as EFF from "../src/effect";
import { sequenceS } from "fp-ts/lib/Apply";

const seqSeffect = sequenceS(EFF.effect);

const firstEffect = () => EFF.accessM(({ a }: { a: number }) => EFF.pure(a));
const secondEffect = () => EFF.accessM(({ b }: { b: number }) => EFF.pure(b));
const thirdEffect = () => EFF.raiseError("error");
const foorthEffect = () => EFF.raiseError(1);

seqSeffect({
  first: firstEffect(),
  second: secondEffect(),
  third: thirdEffect(),
  fourth: foorthEffect()
}); // $ExpectType Effect<{ a: number; } & { b: number; }, string | number, { first: number; second: number; third: never; fourth: never; }>
