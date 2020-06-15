import { Exit, Success } from "./exit"

/**
 * Returns if an exit is succeeded
 */
export const succeeded = <E, A>(exit: Exit<E, A>): exit is Success<A> => {
  switch (exit._tag) {
    case "Failure": {
      return false
    }
    case "Success": {
      return true
    }
  }
}
