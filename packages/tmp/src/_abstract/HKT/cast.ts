import { identity } from "@effect-ts/system/Function"

import type { HKTFull } from "./hkt"
import type { KindFull } from "./kind"
import type { URIS } from "./registry"

export function castErr<T>(): {
  <F extends URIS>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, T, Out>
  <F>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, T, Out>
}
export function castErr() {
  return () => identity as any
}

export function castEnv<T>(): {
  <F extends URIS>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, T, Err, Out>
  <F>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, T, Err, Out>
}
export function castEnv() {
  return () => identity as any
}

export function castSt<T>(): {
  <F extends URIS>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, T, Env, Err, Out>
  <F>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, T, Env, Err, Out>
}
export function castSt() {
  return () => identity as any
}

export function castIn<T>(): {
  <F extends URIS>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, T, St, Env, Err, Out>
  <F>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, T, St, Env, Err, Out>
}
export function castIn() {
  return () => identity as any
}

export function castX<T>(): {
  <F extends URIS>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, T, In, St, Env, Err, Out>
  <F>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, T, In, St, Env, Err, Out>
}
export function castX() {
  return () => identity as any
}

export function castSO<T>(): {
  <F extends URIS>(_?: F): <
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, T, X, In, St, Env, Err, Out>
  <F>(_?: F): <
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, T, X, In, St, Env, Err, Out>
}
export function castSO() {
  return () => identity as any
}

export function castSI<T>(): {
  <F extends URIS>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, T, SO, X, In, St, Env, Err, Out>
  <F>(_?: F): <
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, T, SO, X, In, St, Env, Err, Out>
}
export function castSI() {
  return () => identity as any
}

export function castS<T>(): {
  <F extends URIS>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, T, Env, Err, Out>
  <F>(_?: F): <
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, T, Env, Err, Out>
}
export function castS() {
  return () => identity as any
}

export function castK<T extends string>(): {
  <F extends URIS>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => KindFull<F, TL0, TL1, TL2, TL3, K, T, SI, SO, X, In, St, Env, Err, Out>
  <F>(_?: F): <
    K,
    TL0,
    TL1,
    TL2,
    TL3,
    NK extends string,
    SI,
    SO,
    X,
    In,
    St,
    Env,
    Err,
    Out
  >(
    self: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, Out>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, K, T, SI, SO, X, In, St, Env, Err, Out>
}
export function castK() {
  return () => identity as any
}
