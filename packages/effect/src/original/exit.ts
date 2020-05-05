// Copyright 2019 Ryan Zeigler
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* istanbul ignore file */

export type Exit<E, A> = Done<A> | Cause<E>;
export type ExitTag = Exit<unknown, unknown>["_tag"];

export interface HasErrors {
  readonly errors?: Array<Error>;
}

export interface Done<A> extends HasErrors {
  readonly _tag: "Done";
  readonly value: A;
}

export function done<A>(v: A): Done<A> {
  return {
    _tag: "Done",
    value: v
  };
}

export type Cause<E> = Raise<E> | Abort | Interrupt;

export interface Raise<E> extends HasErrors {
  readonly _tag: "Raise";
  readonly error: E;
}

export function raise<E>(e: E): Raise<E> {
  return {
    _tag: "Raise",
    error: e
  };
}

export interface Abort extends HasErrors {
  readonly _tag: "Abort";
  readonly abortedWith: unknown;
}

export function abort(a: unknown): Abort {
  return {
    _tag: "Abort",
    abortedWith: a
  };
}

export interface Interrupt extends HasErrors {
  readonly _tag: "Interrupt";
}

export const interrupt: Interrupt = {
  _tag: "Interrupt"
};

export function withErrors(errors?: Array<Error>): <E>(_: Cause<E>) => Cause<E>;
export function withErrors(errors?: Array<Error>): <E, A>(_: Exit<E, A>) => Exit<E, A>;
export function withErrors(errors?: Array<Error>) {
  return (e: any) => {
    const merged = e.errors ? [...e.errors, ...(errors ? errors : [])] : errors;
    return merged && merged.length > 0
      ? {
          ...e,
          errors: merged
        }
      : e;
  };
}
