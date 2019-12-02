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

import { Predicate } from "fp-ts/lib/function";
import { none, Option, option, some } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import * as l from "./list";
import { cons, List, nil } from "./list";

export interface Dequeue<A> {
  take(): Option<readonly [A, Dequeue<A>]>;
  offer(a: A): Dequeue<A>;
  pull(): Option<readonly [A, Dequeue<A>]>;
  push(a: A): Dequeue<A>;
  filter(f: Predicate<A>): Dequeue<A>;
  find(p: Predicate<A>): Option<A>;
  size(): number;
  isEmpty(): boolean;
}

export function from<A>(front: List<A>, back: List<A>): Dequeue<A> {
  function take(): Option<readonly [A, Dequeue<A>]> {
    return l.cata(
      front,
      (h, t) => some([h, from(t, back)] as const),
      () =>
        pipe(
          back,
          l.reverse,
          l.catac(
            (h, t) => some([h, from(t, nil)] as const),
            () => none
          )
        )
    );
  }

  function offer(a: A): Dequeue<A> {
    return from(front, cons(a, back));
  }

  function pull(): Option<readonly [A, Dequeue<A>]> {
    return l.cata(
      back,
      (h, t) => some([h, from(front, t)] as const),
      () =>
        pipe(
          front,
          l.reverse,
          l.catac(
            (h, t) => some([h, from(nil, t)] as const),
            () => none
          )
        )
    );
  }

  function push(a: A): Dequeue<A> {
    return from(cons(a, front), back);
  }

  function filter(p: Predicate<A>): Dequeue<A> {
    return from(l.filter(front, p), l.filter(back, p));
  }

  function size(): number {
    return l.size(front) + l.size(back);
  }

  function isEmpty(): boolean {
    return l.isEmpty(front) && l.isEmpty(back);
  }

  function find(p: Predicate<A>): Option<A> {
    return option.alt(l.find(front, p), () => l.find(back, p));
  }

  return {
    offer,
    take,
    pull,
    push,
    filter,
    find,
    size,
    isEmpty
  };
}

export function empty<A>(): Dequeue<A> {
  return from(nil, nil);
}

export function of<A>(a: A): Dequeue<A> {
  return from(l.of(a), nil);
}
