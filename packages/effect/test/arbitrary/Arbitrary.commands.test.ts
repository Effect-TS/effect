import { assert, describe, it } from "@effect/vitest"
import { Arbitrary, Cause, Context, Data, Effect, Exit, Fiber, Schema } from "effect"

const int = (minimum: number, maximum: number) =>
  Arbitrary.schema(Schema.Int.check(Schema.isBetween({ minimum, maximum })))

const element = <A>(values: ReadonlyArray<A>) =>
  values.length === 0 ? undefined : Arbitrary.map(int(0, values.length - 1), (index) => values[index])

const sample = <M, R>(commands: Arbitrary.Arbitrary<Arbitrary.Commands<M, R>>, size: number, count = 50) =>
  Arbitrary.sampleEffect(commands, { count, size, seed: "commands" })

// Every reference used by a step is defined by an earlier step.
const assertReferencesDefined = (sequence: Arbitrary.Commands<unknown, unknown>) => {
  const defined = new Set<unknown>()
  for (const step of sequence.steps) {
    const used = [step.args].flat(2).filter((value) => typeof value === "object" && value !== null && "id" in value)
    for (const reference of used) assert.isTrue(defined.has(reference), `${reference} is not defined`)
    defined.add(step.reference)
  }
}

// A stack without a system: `pop` is only available when the stack is not empty, and `push` never repeats the top.
type Stack = ReadonlyArray<number>
const stack = Arbitrary.commands({
  initial: [] as Stack,
  commands: [
    Arbitrary.command({
      name: "push",
      args: (_: Stack) => int(0, 3),
      precondition: (model, value) => model[model.length - 1] !== value,
      next: (model, value) => [...model, value],
      run: () => Effect.void
    }),
    Arbitrary.command({
      name: "pop",
      args: (model: Stack) => model.length === 0 ? undefined : Arbitrary.Constant(undefined),
      next: (model) => model.slice(0, -1),
      run: () => Effect.void
    })
  ]
})

