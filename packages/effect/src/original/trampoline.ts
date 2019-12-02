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

import { Lazy } from "fp-ts/lib/function";
import { MutableQueue, mutableQueue } from "./support/mutable-queue";

/**
 * A trampolined execution environment.
 *
 * In order to drive rendezvouz between multiple running fibers it is important to be able to commence running a fiber
 * without growing the stack.
 * Otherwise, arbitrary numbers of constructs like deferred will cause unbounded stack growth.
 */
export interface Trampoline {
  /**
   * Is the trampoline currently running
   */
  isRunning(): boolean;
  /**
   * Dispatch a thunk against this trampoline.
   *
   * If the trampoline is not currently active this immediately begins executing the thunk.
   * If the trampoline is currently active then the thunk will be appended to a queue
   * @param thunk
   */
  dispatch(thunk: Lazy<void>): void;
}

/**
 * Create a new Trampoline
 */
export function makeTrampoline(): Trampoline {
  let running = false;
  const queue: MutableQueue<Lazy<void>> = mutableQueue();

  const isRunning = (): boolean => running;

  const run = (): void => {
    running = true;
    let next = queue.dequeue();
    while (next) {
      next();
      next = queue.dequeue();
    }
    running = false;
  };

  const dispatch = (thunk: Lazy<void>): void => {
    queue.enqueue(thunk);
    if (!running) {
      run();
    }
  };
  return {
    isRunning,
    dispatch
  };
}
