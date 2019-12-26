import { Effect, accessM, provideR } from "./effect";
import { FunctionN } from "fp-ts/lib/function";

/* istanbul ignore file */

// experimental

export type Interpreter<Module, Environment> = <R, E, A>(
  e: Effect<Module & R, E, A>
) => Effect<Environment & R, E, A>;

export function interpreter<Environment, Module>(
  f: (e: Environment) => Module
): Interpreter<Module, Environment> {
  return <R, E, A>(eff: Effect<Module & R, E, A>) =>
    accessM((e: Environment) =>
      provideR((r: Environment & R) => ({ ...r, ...f(e) }))(eff)
    );
}

export function cn<T extends Effect<any, any, any>>(): T {
  return {} as T;
}

export function fn<T extends FunctionN<any[], Effect<any, any, any>>>(): T {
  // tslint:disable-next-line: no-empty
  return (() => {}) as any;
}
