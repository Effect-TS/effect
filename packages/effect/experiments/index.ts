import * as T from "../src";
import { FunctionN } from "fp-ts/lib/function";

export type Sem<A> = {};

export type InterpretR<A> = A extends Sem<infer X>
  ? T.Effect<T.NoEnv, never, X>
  : never;

export type InterpretF<A> = A extends FunctionN<infer X, infer Y>
  ? FunctionN<X, InterpretR<Y>>
  : never;

export type Interpretation<A> = { [k in keyof A]: InterpretF<A[k]> };

export function interpret<R, M>(
  f: (r: Interpretation<R>) => Interpretation<M>
): T.Effect<Interpretation<R>, never, Interpretation<M>> {
  return T.accessM((r: Interpretation<R>) => T.sync(() => f(r)));
}
