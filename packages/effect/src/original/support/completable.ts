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

import { FunctionN, Lazy } from "fp-ts/lib/function";
import { none, Option, some } from "fp-ts/lib/Option";
import * as o from "fp-ts/lib/Option";

export interface Completable<A> {
  value(): Option<A>;
  isComplete(): boolean;
  complete(a: A): void;
  tryComplete(a: A): boolean;
  listen(f: FunctionN<[A], void>): Lazy<void>;
}

export function completable<A>(): Completable<A> {
  let completed: Option<A> = none;
  let listeners: FunctionN<[A], void>[] = [];
  const set = (a: A): void => {
    completed = some(a);
    listeners.forEach(f => f(a));
  };
  const value = (): Option<A> => completed;
  const isComplete = (): boolean => o.isSome(completed);
  const complete = (a: A): void => {
    if (o.isSome(completed)) {
      throw new Error("Die: Completable is already completed");
    }
    set(a);
  };
  const tryComplete = (a: A): boolean => {
    if (o.isSome(completed)) {
      return false;
    }
    set(a);
    return true;
  };
  const listen = (f: FunctionN<[A], void>): Lazy<void> => {
    if (o.isSome(completed)) {
      f(completed.value);
    }
    listeners.push(f);
    return () => {
      listeners = listeners.filter(cb => cb !== f);
    };
  };
  return {
    value,
    isComplete,
    complete,
    tryComplete,
    listen
  };
}
