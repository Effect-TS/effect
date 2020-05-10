import { TaskEither } from "fp-ts/lib/TaskEither"

import { AsyncE } from "../Support/Common/effect"

import { async } from "./async"

export function encaseTaskEither<E, A>(taskEither: TaskEither<E, A>): AsyncE<E, A> {
  return async<E, A>((callback) => {
    taskEither().then(callback)
    /* istanbul ignore next */
    return (cb) => {
      cb()
    }
  })
}
