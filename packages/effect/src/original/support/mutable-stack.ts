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

export interface MutableStack<A> {
  push(a: A): void;
  pop(): A | undefined;
  peek(): A | undefined;
  isEmpty(): boolean;
  size(): number;
}

export function mutableStack<A>(): MutableStack<A> {
  const array: A[] = [];
  function push(a: A): void {
    array.push(a);
  }
  function pop(): A | undefined {
    return array.pop();
  }
  function peek(): A | undefined {
    return array.length > 0 ? array[array.length - 1] : undefined;
  }
  function isEmpty(): boolean {
    return array.length === 0;
  }
  function size(): number {
    return array.length;
  }
  return {
    push,
    pop,
    peek,
    isEmpty,
    size
  };
}
