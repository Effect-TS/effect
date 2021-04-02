// tracing: off

import * as E from "../../Either"
import * as M from "../../Managed"
import * as O from "../../Option"
import * as Channel from "../Channel"

/**
 * Core datatype of the conduit package. This type represents a general
 * component which can consume a stream of input values `I`, produce a stream
 * of output values `O`, perform actions, and produce a final result `R`.
 * The type synonyms provided here are simply wrappers around this type.
 */
export interface Pipeline<R, E, I, O, A>
  extends Channel.Channel<R, E, I, I, O, void, A> {}

/**
 * Ensure that the inner sink consumes no more than the given number of
 * values.
 */
export function isolate<A>(n: number): Pipeline<unknown, never, A, A, void> {
  if (n <= 0) {
    return Channel.unit
  }
  return Channel.needInput(
    (i: A) => Channel.haveOutput(() => isolate<A>(n - 1), i),
    () => Channel.unit
  )
}

/**
 * Run a pipeline until processing completes.
 */
export function run<R, E, A>(self: Pipeline<R, E, unknown, void, A>) {
  return Channel.runChannel(Channel.injectLeftovers(self))
}

type FuseGo<R, E, I, C, A, O> = E.Either<
  {
    rp: (i: O) => Channel.Channel<R, E, O, O, C, void, A>
    rc: (u: void) => Channel.Channel<R, E, O, O, C, void, A>
    left: Pipeline<R, E, I, O, void>
  },
  { left: Pipeline<R, E, I, O, void>; right: Pipeline<R, E, O, C, A> }
>

function fuseGo<R, E, I, C, A, O>(
  input: FuseGo<R, E, I, C, A, O>
): Pipeline<R, E, I, C, A> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (input._tag) {
      case "Left": {
        const rp = input.left.rp
        const rc = input.left.rc
        const left = input.left.left
        Channel.concrete(left)
        switch (left._typeId) {
          case Channel.DoneTypeId: {
            input = E.right({
              left: new Channel.Done(left.result),
              right: rc(left.result)
            })
            break
          }
          case Channel.ChannelMTypeId: {
            return new Channel.ChannelM(
              M.map_(left.nextChannel, (p) => fuseGo(E.left({ rp, rc, left: p })))
            )
          }
          case Channel.LeftoverTypeId: {
            return new Channel.Leftover(
              () => fuseGo(E.left({ rp, rc, left: left.nextChannel() })),
              left.leftover
            )
          }
          case Channel.HaveOutputTypeId: {
            input = E.right({ left: left.nextChannel(), right: rp(left.output) })
            break
          }
          case Channel.NeedInputTypeId: {
            return new Channel.NeedInput(
              (i) => fuseGo(E.left({ rp, rc, left: left.nextChannel(i) })),
              (u) => fuseGo(E.left({ rp, rc, left: left.fromUpstream(u) }))
            )
          }
        }
        break
      }
      case "Right": {
        const right = input.right.right
        const left = input.right.left
        Channel.concrete(right)
        switch (right._typeId) {
          case Channel.DoneTypeId: {
            return new Channel.Done(right.result)
          }
          case Channel.ChannelMTypeId: {
            return new Channel.ChannelM(
              M.map_(right.nextChannel, (right) => fuseGo(E.right({ left, right })))
            )
          }
          case Channel.LeftoverTypeId: {
            input = E.right({
              left: new Channel.HaveOutput(() => left, right.leftover),
              right: right.nextChannel()
            })
            break
          }
          case Channel.HaveOutputTypeId: {
            return new Channel.HaveOutput(
              () => fuseGo(E.right({ left, right: right.nextChannel() })),
              right.output
            )
          }
          case Channel.NeedInputTypeId: {
            input = E.left({ rp: right.nextChannel, rc: right.fromUpstream, left })
            break
          }
        }
        break
      }
    }
  }
  throw new Error("Bug")
}

/**
 * Combine two `Pipeline`s together into a new `Pipeline` (aka 'fuse').
 *
 * Output from the upstream (left) conduit will be fed into the
 * downstream (right) conduit. Processing will terminate when
 * downstream (right) returns.
 * Leftover data returned from the right `Pipeline` will be discarded.
 */
export function fuse_<R, E, R1, E1, I, O, C, A>(
  left: Pipeline<R, E, I, O, void>,
  right: Pipeline<R1, E1, O, C, A>
): Pipeline<R & R1, E | E1, I, C, A> {
  return fuseGo<R & R1, E | E1, I, C, A, O>(E.right({ left, right }))
}

/**
 * Combine two `Pipeline`s together into a new `Pipeline` (aka 'fuse').
 *
 * Output from the upstream (left) conduit will be fed into the
 * downstream (right) conduit. Processing will terminate when
 * downstream (right) returns.
 * Leftover data returned from the right `Pipeline` will be discarded.
 *
 * @dataFirst fuse_
 */
export function fuse<R, E, O, C, A>(
  right: Pipeline<R, E, O, C, A>
): <R1, E1, I>(
  left: Pipeline<R1, E1, I, O, void>
) => Pipeline<R & R1, E | E1, I, C, A> {
  return (self) => fuse_(self, right)
}

/**
 * Wait for input forever, calling the given inner `Channel` for each piece of
 * new input. Returns the upstream result type.
 */
export function awaitForever<R, E, I, O>(
  inner: (i: I) => Pipeline<R, E, I, O, void>
): Pipeline<R, E, I, O, void> {
  const go: Pipeline<R, E, I, O, void> = Channel.chain_(
    Channel.awaitOption<I>(),
    O.fold(
      () => Channel.unit,
      (x) => Channel.chain_(inner(x), () => go)
    )
  )
  return go
}
