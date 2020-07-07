import { Exit } from "./exit"

/**
 * Flat maps over the value type.
 */
export const chain = <A, A1, E1>(f: (a: A) => Exit<E1, A1>) => <E>(
  exit: Exit<E, A>
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