describe("Arbitrary.commands", () => {
  it.effect("generates sequences that the model allows", () =>
    Effect.gen(function*() {
      for (const sequence of yield* sample(stack, 20)) {
        let model: Stack = []
        for (const step of sequence.steps) {
          if (step.command === "pop") {
            assert.isAbove(model.length, 0)
            model = model.slice(0, -1)
          } else {
            assert.notStrictEqual(step.args, model[model.length - 1])
            model = [...model, step.args as number]
          }
        }
        const run = yield* Arbitrary.runCommands(sequence)
        assert.deepStrictEqual(run.model, model)
      }
    }))

  it.effect("follows size and maxCommands", () =>
    Effect.gen(function*() {
      const cases = [
        { size: 0, maxCommands: undefined, maximum: 0 },
        { size: 5, maxCommands: undefined, maximum: 5 },
        { size: 30, maxCommands: 4, maximum: 4 },
        { size: 30, maxCommands: 0, maximum: 0 }
      ]
      for (const { maxCommands, maximum, size } of cases) {
        const commands = Arbitrary.commands({
          initial: undefined,
          commands: [Arbitrary.command({ name: "noop", run: () => Effect.void })],
          maxCommands
        })
        const lengths = (yield* sample(commands, size)).map((sequence) => sequence.steps.length)
        assert.strictEqual(Math.max(...lengths), maximum, `size ${size}, maxCommands ${maxCommands}`)
      }
      assert.throws(() => Arbitrary.commands({ initial: undefined, commands: [], maxCommands: -1 }))
      const noop = Arbitrary.command({ name: "noop", run: () => Effect.void })
      assert.throws(() => Arbitrary.commands({ initial: undefined, commands: [noop, noop] }))
    }))

  it.effect("resolves references in arguments before running a command", () =>
    Effect.gen(function*() {
      type Model = ReadonlyArray<Arbitrary.Reference<{ readonly handle: number }>>
      const received: Array<unknown> = []
      let handles = 0
      const commands = Arbitrary.commands({
        initial: [] as Model,
        commands: [
          Arbitrary.command({
            name: "open",
            next: (model: Model, _, handle) => [...model, handle],
            run: () => Effect.sync(() => ({ handle: handles++ }))
          }),
          Arbitrary.command({
            name: "use",
            args: (model: Model) =>
              element(model)?.pipe(
                Arbitrary.map((handle) => ({ handle, all: [handle, ...model], count: model.length }))
              ),
            run: (args) =>
              Effect.sync(() => {
                received.push(args)
              })
          })
        ]
      })
      for (const sequence of yield* sample(commands, 10, 20)) {
        received.length = 0
        handles = 0
        const run = yield* Arbitrary.runCommands(sequence)
        const opened = new Map<Arbitrary.Reference<unknown>, unknown>(
          run.steps.flatMap((step) =>
            step.command === "open" && Exit.isSuccess(step.exit) ? [[step.reference, step.exit.value] as const] : []
          )
        )
        const expected = sequence.steps.flatMap((step) => {
          if (step.command !== "use") return []
          const args = step.args as {
            handle: Arbitrary.Reference<unknown>
            all: ReadonlyArray<Arbitrary.Reference<unknown>>
            count: number
          }
          return [{
            handle: opened.get(args.handle),
            all: args.all.map((handle) => opened.get(handle)),
            count: args.count
          }]
        })
        assert.deepStrictEqual(received, expected)
      }
    }))

  it.effect("deletes commands while shrinking and keeps references valid", () =>
    Effect.gen(function*() {
      // The system fails to use the second handle it created.
      type Model = ReadonlyArray<Arbitrary.Reference<number>>
      class Handles extends Context.Service<Handles, { next: number }>()("Handles") {}
      const commands = Arbitrary.commands({
        initial: [] as Model,
        commands: [
          Arbitrary.command({
            name: "create",
            next: (model: Model, _, handle) => [...model, handle],
            run: () => Handles.useSync((handles) => handles.next++)
          }),
          Arbitrary.command({
            name: "use",
            args: element<Arbitrary.Reference<number>>,
            run: (handle) => handle === 1 ? Effect.fail("unusable") : Effect.void
          }),
          Arbitrary.command({ name: "noop", run: () => Effect.void })
        ]
      })
      const result = yield* Arbitrary.checkEffect(
        commands,
        (sequence) =>
          Arbitrary.runCommands(sequence).pipe(Effect.as(true), Effect.provideService(Handles, { next: 0 })),
        { seed: "references", size: 20 }
      )
      assert.strictEqual(result._tag, "Falsified")
      if (result._tag !== "Falsified") return
      assertReferencesDefined(result.shrunkInput)
      const [first, second, use] = result.shrunkInput.steps
      assert.deepStrictEqual(result.shrunkInput.steps.map((step) => step.command), ["create", "create", "use"])
      assert.notStrictEqual(first.reference, second.reference)
      assert.strictEqual(use.args, second.reference)
      assert.isAbove(result.initialInput.steps.length, 3)
    }))

  it.effect("reports postcondition and invariant failures with the step trace", () =>
    Effect.gen(function*() {
      type Model = number
      const cases: ReadonlyArray<{
        readonly name: string
        readonly postcondition?: (model: Model, args: undefined, exit: Exit.Exit<number, string>) => boolean
        readonly invariant?: (model: Model) => boolean | Effect.Effect<boolean, string>
        readonly reason?: Arbitrary.CommandsFailure<Model>["reason"]
        readonly cause?: Cause.Cause<unknown>
      }> = [
        // Without a postcondition the command must succeed.
        { name: "default postcondition", reason: "Postcondition" },
        // An expected failure accepted by the postcondition is a correct result.
        { name: "expected failure", postcondition: (_, __, exit) => Exit.isFailure(exit) },
        {
          name: "throwing postcondition",
          postcondition: () => {
            throw "postcondition"
          },
          reason: "Postcondition",
          cause: Cause.die("postcondition")
        },
        {
          name: "invariant",
          postcondition: () => true,
          invariant: (model) => model < 2,
          reason: "Invariant"
        },
        {
          name: "failing invariant",
          postcondition: () => true,
          invariant: (model) => model < 2 ? Effect.succeed(true) : Effect.fail("invariant"),
          reason: "Invariant",
          cause: Cause.fail("invariant")
        }
      ]
      for (const { cause, invariant, name, postcondition, reason } of cases) {
        const commands = Arbitrary.commands({
          initial: 0,
          commands: [
            Arbitrary.command({
              name: "step",
              next: (model: Model) => model + 1,
              run: () => Effect.fail("failed"),
              ...(postcondition === undefined ? {} : { postcondition })
            })
          ],
          invariant
        })
        const [sequence] = yield* sample(commands.pipe(Arbitrary.filter((c) => c.steps.length >= 3)), 10, 1)
        const exit = yield* Effect.exit(Arbitrary.runCommands(sequence))
        if (reason === undefined) {
          assert.isTrue(Exit.isSuccess(exit), name)
          continue
        }
        assert.isTrue(Exit.isFailure(exit), name)
        if (Exit.isSuccess(exit)) continue
        const failure = Cause.findErrorOption(exit.cause)
        assert.strictEqual(failure._tag, "Some")
        if (failure._tag === "None") continue
        const expectedSteps = reason === "Invariant" ? 2 : 1
        assert.strictEqual(failure.value.reason, reason, name)
        assert.deepStrictEqual(failure.value.cause, cause, name)
        assert.deepStrictEqual(failure.value.steps.map((step) => step.model), [0, 1].slice(0, expectedSteps), name)
        assert.deepStrictEqual(failure.value.steps[expectedSteps - 1].exit, Exit.fail("failed"), name)
        assert.strictEqual(failure.value.model, expectedSteps, name)
      }
    }))

  it.effect("propagates interruption of a command instead of reporting a result", () =>
    Effect.gen(function*() {
      const commands = Arbitrary.commands({
        initial: undefined,
        commands: [Arbitrary.command({ name: "interrupt", run: () => Effect.interrupt })]
      })
      const [sequence] = yield* sample(commands.pipe(Arbitrary.filter((c) => c.steps.length > 0)), 5, 1)
      const fiber = yield* Effect.forkChild(Arbitrary.runCommands(sequence))
      assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(fiber)))
    }))

  it.effect("counts runs and rejected candidates per command", () =>
    Effect.gen(function*() {
      const commands = Arbitrary.commands({
        initial: 0,
        commands: [
          Arbitrary.command({
            name: "even",
            args: () => int(0, 9),
            precondition: (_: number, value) => value % 2 === 0,
            run: () => Effect.void
          }),
          Arbitrary.command({ name: "unavailable", args: () => undefined, run: () => Effect.void }),
          Arbitrary.command({ name: "never", precondition: () => false, run: () => Effect.void })
        ]
      })
      const totals = new Map<string, { runs: number; rejected: number }>()
      for (const sequence of yield* sample(commands, 10)) {
        const run = yield* Arbitrary.runCommands(sequence)
        for (const { name, rejected, runs } of run.counts) {
          const total = totals.get(name) ?? { runs: 0, rejected: 0 }
          totals.set(name, { runs: total.runs + runs, rejected: total.rejected + rejected })
        }
        assert.strictEqual(run.counts[0].runs, sequence.steps.length)
      }
      const even = totals.get("even")!
      assert.isAbove(even.runs, 0)
      assert.isAbove(even.rejected, 0)
      assert.deepStrictEqual(totals.get("unavailable"), { runs: 0, rejected: 0 })
      assert.strictEqual(totals.get("never")!.runs, 0)
      assert.isAbove(totals.get("never")!.rejected, 0)
    }))
})

