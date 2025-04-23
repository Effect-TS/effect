import { describe, it } from "@effect/vitest"
import {
  assertFailure,
  assertFalse,
  assertLeft,
  assertNone,
  assertRight,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual
} from "@effect/vitest/utils"
import {
  Cause,
  Chunk,
  Context,
  Deferred,
  Effect,
  Either,
  Exit,
  FastCheck as fc,
  Fiber,
  Option,
  pipe,
  STM,
  TDeferred,
  TQueue,
  TRef
} from "effect"
import { constFalse, constTrue, constVoid } from "effect/Function"

interface STMEnv {
  readonly ref: TRef.TRef<number>
}

const STMEnv = Context.GenericTag<STMEnv>("STMEnv")

const makeSTMEnv = (n: number): Effect.Effect<STMEnv> =>
  pipe(
    TRef.make(n),
    Effect.map((ref) => ({ ref }))
  )

class UnpureBarrier {
  #isOpen = false
  open(): void {
    this.#isOpen = true
  }
  await(): Effect.Effect<unknown> {
    return Effect.async((cb) => {
      const check = () => {
        if (this.#isOpen) {
          cb(Effect.void)
        } else {
          setTimeout(() => {
            check()
          }, 100)
        }
      }
      setTimeout(check, 100)
    })
  }
}

const chain = (depth: number) =>
(
  next: (stm: STM.STM<number>) => STM.STM<number>
): Effect.Effect<number> => {
  const loop = (_n: number, _acc: STM.STM<number>): Effect.Effect<number> => {
    let n = _n
    let acc = _acc
    while (n > 0) {
      acc = next(acc)
      n = n - 1
    }
    return STM.commit(acc)
  }
  return loop(depth, STM.succeed(0))
}

const chainError = (depth: number): Effect.Effect<never, number> => {
  const loop = (_n: number, _acc: STM.STM<never, number, never>): Effect.Effect<never, number> => {
    let n = _n
    let acc = _acc
    while (n > 0) {
      acc = pipe(acc, STM.mapError((n) => n + 1))
      n = n - 1
    }
    return STM.commit(acc)
  }
  return loop(depth, STM.fail(0))
}

const incrementTRefN = (n: number, ref: TRef.TRef<number>): Effect.Effect<number> =>
  pipe(
    TRef.get(ref),
    STM.tap((n) => pipe(ref, TRef.set(n + 1))),
    STM.zipRight(TRef.get(ref)),
    STM.commit,
    Effect.repeatN(n)
  )

const transfer = (
  receiver: TRef.TRef<number>,
  sender: TRef.TRef<number>,
  much: number
): Effect.Effect<number> =>
  pipe(
    TRef.get(sender),
    STM.tap((balance) => STM.check(() => balance >= much)),
    STM.tap(() => pipe(receiver, TRef.update((n) => n + much))),
    STM.tap(() => pipe(sender, TRef.update((n) => n - much))),
    STM.zipRight(TRef.get(receiver)),
    STM.commit
  )

const compute3TRefN = (
  n: number,
  ref1: TRef.TRef<number>,
  ref2: TRef.TRef<number>,
  ref3: TRef.TRef<number>
): Effect.Effect<number> =>
  pipe(
    STM.all([TRef.get(ref1), TRef.get(ref2)]),
    STM.tap(([v1, v2]) => pipe(ref3, TRef.set(v1 + v2))),
    STM.flatMap(([v1, v2]) =>
      pipe(
        TRef.get(ref3),
        STM.flatMap((v3) =>
          pipe(
            ref1,
            TRef.set(v1 - 1),
            STM.zipRight(pipe(ref2, TRef.set(v2 + 1))),
            STM.as(v3)
          )
        )
      )
    ),
    STM.commit,
    Effect.repeatN(n)
  )

const permutation = (ref1: TRef.TRef<number>, ref2: TRef.TRef<number>): STM.STM<void> =>
  pipe(
    STM.all([TRef.get(ref1), TRef.get(ref2)]),
    STM.flatMap(([a, b]) =>
      pipe(
        ref1,
        TRef.set(b),
        STM.tap(() => pipe(ref2, TRef.set(a))),
        STM.asVoid
      )
    )
  )

