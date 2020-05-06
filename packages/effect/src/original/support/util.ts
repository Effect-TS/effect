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

// Some utilities
export function tuple2<A, B>(a: A, b: B): readonly [A, B] {
  return [a, b] as const
}

export function fst<A>(a: A): A {
  // eslint-disable-line no-unused-vars
  return a
}

export function snd<A, B>(_: A, b: B): B {
  return b
}
