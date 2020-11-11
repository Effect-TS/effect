export const InterpreterURI = "InterpreterURI" as const
export type InterpreterURI = typeof InterpreterURI

export interface Interpreter<E, A> {
  // dumb constructor
  build: (a: A) => A
}

declare module "../usage/interpreter-result" {
  interface InterpreterResult<E, A> {
    [InterpreterURI]: Interpreter<E, A>
  }
}
