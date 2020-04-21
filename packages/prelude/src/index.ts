import {
  effect as T,
  freeEnv as Service,
  managed as M,
  stream as S,
  streameither as SE,
  concurrentRef as CRef,
  queue as Q,
  rec as Rec,
  retry as RT,
  ref as Ref,
  semaphore as Sem,
  utils as U
} from "@matechs/effect";
import * as F from "fp-ts/lib/function";
import * as eq from "fp-ts/lib/Eq";
import * as show from "fp-ts/lib/Show";
import * as semigroup from "fp-ts/lib/Semigroup";
import * as monoid from "fp-ts/lib/Monoid";
import * as map from "fp-ts/lib/Map";
import * as set from "fp-ts/lib/Set";
import * as tree from "fp-ts/lib/Tree";
import * as record from "fp-ts/lib/Record";
import * as magma from "fp-ts/lib/Magma";
import * as E from "./either";
import * as A from "fp-ts/lib/Array";
import * as NEA from "fp-ts/lib/NonEmptyArray";
import * as O from "./option";
import * as Ex from "./exit";
import { Pipe, Flow, FlowP } from "./internals";

export { flow } from "fp-ts/lib/function"
export { pipe } from "fp-ts/lib/pipeable";

export { T, S, SE, M, O, CRef, Q, Rec, RT, Ref, Sem, U };
export { Ex };
export { E };
export { Service };
export { F };
export { A, NEA };
export { eq, show, semigroup, monoid, tree, map, set, magma, record };

export const pipeF = <A>(_: A) => new Pipe(_);
export const flowF = <A extends ReadonlyArray<unknown>, B>(f: (...a: A) => B) => new Flow(f);

export function combineProviders() {
  return new FlowP<unknown, unknown, never, never>((x: any) => x);
}
