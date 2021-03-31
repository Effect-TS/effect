import * as M from "../../Managed"
import * as L from "../../Persistent/List"

/*
 * The underlying datatype has five type parameters:
 *
 * `L` is the type of values that may be left over from this `Pipe`. A `Pipe`
 * with no leftovers would use `void` here, and one with leftovers would use
 * the same type as the `I` parameter. Leftovers are automatically provided to
 * the next `Pipe` in the monadic chain.
 *
 * `I` is the type of values for this `Pipe`'s input stream.
 *
 * `O` is the type of values for this `Pipe`'s output stream.
 *
 * `U` is the result type from the upstream `Pipe`.
 *
 * `A` is the result type.
 *
 * A basic intuition is that every `Pipe` produces a stream of output values
 * `O`, and eventually indicates that this stream is terminated by sending a
 * result (`A`). On the receiving end of a `Pipe`, these become the `I` and `U`
 * parameters.
 */
export type Pipe<R, E, L, I, O, U, A> =
  | HaveOutput<R, E, L, I, O, U, A>
  | NeedInput<R, E, L, I, O, U, A>
  | Done<R, E, A>
  | PipeM<R, E, L, I, O, U, A>
  | Leftover<R, E, L, I, O, U, A>

/**
 * Pipe Type Tags
 */
export const HaveOutputTypeId = Symbol()
export const NeedInputTypeId = Symbol()
export const DoneTypeId = Symbol()
export const PipeMTypeId = Symbol()
export const LeftoverTypeId = Symbol()

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Pipe` to be used and the output value.
 */
export class HaveOutput<R, E, L, I, O, U, A> {
  readonly _typeId: typeof HaveOutputTypeId = HaveOutputTypeId
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  constructor(readonly nextPipe: Pipe<R, E, L, I, O, U, A>, readonly output: O) {}
}

/**
 * Request more input from upstream. The first field takes a new input
 * value and provides a new `Pipe`. The second takes an upstream result
 * value, which indicates that upstream is producing no more results
 */
export class NeedInput<R, E, L, I, O, U, A> {
  readonly _typeId: typeof NeedInputTypeId = NeedInputTypeId
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  constructor(
    readonly newPipe: (i: I) => Pipe<R, E, L, I, O, U, A>,
    readonly fromUpstream: (u: U) => Pipe<R, E, L, I, O, U, A>
  ) {}
}

/**
 * Processing with this `Pipe` is complete, providing the final result.
 */
export class Done<R, E, A> {
  readonly _typeId: typeof DoneTypeId = DoneTypeId
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  constructor(readonly result: A) {}
}

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Pipe` to be used and the output value.
 */
export class PipeM<R, E, L, I, O, U, A> {
  readonly _typeId: typeof PipeMTypeId = PipeMTypeId
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  constructor(readonly nextPipe: M.Managed<R, E, Pipe<R, E, L, I, O, U, A>>) {}
}

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Pipe` to be used and the output value.
 */
export class Leftover<R, E, L, I, O, U, A> {
  readonly _typeId: typeof LeftoverTypeId = LeftoverTypeId
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  constructor(readonly pipe: Pipe<R, E, L, I, O, U, A>, readonly leftover: L) {}
}

/**
 * Monadic chain
 */
export function chain_<R, E, R2, E2, L, I, O, O2, U, A, B>(
  self: Pipe<R, E, L, I, O, U, A>,
  f: (a: A) => Pipe<R2, E2, L, I, O2, U, B>
): Pipe<R & R2, E | E2, L, I, O | O2, U, B> {
  switch (self._typeId) {
    case DoneTypeId: {
      return f(self.result)
    }
    case PipeMTypeId: {
      return new PipeM(M.map_(self.nextPipe, (a) => chain_(a, f)))
    }
    case LeftoverTypeId: {
      return new Leftover(
        new PipeM(M.effectTotal(() => chain_(self.pipe, f))),
        self.leftover
      )
    }
    case HaveOutputTypeId: {
      return new HaveOutput(
        new PipeM(M.effectTotal(() => chain_(self.nextPipe, f))),
        self.output
      )
    }
    case NeedInputTypeId: {
      return new NeedInput(
        (i) => chain_(self.newPipe(i), f),
        (u) => chain_(self.fromUpstream(u), f)
      )
    }
  }
}

/**
 *  Run a pipeline until processing completes.
 */
export function runPipe<R, E, A>(
  self: Pipe<R, E, never, never, void, void, A>
): M.Managed<R, E, A> {
  switch (self._typeId) {
    case DoneTypeId: {
      return M.succeed(self.result)
    }
    case HaveOutputTypeId: {
      throw new Error("final pipe should not contain outputs")
    }
    case PipeMTypeId: {
      return M.chain_(self.nextPipe, runPipe)
    }
    case LeftoverTypeId: {
      throw new Error("final pipe should not contain leftovers")
    }
    case NeedInputTypeId: {
      return M.suspend(() => runPipe(self.fromUpstream()))
    }
  }
}

function injectLeftoversGo<R, E, I, O, U, A>(
  ls: L.List<I>,
  self: Pipe<R, E, I, I, O, U, A>
): Pipe<R, E, never, I, O, U, A> {
  switch (self._typeId) {
    case DoneTypeId: {
      return new Done(self.result)
    }
    case LeftoverTypeId: {
      return new PipeM(
        M.effectTotal(() => injectLeftoversGo(L.prepend_(ls, self.leftover), self))
      )
    }
    case PipeMTypeId: {
      return new PipeM(M.map_(self.nextPipe, (p) => injectLeftoversGo(ls, p)))
    }
    case HaveOutputTypeId: {
      return new HaveOutput(
        new PipeM(M.effectTotal(() => injectLeftoversGo(ls, self.nextPipe))),
        self.output
      )
    }
    case NeedInputTypeId: {
      if (L.isEmpty(ls)) {
        return new NeedInput(
          (i) => injectLeftoversGo(L.empty(), self.newPipe(i)),
          (u) => injectLeftoversGo(L.empty(), self.fromUpstream(u))
        )
      } else {
        return new PipeM(
          M.effectTotal(() =>
            injectLeftoversGo(L.tail(ls), self.newPipe(L.unsafeFirst(ls)!))
          )
        )
      }
    }
  }
}

/**
 * Transforms a `Pipe` that provides leftovers to one which does not,
 * allowing it to be composed.
 *
 * This function will provide any leftover values within this `Pipe` to any
 * calls to `await`. If there are more leftover values than are demanded, the
 * remainder are discarded.
 */
export function injectLeftovers<R, E, I, O, U, A>(
  self: Pipe<R, E, I, I, O, U, A>
): Pipe<R, E, never, I, O, U, A> {
  return injectLeftoversGo(L.empty(), self)
}
