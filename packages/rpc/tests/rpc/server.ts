import * as T from "@matechs/effect";
import { serverHelpers } from "../../src";

import { Tracer, withChildSpan } from "@matechs/tracing";
import { ModuleA, Printer } from "./interface";

export function print(s: string) {
  return T.accessM(({ printer }: Printer) => printer.print(s));
}

export const moduleA: ModuleA = {
  moduleA: {
    failing(s: string): T.Effect<T.NoEnv, Error, string> {
      return T.left(T.error("not implemented"));
    },
    notFailing(
      s: string
    ): T.Effect<Printer & Tracer, Error, string> {
      return withChildSpan("child")(
        T.effectMonad.chain(print(s), _ => T.right(s))
      );
    }
  }
};

export const {
  moduleA: { failing, notFailing }
} = serverHelpers(moduleA);
