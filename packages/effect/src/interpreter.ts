import { Effect, accessM, provideR } from "./effect";

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

export function cn<T>(): T {
  return {} as T;
}

export function fn<T>(): T {
  // tslint:disable-next-line: no-empty
  return (() => {}) as any;
}
