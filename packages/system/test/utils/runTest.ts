import * as Cause from "../../src/Cause"
import * as T from "../../src/Effect"
import { pipe } from "../../src/Function"

export async function runTest<E, A>(test: T.Effect<unknown, E, A>) {
  const exit = await pipe(test, T.runPromiseExit)

  if (exit._tag === "Success") {
    return Promise.resolve(exit.value)
  } else {
    const failure = Cause.failureOption(exit.cause)

    if (failure._tag === "Some") {
      return Promise.reject(failure.value)
    }

    const defect = Cause.dieOption(exit.cause)

    if (defect._tag === "Some") {
      return Promise.reject(defect.value)
    }

    return Promise.reject(new Error(Cause.pretty(exit.cause)))
  }
}
