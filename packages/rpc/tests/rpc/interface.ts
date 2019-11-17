import * as T from "@matechs/effect";
import { ChildContext, Tracer } from "@matechs/tracing/lib";

export const printerDef = {
  printer: {
    print: {} as (s: string) => T.Effect<T.NoEnv, T.NoErr, void>
  }
};

export type Printer = typeof printerDef;

// prettier-ignore
export const moduleADef = {
  moduleA: {
    notFailing: {} as (s: string) => T.Effect<Printer & ChildContext & Tracer, Error, string>,
    failing: {} as (s: string) => T.Effect<T.NoEnv, Error, string>
  }
};

export type ModuleA = typeof moduleADef;
