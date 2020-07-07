import { Exit } from "./exit"

/**
 * Flat maps over the value type.
 */
export const chain_ = <E, A, A1, E1>(
  exit: Exit<E, A>,
  f: (a: A) => Exit<E1, A1>
): Exit<E | E1, A1> => {
  switch (exit._tag) {
    case "Failure": {
      return exit
    }
    case "Success": {
      return f(exit.value)
    }
  }
}
