import * as Cause from "../Cause.js"
import * as Chunk from "../Chunk.js"
import * as Effect from "../Effect.js"
import * as Exit from "../Exit.js"
import { constFalse, constTrue, dual, pipe } from "../Function.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import type * as Take from "../Take.js"

/** @internal */
const TakeSymbolKey = "effect/Take"

/** @internal */
export const TakeTypeId: Take.TakeTypeId = Symbol.for(
  TakeSymbolKey
) as Take.TakeTypeId

const takeVariance = {
  /* c8 ignore next */
  _E: (_: never) => _,
  /* c8 ignore next */
  _A: (_: never) => _
}

/** @internal */
export class TakeImpl<out E, out A> implements Take.Take<E, A> {
  readonly [TakeTypeId] = takeVariance
  constructor(readonly exit: Exit.Exit<Option.Option<E>, Chunk.Chunk<A>>) {
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const chunk = <A>(chunk: Chunk.Chunk<A>): Take.Take<never, A> => new TakeImpl(Exit.succeed(chunk))

/** @internal */
export const die = (defect: unknown): Take.Take<never, never> => new TakeImpl(Exit.die(defect))

/** @internal */
export const dieMessage = (message: string): Take.Take<never, never> =>
  new TakeImpl(Exit.die(new Cause.RuntimeException(message)))

/** @internal */
export const done = <E, A>(self: Take.Take<E, A>): Effect.Effect<Chunk.Chunk<A>, Option.Option<E>> =>
  Effect.suspend(() => self.exit)

/** @internal */
export const end: Take.Take<never, never> = new TakeImpl(Exit.fail(Option.none()))

/** @internal */
export const fail = <E>(error: E): Take.Take<E, never> => new TakeImpl(Exit.fail(Option.some(error)))

/** @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Take.Take<E, never> =>
  new TakeImpl(Exit.failCause(pipe(cause, Cause.map(Option.some))))

/** @internal */
export const fromEffect = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<Take.Take<E, A>, never, R> =>
  Effect.matchCause(effect, { onFailure: failCause, onSuccess: of })

/** @internal */
export const fromExit = <E, A>(exit: Exit.Exit<E, A>): Take.Take<E, A> =>
  new TakeImpl(pipe(exit, Exit.mapBoth({ onFailure: Option.some, onSuccess: Chunk.of })))

/** @internal */
export const fromPull = <A, E, R>(
  pull: Effect.Effect<Chunk.Chunk<A>, Option.Option<E>, R>
): Effect.Effect<Take.Take<E, A>, never, R> =>
  Effect.matchCause(pull, {
    onFailure: (cause) =>
      Option.match(Cause.flipCauseOption(cause), {
        onNone: () => end,
        onSome: failCause
      }),
    onSuccess: chunk
  })

/** @internal */
export const isDone = <E, A>(self: Take.Take<E, A>): boolean =>
  Exit.match(self.exit, {
    onFailure: (cause) => Option.isNone(Cause.flipCauseOption(cause)),
    onSuccess: constFalse
  })

/** @internal */
export const isFailure = <E, A>(self: Take.Take<E, A>): boolean =>
  Exit.match(self.exit, {
    onFailure: (cause) => Option.isSome(Cause.flipCauseOption(cause)),
    onSuccess: constFalse
  })

/** @internal */
export const isSuccess = <E, A>(self: Take.Take<E, A>): boolean =>
  Exit.match(self.exit, {
    onFailure: constFalse,
    onSuccess: constTrue
  })

/** @internal */
export const make = <E, A>(
  exit: Exit.Exit<Option.Option<E>, Chunk.Chunk<A>>
): Take.Take<E, A> => new TakeImpl(exit)

/** @internal */
export const match = dual<
  <Z, E, Z2, A, Z3>(
    options: {
      readonly onEnd: () => Z
      readonly onFailure: (cause: Cause.Cause<E>) => Z2
      readonly onSuccess: (chunk: Chunk.Chunk<A>) => Z3
    }
  ) => (self: Take.Take<E, A>) => Z | Z2 | Z3,
  <Z, E, Z2, A, Z3>(
    self: Take.Take<E, A>,
    options: {
      readonly onEnd: () => Z
      readonly onFailure: (cause: Cause.Cause<E>) => Z2
      readonly onSuccess: (chunk: Chunk.Chunk<A>) => Z3
    }
  ) => Z | Z2 | Z3
>(2, <Z, E, Z2, A, Z3>(
  self: Take.Take<E, A>,
  { onEnd, onFailure, onSuccess }: {
    readonly onEnd: () => Z
    readonly onFailure: (cause: Cause.Cause<E>) => Z2
    readonly onSuccess: (chunk: Chunk.Chunk<A>) => Z3
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
      readonly onEnd: Effect.Effect<Z, E2, R>
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<Z2, E2, R2>
      readonly onSuccess: (chunk: Chunk.Chunk<A>) => Effect.Effect<Z3, E3, R3>
    }
  ) => (self: Take.Take<E, A>) => Effect.Effect<Z | Z2 | Z3, E2 | E | E3, R | R2 | R3>,
  <R, E2, Z, R2, E, Z2, A, R3, E3, Z3>(
    self: Take.Take<E, A>,
    options: {
      readonly onEnd: Effect.Effect<Z, E2, R>
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<Z2, E2, R2>
      readonly onSuccess: (chunk: Chunk.Chunk<A>) => Effect.Effect<Z3, E3, R3>
    }
  ) => Effect.Effect<Z | Z2 | Z3, E2 | E | E3, R | R2 | R3>
>(2, <R, E2, Z, R2, E, Z2, A, R3, E3, Z3>(
  self: Take.Take<E, A>,
  { onEnd, onFailure, onSuccess }: {
    readonly onEnd: Effect.Effect<Z, E2, R>
    readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<Z2, E2, R2>
    readonly onSuccess: (chunk: Chunk.Chunk<A>) => Effect.Effect<Z3, E3, R3>
  }
): Effect.Effect<Z | Z2 | Z3, E2 | E | E3, R | R2 | R3> =>
  Exit.matchEffect(self.exit, {
    onFailure: (cause) =>
      Option.match<Cause.Cause<E>, Effect.Effect<Z | Z2, E2 | E, R | R2>>(Cause.flipCauseOption(cause), {
        onNone: () => onEnd,
        onSome: onFailure
      }),
    onSuccess
  }))

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => <E>(self: Take.Take<E, A>) => Take.Take<E, B>,
  <E, A, B>(self: Take.Take<E, A>, f: (a: A) => B) => Take.Take<E, B>
>(
  2,
  <E, A, B>(self: Take.Take<E, A>, f: (a: A) => B): Take.Take<E, B> =>
    new TakeImpl(pipe(self.exit, Exit.map(Chunk.map(f))))
)

/** @internal */
export const of = <A>(value: A): Take.Take<never, A> => new TakeImpl(Exit.succeed(Chunk.of(value)))

/** @internal */
export const tap = dual<
  <A, R, E2, _>(
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<_, E2, R>
  ) => <E>(self: Take.Take<E, A>) => Effect.Effect<void, E2 | E, R>,
  <E, A, R, E2, _>(
    self: Take.Take<E, A>,
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<_, E2, R>
  ) => Effect.Effect<void, E2 | E, R>
>(2, <E, A, R, E2, _>(
  self: Take.Take<E, A>,
  f: (chunk: Chunk.Chunk<A>) => Effect.Effect<_, E2, R>
): Effect.Effect<void, E2 | E, R> => pipe(self.exit, Exit.forEachEffect(f), Effect.asUnit))
