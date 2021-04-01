import * as E from "../../Either"
import * as M from "../../Managed"
import * as Channel from "../Channel"

/**
 * Core datatype of the conduit package. This type represents a general
 * component which can consume a stream of input values `I`, produce a stream
 * of output values `O`, perform actions, and produce a final result `R`.
 * The type synonyms provided here are simply wrappers around this type.
 */
export type Conduit<R, E, I, O, A> = Channel.Channel<R, E, I, I, O, void, A>

function isolateGo<A>(n: number): Conduit<unknown, never, A, A, void> {
  if (n <= 0) {
    return Channel.doneUnit
  }
  return new Channel.NeedInput(
    (i) => new Channel.HaveOutput(() => isolateGo(n - 1), i),
    () => Channel.doneUnit
  )
}

/**
 * Ensure that the inner sink consumes no more than the given number of
 * values.
 */
export function isolate<A>(n: number): Conduit<unknown, never, A, A, void> {
  return isolateGo(n)
}

/**
 * Run a pipeline until processing completes.
 */
export function run<R, E, A>(self: Conduit<R, E, never, never, A>) {
  return Channel.runChannel(Channel.injectLeftovers(self))
}

/**
 * Monadic chain
 */
export function chain_<R, E, R1, E1, O1, I, O, A, B>(
  self: Conduit<R, E, I, O, A>,
  f: (a: A) => Conduit<R1, E1, I, O1, B>
): Conduit<R & R1, E | E1, I, O | O1, B> {
  return Channel.chain_(self, f)
}

/**
 * Monadic chain
 */
export function chain<R, E, I, O, A, B>(
  f: (a: A) => Conduit<R, E, I, O, B>
): <R1, E1, O1>(
  self: Conduit<R1, E1, I, O1, A>
) => Conduit<R & R1, E | E1, I, O | O1, B> {
  return (self) => chain_(self, f)
}

/**
 * Functor map
 */
export function map_<R, E, I, O, A, B>(
  self: Conduit<R, E, I, O, A>,
  f: (a: A) => B
): Conduit<R, E, I, O, B> {
  return Channel.chain_(self, (a) => new Channel.Done(f(a)))
}

/**
 * Functor map
 */
export function map<A, B>(
  f: (a: A) => B
): <R, E, I, O>(self: Conduit<R, E, I, O, A>) => Conduit<R, E, I, O, B> {
  return (self) => map_(self, f)
}

type FuseGo<R, E, I, C, A, O> = E.Either<
  {
    rp: (i: O) => Channel.Channel<R, E, O, O, C, void, A>
    rc: (u: void) => Channel.Channel<R, E, O, O, C, void, A>
    left: Conduit<R, E, I, O, void>
  },
  { left: Conduit<R, E, I, O, void>; right: Conduit<R, E, O, C, A> }
>

function fuseGo<R, E, I, C, A, O>(
  input: FuseGo<R, E, I, C, A, O>
): Conduit<R, E, I, C, A> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (input._tag) {
      case "Left": {
        const rp = input.left.rp
        const rc = input.left.rc
        const left = input.left.left
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
              () => fuseGo(E.left({ rp, rc, left: left.pipe() })),
              left.leftover
            )
          }
          case Channel.HaveOutputTypeId: {
            input = E.right({ left: left.nextChannel(), right: rp(left.output) })
            break
          }
          case Channel.NeedInputTypeId: {
            return new Channel.NeedInput(
              (i) => fuseGo(E.left({ rp, rc, left: left.newChannel(i) })),
              (u) => fuseGo(E.left({ rp, rc, left: left.fromUpstream(u) }))
            )
          }
        }
        break
      }
      case "Right": {
        const right = input.right.right
        const left = input.right.left

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
              right: right.pipe()
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
            input = E.left({ rp: right.newChannel, rc: right.fromUpstream, left })
            break
          }
        }
        break
      }
    }
  }
  throw new Error("Bug")
}

/*
 * Combine two `Conduit`s together into a new `Conduit` (aka 'fuse').
 *
 * Output from the upstream (left) conduit will be fed into the
 * downstream (right) conduit. Processing will terminate when
 * downstream (right) returns.
 * Leftover data returned from the right `Conduit` will be discarded.
 */
export function fuse_<R, E, R1, E1, I, O, C, A>(
  self: Conduit<R, E, I, O, void>,
  that: Conduit<R1, E1, O, C, A>
): Conduit<R & R1, E | E1, I, C, A> {
  return fuseGo<R & R1, E | E1, I, C, A, O>(E.right({ left: self, right: that }))
}

/*
 * Combine two `Conduit`s together into a new `Conduit` (aka 'fuse').
 *
 * Output from the upstream (left) conduit will be fed into the
 * downstream (right) conduit. Processing will terminate when
 * downstream (right) returns.
 * Leftover data returned from the right `Conduit` will be discarded.
 */
export function fuse<R, E, O, C, A>(
  that: Conduit<R, E, O, C, A>
): <R1, E1, I>(self: Conduit<R1, E1, I, O, void>) => Conduit<R & R1, E | E1, I, C, A> {
  return (self) => fuse_(self, that)
}
