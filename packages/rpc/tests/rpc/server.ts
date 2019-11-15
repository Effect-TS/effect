import * as T from "@matechs/effect";
import { CanRemote, serverHelpers } from "../../src";

import { console } from "fp-ts";
import {
  ChildContext,
  Tracer,
  withChildSpan
} from "@matechs/tracing/lib";

export interface Printer {
  printer: {
    print(s: string): T.Effect<T.NoEnv, T.NoErr, void>;
  };
}

export const printer: Printer = {
  printer: {
    print(s) {
      return T.liftIO(console.log(s));
    }
  }
};

export function print(s: string) {
  return T.accessM(({ printer }: Printer) => printer.print(s));
}

export interface ModuleA extends CanRemote {
  moduleA: {
    notFailing(
      s: string
    ): T.Effect<Printer & ChildContext & Tracer, Error, string>;
    failing(s: string): T.Effect<T.NoEnv, Error, string>;
  };
}

export const moduleA: ModuleA = {
  moduleA: {
    failing(s: string): T.Effect<T.NoEnv, Error, string> {
      return T.left(T.error("not implemented"));
    },
    notFailing(
      s: string
    ): T.Effect<Printer & ChildContext & Tracer, Error, string> {
      return withChildSpan("child")(
        T.effectMonad.chain(print(s), _ => T.right(s))
      );
    }
  }
};

export const {
  moduleA: { failing, notFailing }
} = serverHelpers(moduleA);
