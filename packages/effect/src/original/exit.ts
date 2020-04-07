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

export interface Done<A> {
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

export interface Raise<E> {
  readonly _tag: "Raise";
  readonly error: E;
}

export function raise<E>(e: E): Raise<E> {
  return {
    _tag: "Raise",
    error: e
  };
}

export interface Abort {
  readonly _tag: "Abort";
  readonly abortedWith: unknown;
}

export function abort(a: unknown): Abort {
  return {
    _tag: "Abort",
    abortedWith: a
  };
}

export interface Interrupt {
  readonly _tag: "Interrupt";
  readonly error?: Error;
  readonly others?: Error[];
}

export const interrupt: Interrupt = {
  _tag: "Interrupt"
};

export const interruptWithError = (err?: Error): Interrupt =>
  err
    ? {
        _tag: "Interrupt",
        error: err
      }
    : {
        _tag: "Interrupt"
      };

export const interruptWithErrorAndOthers = (err: Error, others?: Error[]): Interrupt =>
  others
    ? {
        _tag: "Interrupt",
        error: err,
        others
      }
    : {
        _tag: "Interrupt",
        error: err
      };
