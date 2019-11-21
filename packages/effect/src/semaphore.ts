/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/semaphore.ts
  credits to original author
  small adaptations to extend Monad3E and support contravariance on R
 */

import * as T from "./";
import * as S from "waveguide/lib/semaphore";
import { flow } from "fp-ts/lib/function";
import * as waver from "waveguide/lib/waver";
import * as wave from "waveguide/lib/wave";

export interface Semaphore {
  acquireN(n: number): T.Effect<{}, never, void>;
  readonly acquire: T.Effect<{}, never, void>;
  releaseN(n: number): T.Effect<{}, never, void>;
  readonly release: T.Effect<{}, never, void>;
  withPermitsN<R, E, A>(n: number, wave: T.Effect<R, E, A>): T.Effect<R, E, A>;
  withPermit<R, E, A>(wave: T.Effect<R, E, A>): T.Effect<R, E, A>;
  readonly available: T.Effect<{}, never, number>;
}

export function liftSemaphore(sem: S.Semaphore): Semaphore {
  const acquireN = flow(sem.acquireN, waver.encaseWave);
  const acquire = waver.encaseWave(sem.acquire);
  const releaseN = flow(sem.releaseN, waver.encaseWave);
  const release = waver.encaseWave(sem.release);
  function withPermitsN<R, E, A>(
    n: number,
    wave: T.Effect<R, E, A>
  ): T.Effect<R, E, A> {
    return r => sem.withPermitsN(n, wave(r));
  }
  function withPermit<R, E, A>(wave: T.Effect<R, E, A>): T.Effect<R, E, A> {
    return r => sem.withPermit(wave(r));
  }
  const available = waver.encaseWave(sem.available);
  return {
    acquireN,
    acquire,
    releaseN,
    release,
    withPermitsN,
    withPermit,
    available
  };
}

export function makeSemaphore(n: number): T.Effect<{}, never, Semaphore> {
  return waver.encaseWave(wave.map(S.makeSemaphore(n), liftSemaphore));
}
