import { getConfigValue, setConfigValue } from "../../Config"
import { Aspect, patch } from "../../Def"

import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"

export const TodoURI = "@matechs/test/TodoURI"

declare module "../../Config" {
  interface TestConfig {
    [TodoURI]: boolean
  }
}

export const getTodo = getConfigValue(TodoURI)
export const setTodo = setConfigValue(TodoURI)

export const withTodo = (todo: boolean): Aspect => (Spec) =>
  pipe(
    Spec,
    patch((_) => pipe(getTodo(_), (t) => pipe(_, setTodo(O.getOrElse(() => todo)(t)))))
  )
