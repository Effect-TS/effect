import { effect as T, exit as Ex } from "../../src";
import { pipe } from "fp-ts/lib/pipeable";

export interface InputError {
  _tag: "InputError";
  message: string;
}

export interface HttpError {
  _tag: "HttpError";
  message: string;
}

export const InputError = (message: string): InputError => ({
  _tag: "InputError",
  message
});

export const HttpError = (message: string): HttpError => ({
  _tag: "HttpError",
  message
});

export class NewError extends Error {
  public _tag = "NewError" as const;
  constructor(message: string) {
    super(message);
    this.name = this._tag;
  }
}

// $ExpectType (n: number) => Effect<never, unknown, HttpError | NewError, number>
export const program = (n: number) =>
  pipe(
    T.condWith(n < 0)(T.raiseError(InputError("n < 0")))(
      n > 100 ? T.pure(1) : T.raiseError(HttpError("n > 0"))
    ),
    T.handle("_tag", "InputError", ({ message }) =>
      T.raiseError(new NewError(`handled: ${message}`))
    )
  );

// $ExpectType Effect<never, unknown, HttpError, number>
export const program2 = pipe(
  program(1),
  T.handle("_tag", "NewError", () => T.pure(2))
);
