import * as T from "../Effect"

export interface Semaphore {
  /**
   * Acquire a permit, blocking if not all are vailable
   */
  readonly acquire: T.Async<void>
  /**
   * Release a permit
   */
  readonly release: T.Async<void>
  /**
   * Get the number of available permits
   */
  readonly available: T.Async<number>

  /**
   * Acquire multiple permits blocking if not all are available
   * @param n
   */
  acquireN(n: number): T.Async<void>
  /**
   * Release mutliple permits
   * @param n
   */
  releaseN(n: number): T.Async<void>
  /**
   * Bracket the given io with acquireN/releaseN calls
   * @param n
   * @param io
   */
  withPermitsN<S, R, E, A>(n: number, io: T.Effect<S, R, E, A>): T.AsyncRE<R, E, A>
  /**
   * withPermitN(1, _)
   * @param n
   */
  withPermit<S, R, E, A>(n: T.Effect<S, R, E, A>): T.AsyncRE<R, E, A>
}
