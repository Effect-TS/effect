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

import * as L from "../list";
import { AsyncCancelContFn } from "../effect";

/**
 * An interface for the IO system runtime.
 *
 * Allows dispatching arbitrary blocks of code immediately or after some delay
 */
export interface Runtime {
  /**
   * Dispatch a thunk immediately.
   *
   * The default runtime trampolines this dispatch to for stack safety.
   * @param thunk the action to execute
   */
  dispatch<A>(thunk: (a: A) => void, a: A): void;

  /**
   * Dispatch a thunk after some amount of time has elapsed.
   *
   * Returns an actions that may be used to cancel execution.
   * The default runtime delegates to setTimeout.
   * @param thunk the action to execute
   * @param ms delay in milliseconds
   */
  dispatchLater<A>(thunk: (a: A) => void, a: A, ms: number): AsyncCancelContFn;
}

class RuntimeImpl implements Runtime {
  running = false;

  array = L.empty<[(a: any) => void, any]>();

  isRunning = (): boolean => this.running;

  run(): void {
    this.running = true;
    let next = L.popUnsafe(this.array);

    while (next) {
      next[0](next[1]);
      next = L.popUnsafe(this.array);
    }
    this.running = false;
  }

  dispatch<A>(thunk: (a: A) => void, a: A): void {
    L.push(this.array, [thunk, a]);

    if (!this.running) {
      this.run();
    }
  }

  dispatchLater<A>(thunk: (a: A) => void, a: A, ms: number): AsyncCancelContFn {
    const handle = setTimeout(() => this.dispatch(thunk, a), ms);
    return cb => {
      clearTimeout(handle);
      cb();
    };
  }
}

export const defaultRuntime: Runtime = new RuntimeImpl();
