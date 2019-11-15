import * as T from "@matechs/effect";
import { CanRemote, serverHelpers } from "../../src";

export interface ModuleA extends CanRemote {
  moduleA: {
    notFailing(s: string): T.Effect<T.NoEnv, Error, string>;
    failing(s: string): T.Effect<T.NoEnv, Error, string>;
  };
}

export const moduleA: ModuleA = {
  moduleA: {
    failing(s: string): T.Effect<T.NoEnv, Error, string> {
      return T.left(T.error("not implemented"));
    },
    notFailing(s: string): T.Effect<T.NoEnv, Error, string> {
      return T.right(s);
    }
  }
};

export const {
  moduleA: { failing, notFailing }
} = serverHelpers(moduleA);
