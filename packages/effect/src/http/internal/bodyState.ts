import type * as Arr from "../../Array.ts"
import * as Channel from "../../Channel.ts"
import * as Effect from "../../Effect.ts"
import type * as Pull from "../../Pull.ts"
import * as Stream from "../../Stream.ts"

/**
 * The "consumed" flag and buffered-read cache of one server request. Each
 * request implementation allocates one and passes it to its `modify` copies.
 *
 * @internal
 */
export class BodyState {
  readonly _tag = "BodyState"
  readonly bodyUsed: (() => boolean) | undefined
  readonly responded: (() => boolean) | undefined
  // How the body was first read, or `undefined` while it is unread.
  read: "buffered" | "stream" | undefined = undefined
  reads: Map<string, Effect.Effect<any, any, any>> | undefined = undefined
  constructor(bodyUsed: (() => boolean) | undefined, responded: (() => boolean) | undefined) {
    this.bodyUsed = bodyUsed
    this.responded = responded
  }
}

/**
 * The defect raised when a consumed body is read. A distinct class lets
 * wrappers that pass the body through a Web stream recognise it again.
 *
 * @internal
 */
export class BodyConsumedError extends Error {}

const alreadyRead =
  "The request body was already read, for example by middleware that buffered it, and cannot be read again"

const claim = (state: BodyState, kind: "buffered" | "stream"): BodyConsumedError | undefined => {
  if (state.read === "buffered") return new BodyConsumedError(alreadyRead)
  if (state.read === "stream") {
    return new BodyConsumedError(
      "The request body stream was already consumed and cannot be run a second time, so a retried or redirected upload cannot replay it"
    )
  }
  if (state.responded?.() === true) {
    return new BodyConsumedError(
      "The request body was read after the response finished. It can be read only while the request is in flight"
    )
  }
  // A Web body read outside Effect counts as consumed.
  if (state.bodyUsed?.() === true) return new BodyConsumedError(alreadyRead)
  state.read = kind
  return undefined
}

/**
 * @internal
 */
export const guardStream = <A, E, R>(state: BodyState, stream: Stream.Stream<A, E, R>): Stream.Stream<A, E, R> =>
  Stream.fromChannel(Channel.fromTransform((_, scope) =>
    Effect.sync(() => {
      let pull: Pull.Pull<Arr.NonEmptyReadonlyArray<A>, E, void, R> | undefined
      return Effect.suspend(() => {
        if (pull !== undefined) return pull
        const consumed = claim(state, "stream")
        if (consumed !== undefined) return Effect.die(consumed)
        // Open upstream only now, so opening this stream does not claim or read the body.
        return Effect.flatMap(Channel.toPullScoped(stream.channel, scope), (upstream) => {
          pull = upstream
          return upstream
        })
      })
    })
  ))

/**
 * @internal
 */
export const guardRead = <A, E, R>(
  state: BodyState,
  key: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => {
  const cached = state.reads?.get(key)
  if (cached !== undefined) return cached
  const read = Effect.runSync(Effect.cached(Effect.suspend(() => {
    const consumed = claim(state, "buffered")
    return consumed === undefined ? effect : Effect.die(consumed)
  })))
  ;(state.reads ??= new Map()).set(key, read)
  return read
}