describe("Arbitrary.commands bank account model", () => {
  class InsufficientFunds extends Data.TaggedError("InsufficientFunds") {}
  class InvalidAmount extends Data.TaggedError("InvalidAmount") {}

  class Bank extends Context.Service<Bank, {
    readonly open: Effect.Effect<string>
    readonly deposit: (account: string, amount: number) => Effect.Effect<void, InvalidAmount>
    readonly withdraw: (account: string, amount: number) => Effect.Effect<void, InsufficientFunds>
    readonly balance: (account: string) => Effect.Effect<number>
    readonly total: Effect.Effect<number>
  }>()("Bank") {}

  // The bug: a withdrawal may overdraw an account by one.
  const makeBank = () => {
    const balances = new Map<string, number>()
    return Bank.of({
      open: Effect.sync(() => {
        const account = `account-${balances.size}`
        balances.set(account, 0)
        return account
      }),
      deposit: (account, amount) =>
        amount <= 0 ? Effect.fail(new InvalidAmount()) : Effect.sync(() => {
          balances.set(account, balances.get(account)! + amount)
        }),
      withdraw: (account, amount) =>
        balances.get(account)! - amount < -1 ? Effect.fail(new InsufficientFunds()) : Effect.sync(() => {
          balances.set(account, balances.get(account)! - amount)
        }),
      balance: (account) => Effect.sync(() => balances.get(account)!),
      total: Effect.sync(() => [...balances.values()].reduce((sum, balance) => sum + balance, 0))
    })
  }

  type Model = ReadonlyMap<Arbitrary.Reference<string>, number>
  const transfer = (model: Model) =>
    model.size === 0 ? undefined : Arbitrary.all({ account: element([...model.keys()])!, amount: int(-5, 20) })

  const commands = Arbitrary.commands({
    initial: new Map() as Model,
    commands: [
      Arbitrary.command({
        name: "open",
        next: (model: Model, _, account) => new Map(model).set(account, 0),
        run: () => Bank.use((bank) => bank.open)
      }),
      Arbitrary.command({
        name: "deposit",
        args: transfer,
        next: (model: Model, { account, amount }) =>
          amount > 0 ? new Map(model).set(account, model.get(account)! + amount) : model,
        run: ({ account, amount }) => Bank.use((bank) => bank.deposit(account, amount)),
        postcondition: (_, { amount }, exit) =>
          amount > 0 ? Exit.isSuccess(exit) : Exit.isFailure(exit) && Cause.squash(exit.cause) instanceof InvalidAmount
      }),
      Arbitrary.command({
        name: "withdraw",
        args: transfer,
        precondition: (_: Model, { amount }) => amount > 0,
        next: (model: Model, { account, amount }) =>
          amount <= model.get(account)! ? new Map(model).set(account, model.get(account)! - amount) : model,
        run: ({ account, amount }) => Bank.use((bank) => bank.withdraw(account, amount)),
        // Overdrawing is an expected failure.
        postcondition: (model, { account, amount }, exit) =>
          amount <= model.get(account)!
            ? Exit.isSuccess(exit)
            : Exit.isFailure(exit) && Cause.squash(exit.cause) instanceof InsufficientFunds
      }),
      Arbitrary.command({
        name: "balance",
        args: (model: Model) => element([...model.keys()]),
        run: (account) => Bank.use((bank) => bank.balance(account)),
        postcondition: (model, account, exit) => Exit.isSuccess(exit) && exit.value === model.get(account)
      })
    ],
    invariant: (model) =>
      Bank.use((bank) => bank.total).pipe(
        Effect.map((total) => total === [...model.values()].reduce((sum, balance) => sum + balance, 0))
      )
  })

  const property = (sequence: Arbitrary.Commands<Model, Bank>) =>
    Arbitrary.runCommands(sequence).pipe(Effect.as(true), Effect.provideService(Bank, makeBank()))

  it.effect("shrinks to the minimal overdraft", () =>
    Effect.gen(function*() {
      const result = yield* Arbitrary.checkEffect(commands, property, { seed: "bank", size: 30 })
      assert.strictEqual(result._tag, "Falsified")
      if (result._tag !== "Falsified" || result.failure._tag !== "PropertyError") return
      const [open, withdraw] = result.shrunkInput.steps
      assert.deepStrictEqual(result.shrunkInput.steps.map((step) => step.command), ["open", "withdraw"])
      assert.deepStrictEqual(withdraw.args, { account: open.reference, amount: 1 })
      // Reference ids keep the positions of the originally generated sequence.
      const [account, withdrawal] = [open.reference.id, withdraw.reference.id]
      assert.strictEqual(
        String(result.shrunkInput),
        `Commands(\n  $${account} = open()\n  $${withdrawal} = withdraw({"account":$${account},"amount":1})\n)`
      )

      const failure = result.failure.error
      assert.strictEqual(failure.reason, "Postcondition")
      assert.deepStrictEqual(failure.steps.map((step) => [step.command, step.model.size, Exit.isSuccess(step.exit)]), [
        ["open", 0, true],
        ["withdraw", 1, true]
      ])
    }))

  it.effect("replays the falsification and reruns the shrunk input deterministically", () =>
    Effect.gen(function*() {
      const options = { seed: "bank-replay", size: 30 }
      const result = yield* Arbitrary.checkEffect(commands, property, options)
      assert.strictEqual(result._tag, "Falsified")
      if (result._tag !== "Falsified") return
      assert.deepStrictEqual(yield* Arbitrary.checkEffect(commands, property, { ...options, concurrency: 4 }), result)
      assert.deepStrictEqual(
        yield* Arbitrary.checkEffect(commands, property, { replay: result.replay }),
        { ...result, runs: 1, discards: 0 }
      )
      const first = yield* Effect.flip(property(result.shrunkInput))
      const second = yield* Effect.flip(property(result.shrunkInput))
      assert.deepStrictEqual(second, first)
    }))
})
