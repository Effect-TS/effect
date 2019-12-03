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

export class CompletableImpl<A> implements Completable<A> {
  completed: Option<A>;
  listeners: FunctionN<[A], void>[];
  constructor() {
    this.completed = none;
    this.listeners = [];
  }

  set(a: A): void {
    this.completed = some(a);
    this.listeners.forEach(f => f(a));
  }

  value(): Option<A> {
    return this.completed;
  }
  isComplete(): boolean {
    return o.isSome(this.completed);
  }
  complete(a: A): void {
    if (o.isSome(this.completed)) {
      throw new Error("Die: Completable is already completed");
    }
    this.set(a);
  }
  tryComplete(a: A): boolean {
    if (o.isSome(this.completed)) {
      return false;
    }
    this.set(a);
    return true;
  }
  listen(f: FunctionN<[A], void>): Lazy<void> {
    if (o.isSome(this.completed)) {
      f(this.completed.value);
    }
    this.listeners.push(f);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== f);
    };
  }
}
