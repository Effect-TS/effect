import * as T from "@matechs/effect";
import { CanRemote, serverHelpers } from "../../src";

export interface ModuleA extends CanRemote {
  moduleA: {
    sayHiAndReturn(s: string): T.Effect<T.NoEnv, Error, string>;
  };
}

export const moduleA: ModuleA = {
  moduleA: {
    sayHiAndReturn(s: string): T.Effect<T.NoEnv, Error, string> {
      return T.left(T.error("not implemented"));
    }
  }
};

export const {
  moduleA: { sayHiAndReturn }
} = serverHelpers(moduleA);
