import { Cause } from "../Cause.js"
import { Chunk } from "../Chunk.js"
import { Effect } from "../Effect.js"
import { Exit } from "../Exit.js"
import { constFalse, constTrue, dual, pipe } from "../Function.js"
import { Option } from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import type { Take } from "../Take.js"

/** @internal */
const TakeSymbolKey = "effect/Take"

/** @internal */
export const TakeTypeId: Take.TakeTypeId = Symbol.for(
  TakeSymbolKey
) as Take.TakeTypeId

/** @internal */
const takeVariance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export class TakeImpl<E, A> implements Take<E, A> {
  readonly [TakeTypeId] = takeVariance
  constructor(readonly exit: Exit<Option<E>, Chunk<A>>) {
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const chunk = <A>(chunk: Chunk<A>): Take<never, A> => new TakeImpl(Exit.succeed(chunk))

/** @internal */
export const die = (defect: unknown): Take<never, never> => new TakeImpl(Exit.die(defect))

/** @internal */
export const dieMessage = (message: string): Take<never, never> =>
  new TakeImpl(Exit.die(Cause.RuntimeException(message)))

/** @internal */
export const done = <E, A>(self: Take<E, A>): Effect<never, Option<E>, Chunk<A>> =>
  Effect.suspend(() => self.exit)

/** @internal */
export const end: Take<never, never> = new TakeImpl(Exit.fail(Option.none()))

/** @internal */
export const fail = <E>(error: E): Take<E, never> => new TakeImpl(Exit.fail(Option.some(error)))

/** @internal */
export const failCause = <E>(cause: Cause<E>): Take<E, never> =>
  new TakeImpl(Exit.failCause(pipe(cause, Cause.map(Option.some))))

/** @internal */
export const fromEffect = <R, E, A>(effect: Effect<R, E, A>): Effect<R, never, Take<E, A>> =>
  Effect.matchCause(effect, { onFailure: failCause, onSuccess: of })

/** @internal */
export const fromExit = <E, A>(exit: Exit<E, A>): Take<E, A> =>
  new TakeImpl(pipe(exit, Exit.mapBoth({ onFailure: Option.some, onSuccess: Chunk.of })))

/** @internal */
export const fromPull = <R, E, A>(
  pull: Effect<R, Option<E>, Chunk<A>>
): Effect<R, never, Take<E, A>> =>
  Effect.matchCause(pull, {
    onFailure: (cause) =>
      Option.match(Cause.flipCauseOption(cause), {
        onNone: () => end,
        onSome: failCause
      }),
    onSuccess: chunk
  })

/** @internal */
export const isDone = <E, A>(self: Take<E, A>): boolean =>
  Exit.match(self.exit, {
    onFailure: (cause) => Option.isNone(Cause.flipCauseOption(cause)),
    onSuccess: constFalse
  })

/** @internal */
export const isFailure = <E, A>(self: Take<E, A>): boolean =>
  Exit.match(self.exit, {
    onFailure: (cause) => Option.isSome(Cause.flipCauseOption(cause)),
    onSuccess: constFalse
  })

/** @internal */
export const isSuccess = <E, A>(self: Take<E, A>): boolean =>
  Exit.match(self.exit, {
    onFailure: constFalse,
    onSuccess: constTrue
  })

/** @internal */
export const make = <E, A>(
  exit: Exit<Option<E>, Chunk<A>>
): Take<E, A> => new TakeImpl(exit)

/** @internal */
export const match = dual<
  <Z, E, Z2, A, Z3>(
    options: {
      readonly onEnd: () => Z
      readonly onFailure: (cause: Cause<E>) => Z2
      readonly onSuccess: (chunk: Chunk<A>) => Z3
    }
  ) => (self: Take<E, A>) => Z | Z2 | Z3,
  <Z, E, Z2, A, Z3>(
    self: Take<E, A>,
    options: {
      readonly onEnd: () => Z
      readonly onFailure: (cause: Cause<E>) => Z2
      readonly onSuccess: (chunk: Chunk<A>) => Z3
    }
  ) => Z | Z2 | Z3
>(2, <Z, E, Z2, A, Z3>(
  self: Take<E, A>,
  { onEnd, onFailure, onSuccess }: {
    readonly onEnd: () => Z
    readonly onFailure: (cause: Cause<E>) => Z2
    readonly onSuccess: (chunk: Chunk<A>) => Z3
  }
): Z | Z2 | Z3 =>
  Exit.match(self.exit, {
    onFailure: (cause) =>
      Option.match(Cause.flipCauseOption(cause), {
        onNone: onEnd,
        onSome: onFailure
      }),
    onSuccess
  }))

/** @internal */
export const matchEffect = dual<
  <R, E2, Z, R2, E, Z2, A, R3, E3, Z3>(
    options: {
      readonly onEnd: () => Effect<R, E2, Z>
      readonly onFailure: (cause: Cause<E>) => Effect<R2, E2, Z2>
      readonly onSuccess: (chunk: Chunk<A>) => Effect<R3, E3, Z3>
    }
  ) => (self: Take<E, A>) => Effect<R | R2 | R3, E2 | E | E3, Z | Z2 | Z3>,
  <R, E2, Z, R2, E, Z2, A, R3, E3, Z3>(
    self: Take<E, A>,
    options: {
      readonly onEnd: () => Effect<R, E2, Z>
      readonly onFailure: (cause: Cause<E>) => Effect<R2, E2, Z2>
      readonly onSuccess: (chunk: Chunk<A>) => Effect<R3, E3, Z3>
    }
  ) => Effect<R | R2 | R3, E2 | E | E3, Z | Z2 | Z3>
>(2, <R, E2, Z, R2, E, Z2, A, R3, E3, Z3>(
  self: Take<E, A>,
  { onEnd, onFailure, onSuccess }: {
    readonly onEnd: () => Effect<R, E2, Z>
    readonly onFailure: (cause: Cause<E>) => Effect<R2, E2, Z2>
    readonly onSuccess: (chunk: Chunk<A>) => Effect<R3, E3, Z3>
  }
): Effect<R | R2 | R3, E | E2 | E3, Z | Z2 | Z3> =>
  Exit.matchEffect<Option<E>, Chunk<A>, R | R2, E | E2, Z | Z2, R3, E3, Z3>(self.exit, {
    onFailure: (cause) =>
      Option.match(Cause.flipCauseOption(cause), {
        onNone: onEnd,
        onSome: onFailure
      }),
    onSuccess
  }))

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => <E>(self: Take<E, A>) => Take<E, B>,
  <E, A, B>(self: Take<E, A>, f: (a: A) => B) => Take<E, B>
>(
  2,
  <E, A, B>(self: Take<E, A>, f: (a: A) => B): Take<E, B> =>
    new TakeImpl(pipe(self.exit, Exit.map(Chunk.map(f))))
)

/** @internal */
export const of = <A>(value: A): Take<never, A> => new TakeImpl(Exit.succeed(Chunk.of(value)))

/** @internal */
export const tap = dual<
  <A, R, E2, _>(
    f: (chunk: Chunk<A>) => Effect<R, E2, _>
  ) => <E>(self: Take<E, A>) => Effect<R, E2 | E, void>,
  <E, A, R, E2, _>(
    self: Take<E, A>,
    f: (chunk: Chunk<A>) => Effect<R, E2, _>
  ) => Effect<R, E2 | E, void>
>(2, <E, A, R, E2, _>(
  self: Take<E, A>,
  f: (chunk: Chunk<A>) => Effect<R, E2, _>
): Effect<R, E | E2, void> => pipe(self.exit, Exit.forEachEffect(f), Effect.asUnit))