describe("STM", () => {
  it.effect("catchAll", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.fail("Ouch!"),
        STM.tap(() => STM.succeed("everything is fine")),
        STM.catchAll((s) => STM.succeed(`${s} phew`))
      )
      const result = yield* STM.commit(transaction)
      deepStrictEqual(result, "Ouch! phew")
    }))

  it.effect("collectAll - ordering", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        TQueue.bounded<number>(3),
        STM.tap((queue) => pipe(queue, TQueue.offer(1))),
        STM.tap((queue) => pipe(queue, TQueue.offer(2))),
        STM.tap((queue) => pipe(queue, TQueue.offer(3))),
        STM.flatMap((queue) => STM.all(Array.from({ length: 3 }, () => TQueue.take(queue))))
      )
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(Array.from(result), [1, 2, 3])
    }))

  it.effect("catchSome - catches matched errors", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.fail(new Cause.RuntimeException("Ouch")),
        STM.tap(() => STM.succeed("everything is fine")),
        STM.catchSome((e) =>
          Cause.isRuntimeException(e) ?
            Option.some(STM.succeed("gotcha")) :
            Option.none()
        )
      )
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(result, "gotcha")
    }))

  it.effect("catchSome - lets the error pass", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("Ouch")
      const transaction = pipe(
        STM.fail(error),
        STM.tap(() => STM.succeed("everything is fine")),
        STM.catchSome((e) =>
          Cause.isIllegalArgumentException(e) ?
            Option.some(STM.succeed("gotcha")) :
            Option.none()
        )
      )
      const result = yield* (Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("collectAll - collects a list of transactional effects to a single transaction", () =>
    Effect.gen(function*() {
      const chunk: Chunk.Chunk<number> = Chunk.range(1, 100)
      const iterable = yield* (Effect.succeed(pipe(chunk, Chunk.map(TRef.make))))
      const refs = yield* (STM.all(iterable))
      const result = yield* (
        Effect.forEach(refs, TRef.get, {
          concurrency: "unbounded"
        })
      )
      deepStrictEqual(Array.from(result), Array.from(chunk))
    }))

  it.effect("either - convert a successful computation into a Right", () =>
    Effect.gen(function*() {
      const transaction = STM.either(STM.succeed(42))
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(result, Either.right(42))
    }))

  it.effect("either - convert a failed computation into a Left", () =>
    Effect.gen(function*() {
      const transaction = STM.either(STM.fail("Ouch"))
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(result, Either.left("Ouch"))
    }))

  it.effect("environment - access and provide outside transaction", () =>
    Effect.gen(function*() {
      const result = yield* (pipe(
        makeSTMEnv(0),
        Effect.flatMap((env) =>
          pipe(
            STM.flatMap(STMEnv, (env) => pipe(env.ref, TRef.update((n) => n + 1))),
            STM.provideContext(Context.make(STMEnv, env)),
            STM.commit,
            Effect.zipRight(TRef.get(env.ref))
          )
        )
      ))
      deepStrictEqual(result, 1)
    }))

  it.effect("environment - access and provide inside transaction", () =>
    Effect.gen(function*() {
      const result = yield* (pipe(
        makeSTMEnv(0),
        Effect.flatMap((env) =>
          pipe(
            STM.flatMap(STMEnv, (env) => pipe(env.ref, TRef.update((n) => n + 1))),
            STM.provideContext(Context.make(STMEnv, env)),
            STM.zipRight(TRef.get(env.ref))
          )
        )
      ))
      deepStrictEqual(result, 1)
    }))

  it.effect("eventually - succeeds", () =>
    Effect.gen(function*() {
      const f = (ref: TRef.TRef<number>) =>
        STM.gen(function*() {
          const n = yield* TRef.get(ref)
          return yield* n < 10 ?
            pipe(ref, TRef.update((n) => n + 1), STM.zipRight(STM.fail("Ouch"))) :
            STM.succeed(n)
        })
      const transaction = pipe(
        TRef.make(0),
        STM.flatMap((ref) => STM.eventually(f(ref)))
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 10)
    }))

  it.effect("fail", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.exit(STM.commit(STM.fail("Ouch"))))
      deepStrictEqual(result, Exit.fail("Ouch"))
    }))

  it.effect("filter - filters a collection using an effectual predicate", () =>
    Effect.gen(function*() {
      const array = [2, 4, 6, 3, 5, 6]
      const transaction = STM.gen(function*() {
        const ref = yield* (TRef.make(Chunk.empty<number>()))
        const results = yield* (pipe(
          array,
          STM.filter((n) => pipe(ref, TRef.update(Chunk.append(n)), STM.as(n % 2 === 0)))
        ))
        const effects = yield* (TRef.get(ref))
        return { results, effects }
      })
      const { effects, results } = yield* (STM.commit(transaction))
      deepStrictEqual(Array.from(results), [2, 4, 6, 6])
      deepStrictEqual(Array.from(effects), array)
    }))

  it.effect("filterOrDie - dies when predicate fails", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("Ouch")
      const transaction = pipe(
        STM.succeed(1),
        STM.filterOrDie((n) => n !== 1, () => error)
      )
      const result = yield* (Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("filterOrDieMessage - dies with message when predicate fails", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.succeed(1),
        STM.filterOrDieMessage((n) => n !== 1, "Ouch")
      )
      const result = yield* (Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.die(new Cause.RuntimeException("Ouch")))
    }))

  it.effect("filterOrElse - returns checked failure", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.succeed(1),
        STM.filterOrElse((n) => n === 1, () => STM.succeed(2))
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1)
    }))

  it.effect("filterOrElse - returns held value", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.succeed(1),
        STM.filterOrElse((n) => n !== 1, () => STM.succeed(2))
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 2)
    }))

  it.effect("filterOrElse - returns checked failure", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.succeed(1),
        STM.filterOrElse((n) => n === 1, (n) => STM.succeed(n + 1))
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1)
    }))

  it.effect("filterOrElse - returns held value", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.succeed(1),
        STM.filterOrElse((n) => n !== 1, (n) => STM.succeed(n + 1))
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 2)
    }))

  it.effect("filterOrElse - returns error", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("Ouch")
      const transaction = pipe(
        STM.fail(error),
        STM.zipRight(STM.succeed(1)),
        STM.filterOrElse((n) => n === 1, (n) => STM.succeed(n + 1))
      )
      const result = yield* (Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("filterOrFail - returns failure when predicate fails", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("Ouch")
      const transaction = pipe(
        STM.succeed(1),
        STM.filterOrFail((n) => n !== 1, () => error)
      )
      const result = yield* (Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("flatten", () =>
    Effect.gen(function*() {
      const transaction = STM.flatten(STM.succeed(STM.succeed("test")))
      const result = yield* (STM.commit(transaction))
      strictEqual(result, "test")
    }))

  it.effect("forEach - performs an action on each chunk element and return a single transaction", () =>
    Effect.gen(function*() {
      const ref = yield* (TRef.make(0))
      const chunk = Chunk.range(1, 5)
      yield* (pipe(chunk, STM.forEach((n) => pipe(ref, TRef.update((i) => i + n)))))
      const expected = pipe(chunk, Chunk.reduceRight(0, (acc, curr) => acc + curr))
      const result = yield* (TRef.get(ref))
      strictEqual(result, expected)
    }))

  it.effect("forEach - performs an action on each chunk element", () =>
    Effect.gen(function*() {
      const ref = yield* (TRef.make(0))
      const chunk = Chunk.range(1, 5)
      yield* (STM.forEach(chunk, (n) => pipe(ref, TRef.update((i) => i + n)), { discard: true }))
      const expected = pipe(chunk, Chunk.reduceRight(0, (acc, curr) => acc + curr))
      const result = yield* (TRef.get(ref))
      strictEqual(result, expected)
    }))

  it.effect("fold - handles both failure and success", () =>
    Effect.gen(function*() {
      const transaction = STM.all({
        success: pipe(STM.succeed("yes"), STM.match({ onFailure: () => -1, onSuccess: () => 1 })),
        failure: pipe(STM.fail("no"), STM.match({ onFailure: () => -1, onSuccess: () => 1 }))
      })
      const { failure, success } = yield* (STM.commit(transaction))
      strictEqual(success, 1)
      strictEqual(failure, -1)
    }))

  it.effect("foldSTM - folds over the `STM` effect, and handle failure and success", () =>
    Effect.gen(function*() {
      const transaction = STM.all({
        success: pipe(STM.succeed("yes"), STM.matchSTM({ onFailure: () => STM.succeed("no"), onSuccess: STM.succeed })),
        failure: pipe(STM.fail("no"), STM.matchSTM({ onFailure: STM.succeed, onSuccess: () => STM.succeed("yes") }))
      })
      const { failure, success } = yield* (STM.commit(transaction))
      strictEqual(failure, "no")
      strictEqual(success, "yes")
    }))

  it.effect("head - extracts the first value from an iterable", () =>
    Effect.gen(function*() {
      const transaction = STM.head(STM.succeed([1, 2]))
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1)
    }))

  it.effect("head - returns None if the iterable is empty", () =>
    Effect.gen(function*() {
      const transaction = STM.head(STM.succeed([]))
      const result = yield* (Effect.exit(STM.commit(transaction)))
      assertFailure(result, Cause.fail(Option.none()))
    }))

  it.effect("head - returns Some if there is an error", () =>
    Effect.gen(function*() {
      const transaction = STM.head(STM.fail("Ouch"))
      const result = yield* (Effect.exit(STM.commit(transaction)))
      assertFailure(result, Cause.fail(Option.some("Ouch")))
    }))

  it.effect("if - runs `onTrue` if result is `true`", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.succeed(true),
        STM.if({
          onFalse: STM.succeed(-1),
          onTrue: STM.succeed(1)
        })
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1)
    }))

  it.effect("if - runs `onFalse` if result is `false`", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.succeed(false),
        STM.if({
          onFalse: STM.succeed(-1),
          onTrue: STM.succeed(1)
        })
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, -1)
    }))

  it.effect("mapBoth - success value", () =>
    Effect.gen(function*() {
      const transaction = pipe(STM.succeed(1), STM.mapBoth({ onFailure: () => -1, onSuccess: (n) => `${n} as string` }))
      const result = yield* (STM.commit(transaction))
      strictEqual(result, "1 as string")
    }))

  it.effect("mapBoth - success value", () =>
    Effect.gen(function*() {
      const transaction = pipe(STM.fail(-1), STM.mapBoth({ onFailure: (n) => `${n} as string`, onSuccess: () => 0 }))
      const result = yield* (Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.fail("-1 as string"))
    }))

  it.effect("mapError - map from one error to another", () =>
    Effect.gen(function*() {
      const transaction = pipe(STM.fail(-1), STM.mapError(() => "Ouch"))
      const result = yield* (Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.fail("Ouch"))
    }))

  it.effect("merge - on error", () =>
    Effect.gen(function*() {
      const transaction = STM.merge(STM.fromEither(Either.left(1)))
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1)
    }))

  it.effect("merge - on success", () =>
    Effect.gen(function*() {
      const transaction = STM.merge(STM.fromEither(Either.right(1)))
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1)
    }))

  it.effect("mergeAll - return zero element on empty input", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        Chunk.empty<STM.STM<number>>(),
        STM.mergeAll(42, () => 43)
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 42)
    }))

  it.effect("mergeAll - merge iterable using function", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        [3, 5, 7].map((n) => STM.succeed(n)),
        STM.mergeAll(1, (acc, curr) => acc + curr)
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1 + 3 + 5 + 7)
    }))

  it.effect("mergeAll - return error if it exists in list", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        [STM.void, STM.fail(1)] as Array<STM.STM<void, number>>,
        STM.mergeAll(void 0 as void, constVoid)
      )
      const result = yield* (Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.fail(1))
    }))

  it.effect("none - on None", () =>
    Effect.gen(function*() {
      const transaction = STM.none(STM.succeed(Option.none()))
      const result = yield* (STM.commit(transaction))
      strictEqual(result, undefined)
    }))

  it.effect("none - on Some", () =>
    Effect.gen(function*() {
      const transaction = STM.none(STM.succeed(Option.some(1)))
      const result = yield* (Effect.exit(STM.commit(transaction)))
      assertFailure(result, Cause.fail(Option.none()))
    }))

  it.effect("none - on error", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("Ouch")
      const transaction = STM.none(STM.fail(error))
      const result = yield* (Effect.exit(STM.commit(transaction)))
      assertFailure(result, Cause.fail(Option.some(error)))
    }))

  it.effect("option - success converts to Some", () =>
    Effect.gen(function*() {
      const transaction = STM.option(STM.succeed(42))
      const result = yield* (STM.commit(transaction))
      assertSome(result, 42)
    }))

  it.effect("option - failure converts to None", () =>
    Effect.gen(function*() {
      const transaction = STM.option(STM.fail("Ouch"))
      const result = yield* (STM.commit(transaction))
      assertNone(result)
    }))

  it.effect("orElse - succeeds if left succeeds", () =>
    Effect.gen(function*() {
      const left = STM.succeed("left")
      const right = STM.succeed("right")
      const result = yield* (STM.commit(pipe(left, STM.orElse(() => right))))
      strictEqual(result, "left")
    }))

  it.effect("orElse - succeeds if right succeeds", () =>
    Effect.gen(function*() {
      const left = STM.retry
      const right = STM.succeed("right")
      const result = yield* (STM.commit(pipe(left, STM.orElse(() => right))))
      strictEqual(result, "right")
    }))

  it.effect("orElse - tries alternative once left retries", () =>
    Effect.gen(function*() {
      const ref = yield* (TRef.make(0))
      const left = pipe(ref, TRef.update((n) => n + 100), STM.zipRight(STM.retry))
      const right = pipe(ref, TRef.update((n) => n + 200))
      yield* (pipe(left, STM.orElse(() => right)))
      const result = yield* (TRef.get(ref))
      strictEqual(result, 200)
    }))

  it.effect("orElse - tries alternative once left fails", () =>
    Effect.gen(function*() {
      const ref = yield* (TRef.make(0))
      const left = pipe(ref, TRef.update((n) => n + 100), STM.zipRight(STM.fail("boom")))
      const right = pipe(ref, TRef.update((n) => n + 200))
      yield* (pipe(left, STM.orElse(() => right)))
      const result = yield* (TRef.get(ref))
      strictEqual(result, 200)
    }))

  it.effect("orElse - fail if alternative fails", () =>
    Effect.gen(function*() {
      const left = STM.fail("left")
      const right = STM.fail("right")
      const result = yield* (pipe(left, STM.orElse(() => right), Effect.exit))
      assertFailure(result, Cause.fail("right"))
    }))

  it.effect("orElseEither - orElseEither returns result of the first successful transaction", () =>
    Effect.gen(function*() {
      const result1 = yield* (pipe(STM.retry, STM.orElseEither(() => STM.succeed(42))))
      const result2 = yield* (pipe(STM.succeed(1), STM.orElseEither(() => STM.succeed("no"))))
      const result3 = yield* (pipe(STM.succeed(2), STM.orElseEither(() => STM.retry)))
      assertRight(result1, 42)
      assertLeft(result2, 1)
      assertLeft(result3, 2)
    }))

  it.effect("orElseFail - tries left first", () =>
    Effect.gen(function*() {
      const transaction = pipe(STM.succeed(true), STM.orElseFail(() => false))
      const result = yield* (STM.commit(transaction))
      assertTrue(result)
    }))

  it.effect("orElseFail - fails with the specified error once left retries", () =>
    Effect.gen(function*() {
      const transaction = pipe(STM.retry, STM.orElseFail(() => false), STM.either)
      const result = yield* (STM.commit(transaction))
      assertLeft(result, false)
    }))

  it.effect("orElseFail - fails with the specified error once left fails", () =>
    Effect.gen(function*() {
      const transaction = pipe(STM.fail(true), STM.orElseFail(() => false), STM.either)
      const result = yield* (STM.commit(transaction))
      assertLeft(result, false)
    }))

  it.effect("orElseSucceed - tries left first", () =>
    Effect.gen(function*() {
      const transaction = pipe(STM.succeed(true), STM.orElseSucceed(() => false))
      const result = yield* (STM.commit(transaction))
      assertTrue(result)
    }))

  it.effect("orElseSucceed - succeeds with the specified error once left retries", () =>
    Effect.gen(function*() {
      const transaction = pipe(STM.retry, STM.orElseSucceed(() => false))
      const result = yield* (STM.commit(transaction))
      assertFalse(result)
    }))

  it.effect("orElseSucceed - succeeds with the specified error once left fails", () =>
    Effect.gen(function*() {
      const transaction = pipe(STM.fail(true), STM.orElseSucceed(() => false))
      const result = yield* (STM.commit(transaction))
      assertFalse(result)
    }))

  it.effect("unsome - converts Some in E to error in E", () =>
    Effect.gen(function*() {
      const transaction = STM.unsome(STM.fromEither(Either.left(Option.some("Ouch"))))
      const result = yield* (Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.fail("Ouch"))
    }))

  it.effect("unsome - converts None in E to None in A", () =>
    Effect.gen(function*() {
      const transaction = STM.unsome(STM.fromEither(Either.left(Option.none())))
      const result = yield* (STM.commit(transaction))
      assertNone(result)
    }))

  it.effect("unsome - no error", () =>
    Effect.gen(function*() {
      const transaction = STM.unsome(STM.fromEither(Either.right(42)))
      const result = yield* (STM.commit(transaction))
      assertSome(result, 42)
    }))

  it.effect("orDie - when failure should die", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("Ouch")
      const transaction = STM.orDie(STM.fail(error))
      const result = yield* (Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("orDie - when succeed should keep going", () =>
    Effect.gen(function*() {
      const transaction = STM.orDie(STM.succeed(1))
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1)
    }))

  it.effect("orDieWith - when failure should die", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("Ouch")
      const transaction = pipe(STM.fail("-1"), STM.orDieWith(() => error))
      const result = yield* (Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("orDieWith - when succeed should keep going", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("Ouch")
      const transaction = pipe(STM.succeed(1), STM.orDieWith(() => error))
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1)
    }))

  it.effect("partition - collects only successes", () =>
    Effect.gen(function*() {
      const input = Chunk.range(0, 9)
      const transaction = pipe(input, STM.partition(STM.succeed))
      const [left, right] = yield* (STM.commit(transaction))
      assertTrue(left.length === 0)
      deepStrictEqual(Array.from(right), Array.from(input))
    }))

  it.effect("partition - collects only failures", () =>
    Effect.gen(function*() {
      const input = Chunk.range(0, 9)
      const transaction = pipe(input, STM.partition(STM.fail))
      const [left, right] = yield* (STM.commit(transaction))
      assertTrue(right.length === 0)
      deepStrictEqual(Array.from(left), Array.from(input))
    }))

  it.effect("partition - collects successes and failures", () =>
    Effect.gen(function*() {
      const input = Chunk.range(0, 9)
      const transaction = pipe(input, STM.partition((n) => n % 2 === 0 ? STM.fail(n) : STM.succeed(n)))
      const [left, right] = yield* (STM.commit(transaction))
      deepStrictEqual(Array.from(left), [0, 2, 4, 6, 8])
      deepStrictEqual(Array.from(right), [1, 3, 5, 7, 9])
    }))

  it.effect("partition - evaluates effects in the correct order", () =>
    Effect.gen(function*() {
      const input = [2, 4, 6, 3, 5, 6]
      const transaction = STM.gen(function*() {
        const ref = yield* (TRef.make(Chunk.empty<number>()))
        yield* (pipe(input, STM.partition((n) => pipe(ref, TRef.update(Chunk.append(n))))))
        return yield* (TRef.get(ref))
      })
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(Array.from(result), input)
    }))

  it("reduce - with a successful step function sums the list properly", () =>
    fc.assert(fc.asyncProperty(fc.array(fc.integer()), async (array) => {
      const transaction = pipe(array, STM.reduce(0, (acc, curr) => STM.succeed(acc + curr)))
      const result = await Effect.runPromise(STM.commit(transaction))
      strictEqual(result, array.reduce((acc, curr) => acc + curr, 0))
    })))

  it("reduce - with a failing step function returns a failed transaction", () =>
    fc.assert(fc.asyncProperty(fc.array(fc.integer(), { minLength: 1 }), async (array) => {
      const transaction = pipe(array, STM.reduce(0, () => STM.fail("Ouch")))
      const result = await Effect.runPromise(Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.fail("Ouch"))
    })))

  it("reduce - run sequentially from left to right", () =>
    fc.assert(fc.asyncProperty(fc.array(fc.integer(), { minLength: 1 }), async (array) => {
      const transaction = pipe(
        array,
        STM.reduce(
          Chunk.empty<number>(),
          (acc, curr) => STM.succeed(pipe(acc, Chunk.append(curr)))
        )
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      deepStrictEqual(Array.from(result), array)
    })))

  it.effect("reduceAll", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        [2, 3, 4].map((n) => STM.succeed(n)),
        STM.reduceAll(STM.succeed(1), (a, b) => a + b)
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 10)
    }))

  it.effect("reduceAll - empty iterable", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        Chunk.empty<STM.STM<number>>(),
        STM.reduceAll(STM.succeed(1), (a, b) => a + b)
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1)
    }))

  it("reduceRight - with a successful step function sums the list properly", () =>
    fc.assert(fc.asyncProperty(fc.array(fc.integer()), async (array) => {
      const transaction = pipe(array, STM.reduceRight(0, (acc, curr) => STM.succeed(acc + curr)))
      const result = await Effect.runPromise(STM.commit(transaction))
      strictEqual(result, array.reduce((acc, curr) => acc + curr, 0))
    })))

  it("reduceRight - with a failing step function returns a failed transaction", () =>
    fc.assert(fc.asyncProperty(fc.array(fc.integer(), { minLength: 1 }), async (array) => {
      const transaction = pipe(array, STM.reduceRight(0, () => STM.fail("Ouch")))
      const result = await Effect.runPromise(Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.fail("Ouch"))
    })))

  it("reduceRight - run sequentially from right to left", () =>
    fc.assert(fc.asyncProperty(fc.array(fc.integer(), { minLength: 1 }), async (array) => {
      const transaction = pipe(
        array,
        STM.reduceRight(
          Chunk.empty<number>(),
          (acc, curr) => STM.succeed(pipe(acc, Chunk.prepend(curr)))
        )
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      deepStrictEqual(Array.from(result), array)
    })))

  it.effect("reject - doesnt collect value", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.succeed(0),
        STM.reject((n) => n !== 0 ? Option.some("Ouch") : Option.none())
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 0)
    }))

  it.effect("reject - returns failure ignoring value", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.succeed(1),
        STM.reject((n) => n !== 0 ? Option.some("Ouch") : Option.none())
      )
      const result = yield* (Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.fail("Ouch"))
    }))

  it.effect("rejectSTM - doesnt collect value", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.succeed(0),
        STM.rejectSTM((n) => n !== 0 ? Option.some(STM.succeed("Ouch")) : Option.none())
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 0)
    }))

  it.effect("rejectSTM - returns failure ignoring value", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.succeed(1),
        STM.rejectSTM((n) => n !== 0 ? Option.some(STM.succeed("Ouch")) : Option.none())
      )
      const result = yield* (Effect.exit(STM.commit(transaction)))
      deepStrictEqual(result, Exit.fail("Ouch"))
    }))

  it.effect("repeatWhile - runs effect while it satisfies predicate", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        TQueue.bounded<number>(5),
        STM.tap((queue) => pipe(queue, TQueue.offerAll([0, 0, 0, 1, 2]))),
        STM.flatMap((queue) =>
          pipe(
            TQueue.take(queue),
            STM.repeatWhile((n) => n === 0)
          )
        )
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1)
    }))

  it.effect("repeatUntil - runs effect until it satisfies predicate", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        TQueue.bounded<number>(5),
        STM.tap((queue) => pipe(queue, TQueue.offerAll([0, 0, 0, 1, 2]))),
        STM.flatMap((queue) =>
          pipe(
            TQueue.take(queue),
            STM.repeatUntil((n) => n === 1)
          )
        )
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1)
    }))

  it.effect("replicate - zero", () =>
    Effect.gen(function*() {
      const transaction = STM.all(STM.replicate(STM.succeed(12), 0))
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(Array.from(result), [])
    }))

  it.effect("replicate - negative", () =>
    Effect.gen(function*() {
      const transaction = STM.all(STM.replicate(STM.succeed(12), -1))
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(Array.from(result), [])
    }))

  it.effect("replicate - positive", () =>
    Effect.gen(function*() {
      const transaction = STM.all(STM.replicate(STM.succeed(12), 2))
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(Array.from(result), [12, 12])
    }))

  it.effect("some - extracts the value from Some", () =>
    Effect.gen(function*() {
      const transaction = STM.some(STM.succeed(Option.some(1)))
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1)
    }))

  it.effect("some - fails on None", () =>
    Effect.gen(function*() {
      const transaction = STM.some(STM.succeed(Option.none()))
      const result = yield* (Effect.exit(STM.commit(transaction)))
      assertFailure(result, Cause.fail(Option.none()))
    }))

  it.effect("some - fails on error", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("Ouch")
      const transaction = STM.some(STM.fail(error))
      const result = yield* (Effect.exit(STM.commit(transaction)))
      assertFailure(result, Cause.fail(Option.some(error)))
    }))

  it.effect("succeed", () =>
    Effect.gen(function*() {
      const result = yield* (STM.commit(STM.succeed("test")))
      strictEqual(result, "test")
    }))

  it.effect("gen with context", () =>
    STM.gen({ context: "Context" as const }, function*() {
      const result = yield* STM.succeed(this.context)
      strictEqual(result, "Context")
    }))

  it.effect("summarized - returns summary and value", () =>
    Effect.gen(function*() {
      const transaction = STM.gen(function*() {
        const ref = yield* (TRef.make(0))
        const increment = pipe(ref, TRef.updateAndGet((n) => n + 1))
        const result = yield* (pipe(
          increment,
          STM.summarized(increment, (before, after) => [before, after] as const)
        ))
        return [result[0][0], result[1], result[0][1]] as const
      })
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(result, [1, 2, 3])
    }))

  it.effect("tap - applies the function to the result preserving the original result", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        STM.all([TRef.make(10), TRef.make(0)]),
        STM.flatMap(([refA, refB]) =>
          STM.all({
            result1: pipe(TRef.get(refA), STM.tap((n) => pipe(refB, TRef.set(n + 1)))),
            result2: TRef.get(refB)
          })
        )
      )
      const { result1, result2 } = yield* (STM.commit(transaction))
      strictEqual(result1, 10)
      strictEqual(result2, 11)
    }))

  it.effect("tapBoth - applies the function to success values preserving the original result", () =>
    Effect.gen(function*() {
      const transaction = STM.gen(function*() {
        const tapSuccess = yield* (TDeferred.make<number>())
        const tapError = yield* (TDeferred.make<string>())
        const result = yield* (pipe(
          STM.succeed(42),
          STM.tapBoth({
            onFailure: (e: string) => pipe(tapError, TDeferred.succeed(e)),
            onSuccess: (n) => pipe(tapSuccess, TDeferred.succeed(n))
          })
        ))
        const success = yield* (TDeferred.await(tapSuccess))
        return [result, success] as const
      })
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(result, [42, 42])
    }))

  it.effect("tapBoth - applies the function to error values preserving the original error", () =>
    Effect.gen(function*() {
      const transaction = STM.gen(function*() {
        const tapSuccess = yield* (TDeferred.make<number>())
        const tapError = yield* (TDeferred.make<string>())
        const result = yield* (pipe(
          STM.fail("error"),
          STM.tapBoth({
            onFailure: (e) => pipe(tapError, TDeferred.succeed(e)),
            onSuccess: (n: number) => pipe(tapSuccess, TDeferred.succeed(n))
          }),
          STM.either
        ))
        const error = yield* (TDeferred.await(tapError))
        return [result, error] as const
      })
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(result, [Either.left("error"), "error"])
    }))

  it.effect("tapError - should apply the function to the error result preserving the original error", () =>
    Effect.gen(function*() {
      const transaction = STM.gen(function*() {
        const errorRef = yield* (TDeferred.make<string>())
        const result = yield* (pipe(
          STM.fail("error"),
          STM.zipRight(STM.succeed(0)),
          STM.tapError((e) => pipe(errorRef, TDeferred.succeed(e))),
          STM.either
        ))
        const error = yield* (TDeferred.await(errorRef))
        return [result, error]
      })
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(result, [Either.left("error"), "error"])
    }))

  it.effect("validateAll - returns all errors if never valid", () =>
    Effect.gen(function*() {
      const input = Array.from({ length: 10 }, () => 0)
      const transaction = pipe(input, STM.validateAll(STM.fail))
      const result = yield* (pipe(
        STM.commit(transaction),
        Effect.mapError((chunk) => Array.from(chunk)),
        Effect.exit
      ))
      deepStrictEqual(result, Exit.fail(input))
    }))

  it.effect("validateAll - accumulate errors and ignore successes", () =>
    Effect.gen(function*() {
      const input = Chunk.range(0, 9)
      const transaction = pipe(input, STM.validateAll((n) => n % 2 === 0 ? STM.succeed(n) : STM.fail(n)))
      const result = yield* (pipe(
        STM.commit(transaction),
        Effect.mapError((chunk) => Array.from(chunk)),
        Effect.exit
      ))
      deepStrictEqual(result, Exit.fail([1, 3, 5, 7, 9]))
    }))

  it.effect("validateAll - accumulate successes", () =>
    Effect.gen(function*() {
      const input = Array.from({ length: 10 }, () => 0)
      const transaction = pipe(input, STM.validateAll(STM.succeed))
      const result = yield* (pipe(
        STM.commit(transaction),
        Effect.map((chunk) => Array.from(chunk))
      ))
      deepStrictEqual(result, input)
    }))

  it.effect("validateFirst - returns all errors if never valid", () =>
    Effect.gen(function*() {
      const input = Array.from({ length: 10 }, () => 0)
      const transaction = pipe(input, STM.validateFirst(STM.fail))
      const result = yield* (pipe(
        STM.commit(transaction),
        Effect.mapError((chunk) => Array.from(chunk)),
        Effect.exit
      ))
      deepStrictEqual(result, Exit.fail(input))
    }))

  it.effect("validateFirst - runs sequentially and short circuits on first success validation", () =>
    Effect.gen(function*() {
      const input = Chunk.range(1, 9)
      const f = (n: number) => n === 6 ? STM.succeed(n) : STM.fail(n)
      const transaction = STM.gen(function*() {
        const ref = yield* (TRef.make(0))
        const result = yield* (pipe(
          input,
          STM.validateFirst((n) => pipe(ref, TRef.update((n) => n + 1), STM.zipRight(f(n))))
        ))
        const counter = yield* (TRef.get(ref))
        return [result, counter] as const
      })
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(result, [6, 6])
    }))

  it.effect("validateFirst - returns errors in correct order", () =>
    Effect.gen(function*() {
      const input = [2, 4, 6, 3, 5, 6]
      const transaction = pipe(input, STM.validateFirst(STM.fail))
      const result = yield* (pipe(
        STM.commit(transaction),
        Effect.mapError((chunk) => Array.from(chunk)),
        Effect.exit
      ))
      deepStrictEqual(result, Exit.fail(input))
    }))

  it.effect("when - true", () =>
    Effect.gen(function*() {
      const ref = yield* (TRef.make(false))
      const transaction = pipe(
        ref,
        TRef.set(true),
        STM.when(constTrue),
        STM.zipRight(TRef.get(ref))
      )
      const result = yield* (STM.commit(transaction))
      assertTrue(result)
    }))

  it.effect("when - false", () =>
    Effect.gen(function*() {
      const ref = yield* (TRef.make(false))
      const transaction = pipe(
        ref,
        TRef.set(true),
        STM.when(constFalse),
        STM.zipRight(TRef.get(ref))
      )
      const result = yield* (STM.commit(transaction))
      assertFalse(result)
    }))

  it.effect("whenSTM - true", () =>
    Effect.gen(function*() {
      const ref = yield* (TRef.make(0))
      const isZero = pipe(TRef.get(ref), STM.map((n) => n === 0))
      const transaction = pipe(
        ref,
        TRef.update((n) => n + 1),
        STM.whenSTM(isZero),
        STM.zipRight(TRef.get(ref))
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 1)
    }))

  it.effect("whenSTM - false", () =>
    Effect.gen(function*() {
      const ref = yield* (TRef.make(0))
      const isZero = pipe(TRef.get(ref), STM.map((n) => n !== 0))
      const transaction = pipe(
        ref,
        TRef.update((n) => n + 1),
        STM.whenSTM(isZero),
        STM.zipRight(TRef.get(ref))
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 0)
    }))

  it.effect("zip - return a tuple of two computations", () =>
    Effect.gen(function*() {
      const transaction = pipe(STM.succeed(1), STM.zip(STM.succeed("A")))
      const result = yield* (STM.commit(transaction))
      deepStrictEqual(result, [1, "A"])
    }))

  it.effect("zipWith - perform an action on two computations", () =>
    Effect.gen(function*() {
      const transaction = pipe(STM.succeed(578), STM.zipWith(STM.succeed(2), (a, b) => a + b))
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 580)
    }))

  it.effect("stack-safety - long orElse chains", () =>
    Effect.gen(function*() {
      const transaction = STM.gen(function*() {
        const ref = yield* (TRef.make(0))
        const value = yield* (STM.loop(10_000, {
          while: (n) => n > 0,
          step: (n) => n - 1,
          body: () =>
            pipe(
              STM.retry,
              STM.orTry(() => pipe(ref, TRef.getAndUpdate((n) => n + 1)))
            ),
          discard: true
        }))
        strictEqual(value, void 0)
        return yield* (TRef.get(ref))
      })
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 10_000)
    }))

  it.effect("stack-safety - long map chains", () =>
    Effect.gen(function*() {
      const result = yield* (chain(10_000)(STM.map((n) => n + 1)))
      strictEqual(result, 10_000)
    }))

  it.effect("stack-safety - long collect chains", () =>
    Effect.gen(function*() {
      const result = yield* (chain(10_000)(STM.collect((n) => Option.some(n + 1))))
      strictEqual(result, 10_000)
    }))

  it.effect("stack-safety - long collectSTM chains", () =>
    Effect.gen(function*() {
      const result = yield* (chain(10_000)(STM.collectSTM((n) => Option.some(STM.succeed(n + 1)))))
      strictEqual(result, 10_000)
    }))

  it.effect("stack-safety - long flatMap chains", () =>
    Effect.gen(function*() {
      const result = yield* (chain(10_000)(STM.flatMap((n) => STM.succeed(n + 1))))
      strictEqual(result, 10_000)
    }))

  it.effect("stack-safety - long fold chains", () =>
    Effect.gen(function*() {
      const result = yield* (chain(10_000)(STM.match({ onFailure: () => 0, onSuccess: (n) => n + 1 })))
      strictEqual(result, 10_000)
    }))

  it.effect("stack-safety - long foldSTM chains", () =>
    Effect.gen(function*() {
      const result = yield* (
        chain(10_000)(STM.matchSTM({ onFailure: () => STM.succeed(0), onSuccess: (n) => STM.succeed(n + 1) }))
      )
      strictEqual(result, 10_000)
    }))

  it.effect("stack-safety - long mapError chains", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.exit(chainError(10_000)))
      deepStrictEqual(result, Exit.fail(10_000))
    }))

  it.effect("stack-safety - long orElse chains", () =>
    Effect.gen(function*() {
      const transaction = pipe(
        TRef.make(0),
        STM.tap((ref) =>
          STM.loop(10_000, {
            while: (n) => n > 0,
            step: (n) => n - 1,
            body: () => pipe(STM.retry, STM.orElse(() => pipe(ref, TRef.getAndUpdate((n) => n + 1)))),
            discard: true
          })
        ),
        STM.flatMap(TRef.get)
      )
      const result = yield* (STM.commit(transaction))
      strictEqual(result, 10_000)
    }))

  it.effect("stack-safety - long provideEnvironment chains", () =>
    Effect.gen(function*() {
      const result = yield* (chain(10_000)(STM.provideContext(Context.empty())))
      strictEqual(result, 0)
    }))

  it.effect("ZIO STM (Issue #2073)", () =>
    Effect.gen(function*() {
      const ref0 = yield* (TRef.make(0))
      const ref1 = yield* (TRef.make(0))
      const fiber = yield* (pipe(
        TRef.get(ref0),
        STM.flatMap((value0) =>
          pipe(
            TRef.get(ref1),
            STM.map((value1) => value0 + value1)
          )
        ),
        STM.commit,
        Effect.fork
      ))
      yield* (pipe(
        ref0,
        TRef.update((n) => n + 1),
        STM.flatMap(() => pipe(ref1, TRef.update((n) => n + 1))),
        STM.commit
      ))
      const result = yield* (Fiber.join(fiber))
      assertTrue(result === 0 || result === 2)
    }))

  describe("concurrent computations", () => {
    it.effect("increment `TRef` 100 times in 100 fibers", () =>
      Effect.gen(function*() {
        const ref = yield* (TRef.make(0))
        const fiber = yield* (Effect.forkAll(
          Array.from({ length: 10 }, () => incrementTRefN(99, ref))
        ))
        yield* (Fiber.join(fiber))
        const result = yield* (TRef.get(ref))
        strictEqual(result, 1_000)
      }))

    it.effect("compute a `TRef` from 2 variables, increment the first `TRef` and decrement the second `TRef` in different fibers", () =>
      Effect.gen(function*() {
        const refs = yield* (STM.all([TRef.make(10_000), TRef.make(0), TRef.make(0)]))
        const fiber = yield* (Effect.forkAll(
          Array.from({ length: 10 }, () => compute3TRefN(99, refs[0], refs[1], refs[2]))
        ))
        yield* (Fiber.join(fiber))
        const result = yield* (TRef.get(refs[2]))
        strictEqual(result, 10_000)
      }))
  })

  it.effect("condition locks - resume directly when the condition is already satisfied", () =>
    Effect.gen(function*() {
      const ref1 = yield* (TRef.make(10))
      const ref2 = yield* (TRef.make("failed"))
      const result = yield* (pipe(
        TRef.get(ref1),
        STM.tap((n) => STM.check(() => n > 0)),
        STM.tap(() => pipe(ref2, TRef.set("success"))),
        STM.zipRight(TRef.get(ref2)),
        STM.commit
      ))
      strictEqual(result, "success")
    }))

  it.effect("condition locks - resume directly when the condition is already satisfied and change the ref with non-satisfying value", () =>
    Effect.gen(function*() {
      const ref = yield* (TRef.make(42))
      const result = yield* (pipe(
        TRef.get(ref),
        STM.retryUntil((n) => n === 42),
        STM.commit
      ))
      yield* (pipe(ref, TRef.set(9), STM.commit))
      const value = yield* (TRef.get(ref))
      strictEqual(result, 42)
      strictEqual(value, 9)
    }))

  it.effect("condition locks - resume after satisfying the condition", () => {
    const barrier = new UnpureBarrier()
    return Effect.gen(function*() {
      const done = yield* (Deferred.make<void>())
      const ref1 = yield* (TRef.make(0))
      const ref2 = yield* (TRef.make("failed"))
      const transaction = pipe(
        TRef.get(ref1),
        STM.tap(() => STM.sync(() => barrier.open())),
        STM.tap((n) => STM.check(() => n > 42)),
        STM.tap(() => pipe(ref2, TRef.set("success"))),
        STM.zipRight(TRef.get(ref2))
      )
      const fiber = yield* (pipe(
        STM.commit(transaction),
        Effect.zipLeft(pipe(done, Deferred.succeed<void>(void 0))),
        Effect.fork
      ))
      yield* (barrier.await())
      const oldValue = yield* (TRef.get(ref2))
      yield* (pipe(ref1, TRef.set(43)))
      yield* (Deferred.await(done))
      const newValue = yield* (TRef.get(ref2))
      const result = yield* (Fiber.join(fiber))
      strictEqual(oldValue, "failed")
      strictEqual(newValue, result)
    })
  })

  it.effect("condition locks - resume directly when the condition is already satisfied", () =>
    Effect.gen(function*() {
      const sender = yield* (TRef.make(100))
      const receiver = yield* (TRef.make(0))
      yield* (Effect.fork(transfer(receiver, sender, 150)))
      yield* (pipe(sender, TRef.update((n) => n + 100)))
      yield* (pipe(TRef.get(sender), STM.retryUntil((n) => n === 50)))
      const senderValue = yield* (TRef.get(sender))
      const receiverValue = yield* (TRef.get(receiver))
      strictEqual(senderValue, 50)
      strictEqual(receiverValue, 150)
    }))

  it.effect("condition locks - run both transactions sequentially", () =>
    Effect.gen(function*() {
      const sender = yield* (TRef.make(100))
      const receiver = yield* (TRef.make(0))
      const toReceiver = transfer(receiver, sender, 150)
      const toSender = transfer(sender, receiver, 150)
      const fiber = yield* (pipe(
        Array.from({ length: 10 }, () => pipe(toReceiver, Effect.zipRight(toSender))),
        Effect.forkAll()
      ))
      yield* (pipe(sender, TRef.update((n) => n + 50)))
      yield* (Fiber.join(fiber))
      const senderValue = yield* (TRef.get(sender))
      const receiverValue = yield* (TRef.get(receiver))
      strictEqual(senderValue, 150)
      strictEqual(receiverValue, 0)
    }))

  it.effect("condition locks - run both transactions concurrently #1", () =>
    Effect.gen(function*() {
      const sender = yield* (TRef.make(50))
      const receiver = yield* (TRef.make(0))
      const toReceiver = transfer(receiver, sender, 100)
      const toSender = transfer(sender, receiver, 100)
      const fiber1 = yield* (pipe(
        Array.from({ length: 10 }, () => toReceiver),
        Effect.forkAll()
      ))
      const fiber2 = yield* (pipe(
        Array.from({ length: 10 }, () => toSender),
        Effect.forkAll()
      ))
      yield* (pipe(sender, TRef.update((n) => n + 50)))
      yield* (Fiber.join(fiber1))
      yield* (Fiber.join(fiber2))
      const senderValue = yield* (TRef.get(sender))
      const receiverValue = yield* (TRef.get(receiver))
      strictEqual(senderValue, 100)
      strictEqual(receiverValue, 0)
    }))

  it.effect("condition locks - run both transactions concurrently #2", () =>
    Effect.gen(function*() {
      const sender = yield* (TRef.make(50))
      const receiver = yield* (TRef.make(0))
      const toReceiver = pipe(transfer(receiver, sender, 100), Effect.repeatN(9))
      const toSender = pipe(transfer(sender, receiver, 100), Effect.repeatN(9))
      const fiber = yield* (pipe(toReceiver, Effect.zip(toSender, { concurrent: true }), Effect.fork))
      yield* (pipe(sender, TRef.update((n) => n + 50)))
      yield* (Fiber.join(fiber))
      const senderValue = yield* (TRef.get(sender))
      const receiverValue = yield* (TRef.get(receiver))
      strictEqual(senderValue, 100)
      strictEqual(receiverValue, 0)
    }))

  it.effect("condition locks - atomically run a transaction with a TRef for 20 fibers, each one checking and incrementing the value", () =>
    Effect.gen(function*() {
      const ref = yield* (TRef.make(1))
      const fiber = yield* (pipe(
        Chunk.range(1, 20),
        Chunk.map((i) =>
          pipe(
            TRef.get(ref),
            STM.tap((n) => STM.check(() => n === i)),
            STM.tap(() => pipe(ref, TRef.update((n) => n + 1))),
            STM.commit
          )
        ),
        Effect.forkAll()
      ))
      yield* (Fiber.join(fiber))
      const result = yield* (TRef.get(ref))
      strictEqual(result, 21)
    }))

  it.effect("condition locks - atomically run a transaction that could not be satisfied", () => {
    const barrier = new UnpureBarrier()
    return Effect.gen(function*() {
      const ref = yield* (TRef.make(0))
      const fiber = yield* (pipe(
        TRef.get(ref),
        STM.tap(() => STM.sync(() => barrier.open())),
        STM.tap((n) => STM.check(() => n > 0)),
        STM.tap(() => pipe(ref, TRef.update((n) => Math.floor(10 / n)))),
        STM.commit,
        Effect.fork
      ))
      yield* (barrier.await())
      yield* (Fiber.interrupt(fiber))
      yield* (pipe(ref, TRef.set(10)))
      const result = yield* (pipe(Effect.yieldNow(), Effect.zipRight(TRef.get(ref))))
      strictEqual(result, 10)
    })
  })

  it.effect("condition locks - interrupt one fiber executing a transaction should terminate all transactions", () => {
    const barrier = new UnpureBarrier()
    return Effect.gen(function*() {
      const ref = yield* (TRef.make(0))
      const fiber = yield* (pipe(
        Array.from({ length: 100 }, () =>
          pipe(
            TRef.get(ref),
            STM.tap(() => STM.sync(() => barrier.open())),
            STM.tap((n) => STM.check(() => n < 0)),
            STM.tap(() => pipe(ref, TRef.set(10))),
            STM.commit
          )),
        Effect.forkAll()
      ))
      yield* (barrier.await())
      yield* (Fiber.interrupt(fiber))
      yield* (pipe(ref, TRef.set(-1)))
      const result = yield* (pipe(Effect.yieldNow(), Effect.zipRight(TRef.get(ref))))
      strictEqual(result, -1)
    })
  })

  it.effect("condition locks - interrupt fiber and observe it", () =>
    Effect.gen(function*() {
      const fiberId = yield* (Effect.fiberId)
      const ref = yield* (TRef.make(1))
      const fiber = yield* (pipe(
        TRef.get(ref),
        STM.flatMap((n) => STM.check(() => n === 0)),
        STM.commit,
        Effect.fork
      ))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (pipe(Fiber.join(fiber), Effect.sandbox, Effect.either))
      assertTrue(
        Either.isLeft(result) &&
          pipe(
            result.left,
            Cause.contains(Cause.interrupt(fiberId))
          )
      )
    }))

  it.effect("permutations - permutes two variables", () =>
    Effect.gen(function*() {
      const ref1 = yield* (TRef.make(1))
      const ref2 = yield* (TRef.make(2))
      yield* (permutation(ref1, ref2))
      const result1 = yield* (TRef.get(ref1))
      const result2 = yield* (TRef.get(ref2))
      strictEqual(result1, 2)
      strictEqual(result2, 1)
    }))

  it.effect("permutations - permutes two variables in 100 fibers", () =>
    Effect.gen(function*() {
      const ref1 = yield* (TRef.make(1))
      const ref2 = yield* (TRef.make(2))
      const oldValue1 = yield* (TRef.get(ref1))
      const oldValue2 = yield* (TRef.get(ref2))
      const fiber = yield* (pipe(
        Array.from({ length: 100 }, () => STM.commit(permutation(ref1, ref2))),
        Effect.forkAll()
      ))
      yield* (Fiber.join(fiber))
      const result1 = yield* (TRef.get(ref1))
      const result2 = yield* (TRef.get(ref2))
      strictEqual(result1, oldValue1)
      strictEqual(result2, oldValue2)
    }))
})
