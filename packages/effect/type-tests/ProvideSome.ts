import * as EFF from "../src/effect";
import { Env } from "../src/utils/types";

const needAB = EFF.access((env: { a: number } & { b: number }) => env.a);
const needAB2 = EFF.access((env: { a: number; b: number }) => env.a);

const provideB = EFF.provideStructSomeM(EFF.pure({ b: 10 }));
const provideB2 = EFF.provideStructSM(EFF.pure({ b: 10 }));

const needOnlyA = provideB(needAB);
const needOnlyA_ = provideB2(needAB);
const needOnlyA2 = provideB(needAB2);
const needOnlyA2_ = provideB2(needAB2);

type EnvForNeedOnlyA = Env<typeof needOnlyA>;
type EnvForNeedOnlyA_ = Env<typeof needOnlyA_>;
type EnvForNeedOnlyA2 = Env<typeof needOnlyA2>;
type EnvForNeedOnlyA2_ = Env<typeof needOnlyA2_>;

declare const _a: EnvForNeedOnlyA;
declare const _a_: EnvForNeedOnlyA_;
declare const _b: EnvForNeedOnlyA2;
declare const _b_: EnvForNeedOnlyA2_;

export { _a, _b, _a_, _b_ };
