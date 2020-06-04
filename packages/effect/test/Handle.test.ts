import { effect as T, exit as Ex } from "../src"
import { pipe } from "../src/Function"

export interface InputError {
  _tag: "InputError"
  message: string
}

export interface HttpError {
  _tag: "HttpError"
  message: string
}

export const InputError = (message: string): InputError => ({
  _tag: "InputError",
  message
})

export const HttpError = (message: string): HttpError => ({
  _tag: "HttpError",
  message
})

const program = (n: number) =>
  pipe(
    T.condWith(n < 0)(T.raiseError(InputError("n < 0")))(
      n > 100 ? T.pure(1) : T.raiseError(HttpError("n > 0"))
    ),
    T.handle("_tag", "InputError", ({ message }) => T.raiseError(`handled: ${message}`))
  )

describe("Handle", () => {
  it("should succeed", () => {
    expect(T.runSync(program(200))).toStrictEqual(Ex.done(1))
  })
  it("should handle", () => {
    expect(T.runSync(program(-1))).toStrictEqual(Ex.raise("handled: n < 0"))
  })
  it("should not handle", () => {
    expect(T.runSync(program(1))).toStrictEqual(Ex.raise(HttpError("n > 0")))
  })
})
