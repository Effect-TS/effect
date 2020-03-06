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

import * as assert from "assert";
import { expect } from "chai";
import fc from "fast-check";
import { Do } from "fp-ts-contrib/lib/Do";
import { array } from "fp-ts/lib/Array";
import { FunctionN, identity } from "fp-ts/lib/function";
import { pipe } from "fp-ts/lib/pipeable";
import { effect as T } from "../src";
import * as ex from "../src/original/exit";
import { done } from "../src/original/exit";
import { makeRef } from "../src/ref";
import { makeSemaphore } from "../src/semaphore";

export async function expectExitIn<E, A, B>(
  ioa: T.Effect<T.NoEnv, E, A>,
  f: FunctionN<[ex.Exit<E, A>], B>,
  expected: B
): Promise<void> {
  const result = await T.runToPromiseExit(ioa);
  expect(assert.deepEqual(f(result), expected));
}

export function expectExit<E, A>(
  ioa: T.Effect<T.NoEnv, E, A>,
  expected: ex.Exit<E, A>
): Promise<void> {
  return expectExitIn(ioa, identity, expected);
}

describe("semaphore", () => {
  it("acquire is observable", () => {
    const eff = Do(T.effect)
      .bind("sem", makeSemaphore(4))
      .doL(({ sem }) => T.fork(sem.acquireN(3)))
      .do(T.shifted)
      .bindL("avail", ({ sem }) => sem.available)
      .return(({ avail }) => avail);
    return expectExit(eff, done(1));
  });
  it("release is observable", () => {
    const eff = Do(T.effect)
      .bind("sem", makeSemaphore(4))
      .doL(({ sem }) => T.fork(sem.releaseN(3)))
      .do(T.shifted)
      .bindL("avail", ({ sem }) => sem.available)
      .return(({ avail }) => avail);
    return expectExit(eff, done(7));
  });
  it("should block acquisition", () => {
    const eff = Do(T.effect)
      .bind("gate", makeRef(false))
      .bind("sem", makeSemaphore(0))
      .doL(({ gate, sem }) => T.fork(sem.withPermit(gate.set(true))))
      .bindL("before", ({ gate }) => gate.get)
      .doL(({ sem }) => sem.release)
      .do(T.shifted) // let the forked fiber advance
      .bindL("after", ({ gate, sem }) => T.zip(gate.get, sem.available))
      .return(({ before, after }) => [before, ...after]);
    return expectExit(eff, done([false, true, 1]));
  });
  it("should allow acquire to be interruptible", () => {
    const eff1 = T.effect.chain(makeRef(false), gate =>
      T.effect.chain(makeSemaphore(1), sem =>
        T.effect.chain(
          T.fork(T.applySecond(sem.acquireN(2), gate.set(true))),
          child =>
            T.effect.chain(T.applySecond(child.interrupt, child.wait), _exit =>
              T.zip(sem.available, gate.get)
            )
        )
      )
    );
    return expectExit(eff1, done([1, false] as const));
  });
  it("interrupts should release acquired permits for subsequent acquires to advance", () => {
    const eff = Do(T.effect)
      .bind("turnstyle", makeRef(0))
      .bind("sem", makeSemaphore(2))
      .bindL("child1", ({ sem, turnstyle }) =>
        T.fork(T.applySecond(sem.acquireN(3), turnstyle.set(1)))
      )
      .bindL("child2", ({ sem, turnstyle }) =>
        T.fork(T.applySecond(sem.acquireN(2), turnstyle.set(2)))
      )
      .do(T.shiftedAsync)
      .bindL("moved", ({ turnstyle }) => turnstyle.get)
      .doL(({ child1 }) => child1.interrupt)
      .bindL("c2exit", ({ child2 }) => child2.wait)
      .bindL("after", ({ turnstyle }) => turnstyle.get)
      .return(({ c2exit, moved, after }) => ({
        c2exit: c2exit._tag,
        moved,
        after
      }));
    return expectExit(eff, done({ c2exit: "Done", moved: 0, after: 2 }));
  });
  it("withPermitsN is interruptible", () => {
    const eff = Do(T.effect)
      .bind("sem", makeSemaphore(1))
      .bindL("child", ({ sem }) => T.fork(sem.acquireN(2)))
      .do(T.shifted)
      .bindL("before", ({ sem }) => sem.available)
      .doL(({ child }) => child.interrupt)
      .bindL("after", ({ sem }) => sem.available)
      .return(({ before, after }) => ({ before, after }));
    return expectExit(eff, done({ before: -1, after: 1 }));
  });
  describe("properties", function() {
    jest.setTimeout(20000);
    it("never deadlocks", () =>
      fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(fc.nat(100), fc.nat(10), fc.nat(10), fc.boolean()),
            100
          ),
          acquires => {
            const eff = T.effect.chain(makeSemaphore(100), sem =>
              pipe(
                array.traverse(T.effect)(acquires, ([n, pre, post, int]) =>
                  sem.withPermitsN(
                    n,
                    pipe(
                      int ? T.raiseInterrupt : T.after(post),
                      T.liftDelay(pre),
                      T.fork
                    )
                  )
                ),
                T.chain(fibers =>
                  array.traverse(T.effect)(fibers, f => f.wait)
                ),
                result => T.applySecond(result, sem.available)
              )
            );
            return expectExit(eff, done(100));
          }
        )
      ));
  });
});
