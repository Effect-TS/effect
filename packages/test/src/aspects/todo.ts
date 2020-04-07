import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { getConfigValue, setConfigValue } from "../config";
import { Aspect, patch } from "../def";

export const TodoURI = "@matechs/test/TodoURI";

declare module "../config" {
  interface TestConfig {
    [TodoURI]: boolean;
  }
}

export const getTodo = getConfigValue(TodoURI);
export const setTodo = setConfigValue(TodoURI);

export const withTodo = (todo: boolean): Aspect => (Spec) =>
  pipe(
    Spec,
    patch((_) => pipe(getTodo(_), (t) => pipe(_, setTodo(O.getOrElse(() => todo)(t)))))
  );
