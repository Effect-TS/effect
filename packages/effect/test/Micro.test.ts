import { Cause, Context, Effect, Either, Exit, Fiber, Micro, Option, pipe } from "effect"
import { assert, describe, it } from "effect/test/utils/extend"

class ATag extends Context.Tag("ATag")<ATag, "A">() {}
class TestError extends Micro.TaggedError("TestError") {}

describe.concurrent("Micro", () => {
  describe("tracing", () => {
    it.effect("Micro.TaggedError", () =>
      Micro.gen(function*() {
        const error = yield* new TestError().pipe(Micro.flip)
        assert.deepStrictEqual(error, new TestError())
        assert.include(error.stack, "Micro.test.ts:11")
      }))

    it.effect("withTrace", () =>
      Micro.gen(function*() {
        const error = yield* Micro.fail("boom").pipe(
          Micro.withTrace("test trace"),
          Micro.sandbox,
          Micro.flip
        )
        assert.include(error.stack, "at test trace")
        assert.include(error.stack, "Micro.test.ts:19")
      }))
  })

  it("runPromise", async () => {
    const result = await Micro.runPromise(Micro.succeed(1))
    assert.strictEqual(result, 1)
  })

  it("acquireUseRelease interrupt", async () => {
    let acquire = false
    let use = false
    let release = false
    const fiber = Micro.acquireUseRelease(
      Micro.sync(() => {
        acquire = true
        return 123
      }).pipe(Micro.delay(100)),
      () =>
        Micro.sync(() => {
          use = true
        }),
      (_) =>
        Micro.sync(() => {
          assert.strictEqual(_, 123)
          release = true
        })
    ).pipe(Micro.runFork)
    fiber.unsafeInterrupt()
    const result = await Micro.runPromise(Micro.fiberAwait(fiber))
    assert.deepStrictEqual(result, Micro.exitInterrupt)
    assert.isTrue(acquire)
    assert.isFalse(use)
    assert.isTrue(release)
  })

  it("acquireUseRelease uninterruptible", async () => {
    let acquire = false
    let use = false
    let release = false
    const fiber = Micro.acquireUseRelease(
      Micro.sync(() => {
        acquire = true
        return 123
      }).pipe(Micro.delay(100)),
      (_) =>
        Micro.sync(() => {
          use = true
          return _
        }),
      (_) =>
        Micro.sync(() => {
          assert.strictEqual(_, 123)
          release = true
        })
    ).pipe(Micro.uninterruptible, Micro.runFork)
    fiber.unsafeInterrupt()
    const result = await Micro.runPromise(Micro.fiberAwait(fiber))
    assert.deepStrictEqual(result, Micro.exitInterrupt)
    assert.isTrue(acquire)
    assert.isTrue(use)
    assert.isTrue(release)
  })

  it("Context.Tag", () =>
    Micro.service(ATag).pipe(
      Micro.tap((_) => Micro.sync(() => assert.strictEqual(_, "A"))),
      Micro.provideService(ATag, "A"),
      Micro.runPromise
    ))

  describe("fromOption", () => {
    it("from a some", () =>
      Option.some("A").pipe(
        Micro.fromOption,
        Micro.tap((_) => assert.strictEqual(_, "A")),
        Micro.runPromise
      ))

    it("from a none", () =>
      Option.none().pipe(
        Micro.fromOption,
        Micro.flip,
        Micro.tap((error) => assert.ok(error instanceof Micro.NoSuchElementException)),
        Micro.runPromise
      ))
  })

  describe("fromEither", () => {
    it("from a right", () =>
      Either.right("A").pipe(
        Micro.fromEither,
        Micro.tap((_) => Micro.sync(() => assert.strictEqual(_, "A"))),
        Micro.runPromise
      ))

    it("from a left", () =>
      Either.left("error").pipe(
        Micro.fromEither,
        Micro.flip,
        Micro.tap((error) => Micro.sync(() => assert.strictEqual(error, "error"))),
        Micro.runPromise
      ))
  })

  describe("gen", () => {
    it("gen", () =>
      Micro.gen(function*() {
        const result = yield* Micro.succeed(1)
        assert.strictEqual(result, 1)
        return result
      }).pipe(Micro.runPromise).then((_) => assert.deepStrictEqual(_, 1)))

    it("gen with context", () =>
      Micro.gen({ a: 1, b: 2 }, function*() {
        const result = yield* Micro.succeed(this.a)
        assert.strictEqual(result, 1)
        return result + this.b
      }).pipe(Micro.runPromise).then((_) => assert.deepStrictEqual(_, 3)))
  })

  describe("forEach", () => {
    it("sequential", () =>
      Micro.gen(function*() {
        const results = yield* Micro.forEach([1, 2, 3], (_) => Micro.succeed(_))
        assert.deepStrictEqual(results, [1, 2, 3])
      }).pipe(Micro.runPromise))

    it("unbounded", () =>
      Micro.gen(function*() {
        const results = yield* Micro.forEach([1, 2, 3], (_) => Micro.succeed(_), { concurrency: "unbounded" })
        assert.deepStrictEqual(results, [1, 2, 3])
      }).pipe(Micro.runPromise))

    it("bounded", () =>
      Micro.gen(function*() {
        const results = yield* Micro.forEach([1, 2, 3, 4, 5], (_) => Micro.succeed(_), { concurrency: 2 })
        assert.deepStrictEqual(results, [1, 2, 3, 4, 5])
      }).pipe(Micro.runPromise))

    it("inherit unbounded", () =>
      Micro.gen(function*() {
        const handle = yield* Micro.forEach([1, 2, 3], (_) => Micro.succeed(_).pipe(Micro.delay(50)), {
          concurrency: "inherit"
        }).pipe(
          Micro.withConcurrency("unbounded"),
          Micro.fork
        )
        yield* Micro.sleep(90)
        assert.deepStrictEqual(handle.unsafePoll(), Micro.exitSucceed([1, 2, 3]))
      }).pipe(Micro.runPromise))

    it("sequential interrupt", () =>
      Micro.gen(function*() {
        const done: Array<number> = []
        const fiber = yield* Micro.forEach([1, 2, 3, 4, 5, 6], (i) =>
          Micro.sync(() => {
            done.push(i)
            return i
          }).pipe(Micro.delay(300))).pipe(Micro.fork)
        yield* Micro.sleep(800)
        yield* Micro.fiberInterrupt(fiber)
        const result = yield* Micro.fiberAwait(fiber)
        assert.deepStrictEqual(result, Micro.exitInterrupt)
        assert.deepStrictEqual(done, [1, 2])
      }).pipe(Micro.runPromise))

    it("unbounded interrupt", () =>
      Micro.gen(function*() {
        const done: Array<number> = []
        const fiber = yield* Micro.forEach([1, 2, 3], (i) =>
          Micro.sync(() => {
            done.push(i)
            return i
          }).pipe(Micro.delay(150)), { concurrency: "unbounded" }).pipe(Micro.fork)
        yield* Micro.sleep(50)
        yield* Micro.fiberInterrupt(fiber)
        const result = yield* Micro.fiberAwait(fiber)
        assert.deepStrictEqual(result, Micro.exitInterrupt)
        assert.deepStrictEqual(done, [])
      }).pipe(Micro.runPromise))

    it("bounded interrupt", () =>
      Micro.gen(function*() {
        const done: Array<number> = []
        const fiber = yield* Micro.forEach([1, 2, 3, 4, 5, 6], (i) =>
          Micro.sync(() => {
            done.push(i)
            return i
          }).pipe(Micro.delay(200)), { concurrency: 2 }).pipe(Micro.fork)
        yield* Micro.sleep(350)
        yield* Micro.fiberInterrupt(fiber)
        const result = yield* Micro.fiberAwait(fiber)
        assert.deepStrictEqual(result, Micro.exitInterrupt)
        assert.deepStrictEqual(done, [1, 2])
      }).pipe(Micro.runPromise))

    it("unbounded fail", () =>
      Micro.gen(function*() {
        const done: Array<number> = []
        const handle = yield* Micro.forEach([1, 2, 3, 4, 5], (i) =>
          Micro.suspend(() => {
            done.push(i)
            return i === 3 ? Micro.fail("error") : Micro.succeed(i)
          }).pipe(Micro.delay(i * 100)), {
          concurrency: "unbounded"
        }).pipe(Micro.fork)
        const result = yield* Micro.fiberAwait(handle)
        assert.deepStrictEqual(result, Micro.exitFail("error"))
        assert.deepStrictEqual(done, [1, 2, 3])
      }).pipe(Micro.runPromise))

    it("length = 0", () =>
      Micro.gen(function*() {
        const results = yield* Micro.forEach([], (_) => Micro.succeed(_))
        assert.deepStrictEqual(results, [])
      }).pipe(Micro.runPromise))
  })

  describe("all", () => {
    it("tuple", () =>
      Micro.gen(function*() {
        const results = (yield* Micro.all([
          Micro.succeed(1),
          Micro.succeed(2),
          Micro.succeed(3)
        ])) satisfies [
          number,
          number,
          number
        ]
        assert.deepStrictEqual(results, [1, 2, 3])
      }).pipe(Micro.runPromise))

    it("record", () =>
      Micro.gen(function*() {
        const results = (yield* Micro.all({
          a: Micro.succeed(1),
          b: Micro.succeed("2"),
          c: Micro.succeed(true)
        })) satisfies {
          a: number
          b: string
          c: boolean
        }
        assert.deepStrictEqual(results, {
          a: 1,
          b: "2",
          c: true
        })
      }).pipe(Micro.runPromise))

    it.effect("record discard", () =>
      Micro.gen(function*() {
        const results = (yield* Micro.all({
          a: Micro.succeed(1),
          b: Micro.succeed("2"),
          c: Micro.succeed(true)
        }, { discard: true })) satisfies void
        assert.deepStrictEqual(results, void 0)
      }))

    it.effect("iterable", () =>
      Micro.gen(function*() {
        const results = (yield* Micro.all(
          new Set([
            Micro.succeed(1),
            Micro.succeed(2),
            Micro.succeed(3)
          ])
        )) satisfies Array<number>
        assert.deepStrictEqual(results, [1, 2, 3])
      }))
  })

  describe("filter", () => {
    it.live("odd numbers", () =>
      Micro.gen(function*() {
        const results = yield* Micro.filter([1, 2, 3, 4, 5], (_) => Micro.succeed(_ % 2 === 1))
        assert.deepStrictEqual(results, [1, 3, 5])
      }))

    it.live("iterable", () =>
      Micro.gen(function*() {
        const results = yield* Micro.filter(new Set([1, 2, 3, 4, 5]), (_) => Micro.succeed(_ % 2 === 1))
        assert.deepStrictEqual(results, [1, 3, 5])
      }))
  })

  describe("acquireRelease", () => {
    it("releases on interrupt", () =>
      Micro.gen(function*() {
        let release = false
        const fiber = yield* Micro.acquireRelease(
          Micro.delay(Micro.succeed("foo"), 100),
          () =>
            Micro.sync(() => {
              release = true
            })
        ).pipe(Micro.scoped, Micro.fork)
        yield* Micro.yieldFlush
        fiber.unsafeInterrupt()
        yield* Micro.fiberAwait(fiber)
        assert.strictEqual(release, true)
      }).pipe(Micro.runPromise))
  })

  it.effect("raceAll", () =>
    Micro.gen(function*() {
      const interrupted: Array<number> = []
      const result = yield* Micro.raceAll([500, 300, 200, 0, 100].map((ms) =>
        (ms === 0 ? Micro.fail("boom") : Micro.succeed(ms)).pipe(
          Micro.delay(ms),
          Micro.onInterrupt(
            Micro.sync(() => {
              interrupted.push(ms)
            })
          )
        )
      ))
      assert.strictEqual(result, 100)
      assert.deepStrictEqual(interrupted, [500, 300, 200])
    }))

  it("raceAllFirst", () =>
    Micro.gen(function*() {
      const interrupted: Array<number> = []
      const result = yield* Micro.raceAllFirst([500, 300, 200, 0, 100].map((ms) =>
        (ms === 0 ? Micro.fail("boom") : Micro.succeed(ms)).pipe(
          Micro.delay(ms),
          Micro.onInterrupt(
            Micro.sync(() => {
              interrupted.push(ms)
            })
          )
        )
      )).pipe(Micro.exit)
      assert.deepStrictEqual(result, Micro.exitFail("boom"))
      assert.deepStrictEqual(interrupted, [500, 300, 200, 100])
    }).pipe(Micro.runPromise))

  describe("valid Effect", () => {
    it.effect("success", () =>
      Effect.gen(function*() {
        const result = yield* Micro.succeed(123)
        assert.strictEqual(result, 123)
      }))

    it.effect("failure", () =>
      Effect.gen(function*() {
        const result = yield* Micro.fail("boom").pipe(
          Effect.sandbox,
          Effect.flip
        )
        assert.deepStrictEqual(result, Cause.fail("boom"))
      }))

    it.effect("defects", () =>
      Effect.gen(function*() {
        const result = yield* Micro.die("boom").pipe(
          Effect.sandbox,
          Effect.flip
        )
        assert.deepStrictEqual(result, Cause.die("boom"))
      }))

    it.effect("context", () =>
      Effect.gen(function*() {
        const result = yield* Micro.service(ATag).pipe(
          Micro.map((_) => _)
        )
        assert.deepStrictEqual(result, "A")
      }).pipe(Effect.provideService(ATag, "A")))

    it.effect("interruption", () =>
      Effect.gen(function*() {
        const fiber = yield* Micro.never.pipe(
          Effect.fork
        )
        yield* Effect.yieldNow()
        yield* Fiber.interrupt(fiber)
        const exit = yield* fiber.await
        assert.isTrue(Exit.isInterrupted(exit))
      }))
  })

  describe("repeat", () => {
    it.effect("is stack safe", () =>
      Micro.void.pipe(
        Micro.repeat({ times: 10000 })
      ))

    it.effect("is interruptible", () =>
      Micro.void.pipe(
        Micro.forever,
        Micro.timeoutOption(50)
      ))

    it("works with runSync", () => {
      const result = Micro.succeed(123).pipe(
        Micro.repeat({ times: 1000 }),
        Micro.runSync
      )
      assert.deepStrictEqual(result, 123)
    })

    it.effect("scheduleRecurs", () =>
      Micro.gen(function*() {
        let count = 0
        yield* Micro.sync(() => count++).pipe(
          Micro.repeat({
            schedule: Micro.scheduleRecurs(3)
          })
        )
        assert.deepStrictEqual(count, 4)
      }))
  })

  describe("retry", () => {
    it.live("nothing on success", () =>
      Micro.gen(function*() {
        let count = 0
        yield* Micro.sync(() => count++).pipe(
          Micro.retry({ times: 10000 })
        )
        assert.strictEqual(count, 1)
      }))

    it.effect("initial + retries", () =>
      Micro.gen(function*() {
        let count = 0
        const error = yield* Micro.failSync(() => ++count).pipe(
          Micro.retry({ times: 2 }),
          Micro.flip
        )
        assert.strictEqual(error, 3)
      }))

    it.effect("predicate", () =>
      Micro.gen(function*() {
        let count = 0
        const error = yield* Micro.failSync(() => ++count).pipe(
          Micro.retry({ while: (i) => i < 3 }),
          Micro.flip
        )
        assert.strictEqual(error, 3)
      }))
  })

  describe("timeoutOption", () => {
    it.live("timeout a long computation", () =>
      Micro.gen(function*() {
        const result = yield* pipe(
          Micro.sleep(60_000),
          Micro.andThen(Micro.succeed(true)),
          Micro.timeoutOption(10)
        )
        assert.deepStrictEqual(result, Option.none())
      }))
    it.live("timeout a long computation with a failure", () =>
      Micro.gen(function*() {
        const error = new Error("boom")
        const result = yield* pipe(
          Micro.sleep(5000),
          Micro.andThen(Micro.succeed(true)),
          Micro.timeoutOrElse({
            onTimeout: () => Micro.die(error),
            duration: 10
          }),
          Micro.sandbox,
          Micro.flip
        )
        assert.deepStrictEqual(result, Micro.causeDie(error))
      }))
    it.effect("timeout repetition of uninterruptible effect", () =>
      Micro.gen(function*() {
        const result = yield* pipe(
          Micro.void,
          Micro.uninterruptible,
          Micro.forever,
          Micro.timeoutOption(10)
        )
        assert.deepStrictEqual(result, Option.none())
      }))
    it.effect("timeout in uninterruptible region", () =>
      Micro.gen(function*() {
        yield* Micro.void.pipe(Micro.timeoutOption(20_000), Micro.uninterruptible)
      }), { timeout: 1000 })
  })

  describe("timeout", () => {
    it.live("timeout a long computation", () =>
      Micro.gen(function*() {
        const result = yield* pipe(
          Micro.sleep(60_000),
          Micro.andThen(Micro.succeed(true)),
          Micro.timeout(10),
          Micro.flip
        )
        assert.deepStrictEqual(result, new Micro.TimeoutException())
      }))
  })

  describe("Error", () => {
    class TestError extends Micro.Error {}

    it.effect("is yieldable", () =>
      Micro.gen(function*() {
        const error = yield* new TestError().pipe(Micro.flip)
        assert.deepStrictEqual(error, new TestError())
      }))

    it.effect("is a valid Effect", () =>
      Effect.gen(function*() {
        const error = yield* new TestError().pipe(Effect.flip)
        assert.deepStrictEqual(error, new TestError())
      }))
  })

  describe("TaggedError", () => {
    it.effect("is a valid Effect", () =>
      Effect.gen(function*() {
        const error = yield* new TestError().pipe(Effect.flip)
        assert.deepStrictEqual(error, new TestError())
      }))

    it.effect("has a _tag", () =>
      Micro.gen(function*() {
        const result = yield* new TestError().pipe(
          Micro.catchTag("TestError", (_) => Micro.succeed(true))
        )
        assert.strictEqual(result, true)
      }))
  })

  describe("failure rendering", () => {
    it.effect("renders non-error defects", () =>
      Micro.gen(function*() {
        const failure = yield* Micro.die({ some: "error" }).pipe(
          Micro.withTrace("test trace"),
          Micro.sandbox,
          Micro.flip
        )
        assert.strictEqual(failure.name, "MicroCause.Die")
        assert.strictEqual(failure.message, JSON.stringify({ some: "error" }))
        assert.include(failure.stack, `MicroCause.Die: ${JSON.stringify({ some: "error" })}`)
        assert.include(failure.stack, "at test trace (")
      }))

    it.effect("renders non-errors", () =>
      Micro.gen(function*() {
        const failure = yield* Micro.fail({ some: "error" }).pipe(
          Micro.withTrace("test trace"),
          Micro.sandbox,
          Micro.flip
        )
        assert.strictEqual(failure.name, "MicroCause.Fail")
        assert.strictEqual(failure.message, JSON.stringify({ some: "error" }))
        assert.include(failure.stack, `MicroCause.Fail: ${JSON.stringify({ some: "error" })}`)
        assert.include(failure.stack, "at test trace (")
      }))

    it.effect("renders errors", () =>
      Micro.gen(function*() {
        const failure = yield* Micro.fail(new Error("boom")).pipe(
          Micro.withTrace("test trace"),
          Micro.sandbox,
          Micro.flip
        )
        assert.strictEqual(failure.name, "(MicroCause.Fail) Error")
        assert.strictEqual(failure.message, "boom")
        assert.include(failure.stack, `(MicroCause.Fail) Error: boom`)
        assert.include(failure.stack, "at test trace (")
      }))
  })

  describe("interruption", () => {
    it.effect("sync forever is interruptible", () =>
      Micro.gen(function*() {
        const fiber = yield* pipe(Micro.succeed(1), Micro.forever, Micro.fork)
        yield* Micro.fiberInterrupt(fiber)
        assert.deepStrictEqual(fiber.unsafePoll(), Micro.exitInterrupt)
      }))

    it.effect("interrupt of never is interrupted with cause", () =>
      Micro.gen(function*() {
        const fiber = yield* Micro.fork(Micro.never)
        yield* Micro.fiberInterrupt(fiber)
        assert.deepStrictEqual(fiber.unsafePoll(), Micro.exitInterrupt)
      }))

    it.effect("catchAll + ensuring + interrupt", () =>
      Micro.gen(function*() {
        let catchFailure = false
        let ensuring = false
        const handle = yield* Micro.never.pipe(
          Micro.catchAllCause((_) =>
            Micro.sync(() => {
              catchFailure = true
            })
          ),
          Micro.ensuring(Micro.sync(() => {
            ensuring = true
          })),
          Micro.fork
        )
        yield* Micro.yieldFlush
        yield* Micro.fiberInterrupt(handle)
        assert.isFalse(catchFailure)
        assert.isTrue(ensuring)
      }))

    it.effect("run of interruptible", () =>
      Micro.gen(function*() {
        let recovered = false
        const fiber = yield* Micro.never.pipe(
          Micro.interruptible,
          Micro.exit,
          Micro.flatMap((result) =>
            Micro.sync(() => {
              recovered = result._tag === "Failure" && result.cause._tag === "Interrupt"
            })
          ),
          Micro.uninterruptible,
          Micro.fork
        )
        yield* Micro.yieldFlush
        yield* Micro.fiberInterrupt(fiber)
        assert.isTrue(recovered)
      }))

    it.effect("alternating interruptibility", () =>
      Micro.gen(function*() {
        let counter = 0
        const fiber = yield* Micro.never.pipe(
          Micro.interruptible,
          Micro.exit,
          Micro.andThen(Micro.sync(() => {
            counter++
          })),
          Micro.uninterruptible,
          Micro.interruptible,
          Micro.exit,
          Micro.andThen(Micro.sync(() => {
            counter++
          })),
          Micro.uninterruptible,
          Micro.fork
        )
        yield* Micro.yieldFlush
        yield* Micro.fiberInterrupt(fiber)
        assert.strictEqual(counter, 2)
      }))

    it.live("acquireUseRelease use inherits interrupt status", () =>
      Micro.gen(function*() {
        let ref = false
        const fiber = yield* Micro.acquireUseRelease(
          Micro.succeed(123),
          (_) =>
            Micro.sync(() => {
              ref = true
            }).pipe(
              Micro.delay(10)
            ),
          () => Micro.void
        ).pipe(
          Micro.uninterruptible,
          Micro.fork
        )
        yield* Micro.yieldFlush
        yield* Micro.fiberInterrupt(fiber)
        assert.isTrue(ref)
      }))

    it.live("async can be uninterruptible", () =>
      Micro.gen(function*() {
        let ref = false
        const fiber = yield* Micro.sleep(10).pipe(
          Micro.andThen(() => {
            ref = true
          }),
          Micro.uninterruptible,
          Micro.fork
        )
        yield* Micro.yieldFlush
        yield* Micro.fiberInterrupt(fiber)
        assert.isTrue(ref)
      }))

    it.live("async cannot resume on interrupt", () =>
      Micro.gen(function*() {
        const fiber = yield* Micro.async<string>((resume) => {
          setTimeout(() => {
            resume(Micro.succeed("foo"))
          }, 10)
        }).pipe(
          Micro.onInterrupt(Micro.sleep(30)),
          Micro.fork
        )
        yield* Micro.yieldFlush
        yield* Micro.fiberInterrupt(fiber)
        assert.deepStrictEqual(fiber.unsafePoll(), Micro.exitInterrupt)
      }))

    it.live("closing scope is uninterruptible", () =>
      Micro.gen(function*() {
        let ref = false
        const child = pipe(
          Micro.sleep(10),
          Micro.andThen(() => {
            ref = true
          })
        )
        const fiber = yield* child.pipe(Micro.uninterruptible, Micro.fork)
        yield* Micro.yieldFlush
        yield* Micro.fiberInterrupt(fiber)
        assert.isTrue(ref)
      }))

    it.effect("AbortSignal is aborted", () =>
      Micro.gen(function*() {
        let signal: AbortSignal
        const fiber = yield* Micro.async<void, never, never>((_cb, signal_) => {
          signal = signal_
        }).pipe(Micro.fork)
        yield* Micro.yieldFlush
        yield* Micro.fiberInterrupt(fiber)
        assert.strictEqual(signal!.aborted, true)
      }))
  })

  describe("fork", () => {
    it.effect("is interrupted with parent", () =>
      Micro.gen(function*() {
        let child = false
        let parent = false
        const fiber = yield* Micro.never.pipe(
          Micro.onInterrupt(Micro.sync(() => {
            child = true
          })),
          Micro.fork,
          Micro.andThen(Micro.never),
          Micro.onInterrupt(Micro.sync(() => {
            parent = true
          })),
          Micro.fork
        )
        yield* Micro.yieldFlush
        yield* Micro.fiberInterrupt(fiber)
        yield* Micro.yieldFlush
        assert.isTrue(child)
        assert.isTrue(parent)
      }))
  })

  describe("forkDaemon", () => {
    it.effect("is not interrupted with parent", () =>
      Micro.gen(function*() {
        let child = false
        let parent = false
        const handle = yield* Micro.never.pipe(
          Micro.onInterrupt(Micro.sync(() => {
            child = true
          })),
          Micro.forkDaemon,
          Micro.andThen(Micro.never),
          Micro.onInterrupt(Micro.sync(() => {
            parent = true
          })),
          Micro.fork
        )
        yield* Micro.yieldFlush
        yield* Micro.fiberInterrupt(handle)
        assert.isFalse(child)
        assert.isTrue(parent)
      }))
  })

  describe("forkIn", () => {
    it.effect("is interrupted when scope is closed", () =>
      Micro.gen(function*() {
        let interrupted = false
        const scope = yield* Micro.scopeMake
        yield* Micro.never.pipe(
          Micro.onInterrupt(Micro.sync(() => {
            interrupted = true
          })),
          Micro.forkIn(scope)
        )
        yield* Micro.yieldFlush
        yield* scope.close(Micro.exitVoid)
        assert.isTrue(interrupted)
      }))
  })

  describe("forkScoped", () => {
    it.effect("is interrupted when scope is closed", () =>
      Micro.gen(function*() {
        let interrupted = false
        const scope = yield* Micro.scopeMake
        yield* Micro.never.pipe(
          Micro.onInterrupt(Micro.sync(() => {
            interrupted = true
          })),
          Micro.forkScoped,
          Micro.provideScope(scope)
        )
        yield* Micro.yieldFlush
        yield* scope.close(Micro.exitVoid)
        assert.isTrue(interrupted)
      }))
  })

  describe("do notation", () => {
    it.effect("works", () =>
      Micro.succeed(1).pipe(
        Micro.bindTo("a"),
        Micro.let("b", ({ a }) => a + 1),
        Micro.bind("b", ({ b }) => Micro.succeed(b.toString())),
        Micro.tap((_) => {
          assert.deepStrictEqual(_, {
            a: 1,
            b: "2"
          })
        })
      ))
  })

  describe("stack safety", () => {
    it.effect("recursion", () => {
      const loop: Micro.Micro<void> = Micro.void.pipe(
        Micro.flatMap((_) => loop)
      )
      return loop.pipe(
        Micro.timeoutOption(50)
      )
    })
  })

  describe("finalization", () => {
    const ExampleError = new Error("Oh noes!")

    it.effect("fail ensuring", () =>
      Micro.gen(function*() {
        let finalized = false
        const result = yield* Micro.fail(ExampleError).pipe(
          Micro.ensuring(Micro.sync(() => {
            finalized = true
          })),
          Micro.exit
        )
        assert.deepStrictEqual(result, Micro.exitFail(ExampleError))
        assert.isTrue(finalized)
      }))

    it.effect("fail on error", () =>
      Micro.gen(function*() {
        let finalized = false
        const result = yield* Micro.fail(ExampleError).pipe(
          Micro.onError(() =>
            Micro.sync(() => {
              finalized = true
            })
          ),
          Micro.exit
        )
        assert.deepStrictEqual(result, Micro.exitFail(ExampleError))
        assert.isTrue(finalized)
      }))

    it.effect("finalizer errors not caught", () =>
      Micro.gen(function*() {
        const e2 = new Error("e2")
        const e3 = new Error("e3")
        const result = yield* pipe(
          Micro.fail(ExampleError),
          Micro.ensuring(Micro.die(e2)),
          Micro.ensuring(Micro.die(e3)),
          Micro.sandbox,
          Micro.flip,
          Micro.map((cause) => cause)
        )
        assert.deepStrictEqual(result, Micro.causeDie(e3))
      }))

    it.effect("finalizer errors reported", () =>
      Micro.gen(function*() {
        let reported: Micro.MicroExit<number> | undefined
        const result = yield* pipe(
          Micro.succeed(42),
          Micro.ensuring(Micro.die(ExampleError)),
          Micro.fork,
          Micro.flatMap((fiber) =>
            pipe(
              Micro.fiberAwait(fiber),
              Micro.flatMap((e) =>
                Micro.sync(() => {
                  reported = e
                })
              )
            )
          )
        )
        assert.isUndefined(result)
        assert.isFalse(reported !== undefined && Micro.exitIsSuccess(reported))
      }))

    it.effect("acquireUseRelease usage result", () =>
      Micro.gen(function*() {
        const result = yield* Micro.acquireUseRelease(
          Micro.void,
          () => Micro.succeed(42),
          () => Micro.void
        )
        assert.strictEqual(result, 42)
      }))

    it.effect("error in just acquisition", () =>
      Micro.gen(function*() {
        const result = yield* pipe(
          Micro.acquireUseRelease(
            Micro.fail(ExampleError),
            () => Micro.void,
            () => Micro.void
          ),
          Micro.exit
        )
        assert.deepStrictEqual(result, Micro.exitFail(ExampleError))
      }))

    it.effect("error in just release", () =>
      Micro.gen(function*() {
        const result = yield* pipe(
          Micro.acquireUseRelease(
            Micro.void,
            () => Micro.void,
            () => Micro.die(ExampleError)
          ),
          Micro.exit
        )
        assert.deepStrictEqual(result, Micro.exitDie(ExampleError))
      }))

    it.effect("error in just usage", () =>
      Micro.gen(function*() {
        const result = yield* pipe(
          Micro.acquireUseRelease(
            Micro.void,
            () => Micro.fail(ExampleError),
            () => Micro.void
          ),
          Micro.exit
        )
        assert.deepStrictEqual(result, Micro.exitFail(ExampleError))
      }))

    it.effect("rethrown caught error in acquisition", () =>
      Micro.gen(function*() {
        const result = yield* Micro.acquireUseRelease(
          Micro.fail(ExampleError),
          () => Micro.void,
          () => Micro.void
        ).pipe(Micro.flip)
        assert.deepEqual(result, ExampleError)
      }))

    it.effect("rethrown caught error in release", () =>
      Micro.gen(function*() {
        const result = yield* pipe(
          Micro.acquireUseRelease(
            Micro.void,
            () => Micro.void,
            () => Micro.die(ExampleError)
          ),
          Micro.exit
        )
        assert.deepStrictEqual(result, Micro.exitDie(ExampleError))
      }))

    it.effect("rethrown caught error in usage", () =>
      Micro.gen(function*() {
        const result = yield* Micro.acquireUseRelease(
          Micro.void,
          () => Micro.fail(ExampleError),
          () => Micro.void
        ).pipe(Micro.exit)
        assert.deepEqual(result, Micro.exitFail(ExampleError))
      }))

    it.effect("onResult - ensures that a cleanup function runs when an effect fails", () =>
      Micro.gen(function*() {
        let ref = false
        yield* Micro.die("boom").pipe(
          Micro.onExit((result) =>
            Micro.exitIsDie(result) ?
              Micro.sync(() => {
                ref = true
              }) :
              Micro.void
          ),
          Micro.sandbox,
          Micro.ignore
        )
        assert.isTrue(ref)
      }))
  })

  describe("error handling", () => {
    class ErrorA extends Micro.TaggedError("A") {}
    class ErrorB extends Micro.TaggedError("B") {}
    class ErrorC extends Micro.Error {}

    it.effect("catchTag", () =>
      Micro.gen(function*() {
        let error: ErrorA | ErrorB | ErrorC = new ErrorA()
        const effect = Micro.failSync(() => error).pipe(
          Micro.catchTag("A", (_) => Micro.succeed(1)),
          Micro.catchTag("B", (_) => Micro.succeed(2)),
          Micro.orElseSucceed(() => 3)
        )
        assert.strictEqual(yield* effect, 1)
        error = new ErrorB()
        assert.strictEqual(yield* effect, 2)
        error = new ErrorC()
        assert.strictEqual(yield* effect, 3)
      }))
  })

  describe("zip", () => {
    it.effect("concurrent: false", () => {
      const executionOrder: Array<string> = []
      const task1 = Micro.succeed("a").pipe(Micro.delay(5), Micro.tap(() => executionOrder.push("task1")))
      const task2 = Micro.succeed(1).pipe(Micro.delay(1), Micro.tap(() => executionOrder.push("task2")))
      return Micro.gen(function*() {
        const result = yield* Micro.zip(task1, task2)
        assert.deepStrictEqual(result, ["a", 1])
        assert.deepStrictEqual(executionOrder, ["task1", "task2"])
      })
    })
    it.effect("concurrent: true", () => {
      const executionOrder: Array<string> = []
      const task1 = Micro.succeed("a").pipe(Micro.delay(50), Micro.tap(() => executionOrder.push("task1")))
      const task2 = Micro.succeed(1).pipe(Micro.delay(1), Micro.tap(() => executionOrder.push("task2")))
      return Micro.gen(function*() {
        const result = yield* Micro.zip(task1, task2, { concurrent: true })
        assert.deepStrictEqual(result, ["a", 1])
        assert.deepStrictEqual(executionOrder, ["task2", "task1"])
      })
    })
  })

  describe("zipWith", () => {
    it.effect("concurrent: false", () => {
      const executionOrder: Array<string> = []
      const task1 = Micro.succeed("a").pipe(Micro.delay(50), Micro.tap(() => executionOrder.push("task1")))
      const task2 = Micro.succeed(1).pipe(Micro.delay(1), Micro.tap(() => executionOrder.push("task2")))
      return Micro.gen(function*() {
        const result = yield* Micro.zipWith(task1, task2, (a, b) => a + b)
        assert.deepStrictEqual(result, "a1")
        assert.deepStrictEqual(executionOrder, ["task1", "task2"])
      })
    })
    it.effect("concurrent: true", () => {
      const executionOrder: Array<string> = []
      const task1 = Micro.succeed("a").pipe(Micro.delay(50), Micro.tap(() => executionOrder.push("task1")))
      const task2 = Micro.succeed(1).pipe(Micro.delay(1), Micro.tap(() => executionOrder.push("task2")))
      return Micro.gen(function*() {
        const result = yield* Micro.zipWith(task1, task2, (a, b) => a + b, { concurrent: true })
        assert.deepStrictEqual(result, "a1")
        assert.deepStrictEqual(executionOrder, ["task2", "task1"])
      })
    })
  })

  describe("catchCauseIf", () => {
    it.effect("first argument as success", () =>
      Micro.gen(function*() {
        const result = yield* Micro.catchCauseIf(Micro.succeed(1), () => false, () => Micro.fail("e2"))
        assert.deepStrictEqual(result, 1)
      }))
    it.effect("first argument as failure and predicate return false", () =>
      Micro.gen(function*() {
        const result = yield* Micro.flip(
          Micro.catchCauseIf(Micro.fail("e1" as const), () => false, () => Micro.fail("e2" as const))
        )
        assert.deepStrictEqual(result, "e1")
      }))
    it.effect("first argument as failure and predicate return true", () =>
      Micro.gen(function*() {
        const result = yield* Micro.flip(
          Micro.catchCauseIf(Micro.fail("e1" as const), () => true, () => Micro.fail("e2" as const))
        )
        assert.deepStrictEqual(result, "e2")
      }))
  })

  describe("catchAll", () => {
    it.effect("first argument as success", () =>
      Micro.gen(function*() {
        const result = yield* Micro.catchAll(Micro.succeed(1), () => Micro.fail("e2" as const))
        assert.deepStrictEqual(result, 1)
      }))
    it.effect("first argument as failure", () =>
      Micro.gen(function*() {
        const result = yield* Micro.flip(Micro.catchAll(Micro.fail("e1" as const), () => Micro.fail("e2" as const)))
        assert.deepStrictEqual(result, "e2")
      }))
  })

  describe("catchAllCause", () => {
    it.effect("first argument as success", () =>
      Micro.gen(function*() {
        const result = yield* Micro.catchAllCause(Micro.succeed(1), () => Micro.fail("e2" as const))
        assert.deepStrictEqual(result, 1)
      }))
    it.effect("first argument as failure", () =>
      Micro.gen(function*() {
        const result = yield* Micro.flip(
          Micro.catchAllCause(Micro.fail("e1" as const), () => Micro.fail("e2" as const))
        )
        assert.deepStrictEqual(result, "e2")
      }))
  })

  describe("schedules", () => {
    // returns an array of delays, an item for each attempt
    const dryRun = (schedule: Micro.MicroSchedule, maxAttempt: number = 7): Array<number> => {
      let attempt = 1
      let elapsed = 0
      let duration = schedule(attempt, elapsed)
      const out: Array<number> = []
      while (Option.isSome(duration) && attempt <= maxAttempt) {
        const value = duration.value
        attempt++
        elapsed += value
        out.push(value)
        duration = schedule(attempt, elapsed)
      }
      return out
    }

    it("scheduleRecurs", () => {
      const out = dryRun(Micro.scheduleRecurs(5))
      assert.deepStrictEqual(out, [0, 0, 0, 0, 0])
    })

    it("scheduleSpaced", () => {
      const out = dryRun(Micro.scheduleSpaced(10))
      assert.deepStrictEqual(out, [10, 10, 10, 10, 10, 10, 10])
    })

    it("scheduleExponential", () => {
      const out = dryRun(Micro.scheduleExponential(10))
      assert.deepStrictEqual(out, [20, 40, 80, 160, 320, 640, 1280])
    })

    it("scheduleAddDelay", () => {
      const out = dryRun(Micro.scheduleAddDelay(Micro.scheduleRecurs(5), () => 10))
      assert.deepStrictEqual(out, [10, 10, 10, 10, 10])
    })

    it("scheduleWithMaxDelay", () => {
      const out = dryRun(Micro.scheduleWithMaxDelay(Micro.scheduleExponential(10), 400))
      assert.deepStrictEqual(out, [20, 40, 80, 160, 320, 400, 400])
    })

    it("scheduleWithMaxElapsed", () => {
      const out = dryRun(Micro.scheduleWithMaxElapsed(Micro.scheduleExponential(10), 400))
      assert.deepStrictEqual(out, [20, 40, 80, 160, 320])
    })

    it("scheduleUnion", () => {
      const out = dryRun(Micro.scheduleUnion(
        Micro.scheduleExponential(10),
        Micro.scheduleSpaced(100)
      ))
      assert.deepStrictEqual(out, [20, 40, 80, 100, 100, 100, 100])
    })

    it("scheduleIntersect", () => {
      const out = dryRun(Micro.scheduleIntersect(
        Micro.scheduleExponential(10),
        Micro.scheduleSpaced(100)
      ))
      assert.deepStrictEqual(out, [100, 100, 100, 160, 320, 640, 1280])
    })
  })
})
