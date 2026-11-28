import { assert, describe, it } from "@effect/vitest"
import { Arbitrary, Cause, Context, Data, Effect, Exit, Fiber, Option, Schema } from "effect"

const int = (minimum: number, maximum: number) =>
  Arbitrary.schema(Schema.Int.check(Schema.isBetween({ minimum, maximum })))

const element = <A>(values: ReadonlyArray<A>) =>
  values.length === 0 ? undefined : Arbitrary.map(int(0, values.length - 1), (index) => values[index])

const sampleOne = <M, R>(commands: Arbitrary.Arbitrary<Arbitrary.Commands<M, R>>, minimumLength: number) =>
  Arbitrary.sampleEffect(commands.pipe(Arbitrary.filter((sequence) => sequence.steps.length >= minimumLength)), {
    count: 1,
    size: 10,
    seed: "commands"
  }).pipe(Effect.map(([sequence]) => sequence))

describe("Arbitrary.commands", () => {
  it.effect("rechecks availability and preconditions while shrinking", () =>
    Effect.gen(function*() {
      // `fail` always fails and is only allowed after `open`. Removing `open` must also remove `fail`.
      const gates = [
        Arbitrary.command({
          name: "fail",
          args: (model: number) => model === 0 ? undefined : int(0, 3),
          run: () => Effect.fail("failed")
        }),
        Arbitrary.command({
          name: "fail",
          args: (_: number) => int(0, 3),
          precondition: (model, value) => value < model,
          run: () => Effect.fail("failed")
        })
      ]
      for (const fail of gates) {
        const commands = Arbitrary.commands({
          initial: 0,
          commands: [
            Arbitrary.command({ name: "open", next: (model: number) => model + 1, run: () => Effect.void }),
            fail
          ]
        })
        const result = yield* Arbitrary.checkEffect(
          commands,
          (sequence) => Arbitrary.runCommands(sequence).pipe(Effect.as(true)),
          { seed: "availability", size: 20 }
        )
        assert.strictEqual(result._tag, "Falsified")
        if (result._tag !== "Falsified") return
        assert.deepStrictEqual(result.shrunkInput.steps.map((step) => [step.command, step.args]), [
          ["open", undefined],
          ["fail", 0]
        ])
      }
    }))

  it.effect("keeps references in scope wherever the arguments hold them", () =>
    Effect.gen(function*() {
      const shapes: ReadonlyArray<{
        readonly name: string
        readonly wrap: (handle: Arbitrary.Reference<number>) => unknown
        readonly unwrap: (args: any) => Arbitrary.Reference<number>
      }> = [
        { name: "nested object", wrap: (handle) => ({ at: [{ handle }] }), unwrap: (args) => args.at[0].handle },
        { name: "Option", wrap: Option.some, unwrap: Option.getOrThrow },
        { name: "Map value", wrap: (handle) => new Map([["handle", handle]]), unwrap: (args) => args.get("handle") },
        { name: "Set", wrap: (handle) => new Set([handle]), unwrap: (args) => [...args][0] }
      ]
      for (const { name, unwrap, wrap } of shapes) {
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
              args: (model: Model) => element(model)?.pipe(Arbitrary.map(wrap)),
              run: (args, resolve) => resolve(unwrap(args)) === 1 ? Effect.fail("unusable") : Effect.void
            })
          ]
        })
        const result = yield* Arbitrary.checkEffect(
          commands,
          (sequence) =>
            Arbitrary.runCommands(sequence).pipe(Effect.as(true), Effect.provideService(Handles, { next: 0 })),
          { seed: "scope", size: 20 }
        )
        assert.strictEqual(result._tag, "Falsified", name)
        if (result._tag !== "Falsified") return
        // Without the scope check, shrinking would remove both `create` commands and fail on a dangling reference.
        const [, second, use] = result.shrunkInput.steps
        assert.deepStrictEqual(result.shrunkInput.steps.map((step) => step.command), ["create", "create", "use"], name)
        assert.strictEqual(unwrap(use.args), second.reference, name)
      }
    }))

  it.effect("lets postconditions resolve values returned by earlier commands", () =>
    Effect.gen(function*() {
      type Model = ReadonlyArray<Arbitrary.Reference<string>>
      class Registry extends Context.Service<Registry, {
        readonly register: Effect.Effect<string>
        readonly list: Effect.Effect<ReadonlyArray<string>>
      }>()("Registry") {}
      // `forgetFirst` loses the first registration once there are three.
      const makeRegistry = (forgetFirst: boolean) => {
        const ids: Array<string> = []
        return Registry.of({
          register: Effect.sync(() => {
            const id = `id-${ids.length}`
            ids.push(id)
            return id
          }),
          list: Effect.sync(() => forgetFirst && ids.length >= 3 ? ids.slice(1) : ids.slice())
        })
      }
      const commands = Arbitrary.commands({
        initial: [] as Model,
        commands: [
          Arbitrary.command({
            name: "register",
            next: (model: Model, _, id) => [...model, id],
            run: () => Registry.use((registry) => registry.register)
          }),
          Arbitrary.command({
            name: "list",
            run: () => Registry.use((registry) => registry.list),
            postcondition: (model: Model, _, exit, resolve) =>
              Exit.isSuccess(exit) && exit.value.join() === model.map(resolve).join()
          })
        ]
      })
      const check = (forgetFirst: boolean) =>
        Arbitrary.checkEffect(
          commands,
          (sequence) =>
            Arbitrary.runCommands(sequence).pipe(
              Effect.as(true),
              Effect.provideService(Registry, makeRegistry(forgetFirst))
            ),
          { seed: "registry", size: 20 }
        )
      assert.strictEqual((yield* check(false))._tag, "Passed")
      const result = yield* check(true)
      assert.strictEqual(result._tag, "Falsified")
      if (result._tag !== "Falsified") return
      assert.deepStrictEqual(result.shrunkInput.steps.map((step) => step.command), [
        "register",
        "register",
        "register",
        "list"
      ])
      // Shrinking keeps the id each reference had at its position in the generated sequence.
      const ids = result.shrunkInput.steps.map((step) => step.reference.id)
      assert.isTrue(ids.some((id, index) => id !== index))
      assert.deepStrictEqual(
        ids.map((id) => result.initialInput.steps[id].reference),
        result.shrunkInput.steps.map((step) => step.reference)
      )
    }))

  it.effect("checks results with Exit-based postconditions and invariants", () =>
    Effect.gen(function*() {
      const cases: ReadonlyArray<{
        readonly name: string
        readonly postcondition?: (model: number, args: undefined, exit: Exit.Exit<number, string>) =>
          | boolean
          | Effect.Effect<boolean, string>
        readonly invariant?: (model: number) => boolean
        readonly reason?: Arbitrary.CommandsFailure<number>["reason"]
        readonly cause?: Cause.Cause<unknown>
      }> = [
        // Without a postcondition the command must succeed.
        { name: "default postcondition", reason: "Postcondition" },
        // An expected failure accepted by the postcondition is a correct result.
        { name: "expected failure", postcondition: (_, __, exit) => Exit.isFailure(exit) },
        { name: "postcondition Effect", postcondition: (_, __, exit) => Effect.succeed(Exit.isFailure(exit)) },
        {
          name: "failing postcondition Effect",
          postcondition: () => Effect.fail("postcondition"),
          reason: "Postcondition",
          cause: Cause.fail("postcondition")
        },
        { name: "invariant", postcondition: () => true, invariant: (model) => model < 2, reason: "Invariant" }
      ]
      for (const { cause, invariant, name, postcondition, reason } of cases) {
        const commands = Arbitrary.commands({
          initial: 0,
          commands: [
            Arbitrary.command({
              name: "step",
              next: (model: number) => model + 1,
              run: () => Effect.fail("failed"),
              ...(postcondition === undefined ? {} : { postcondition })
            })
          ],
          invariant
        })
        const exit = yield* Effect.exit(Arbitrary.runCommands(yield* sampleOne(commands, 3)))
        if (reason === undefined) {
          assert.isTrue(Exit.isSuccess(exit), name)
          continue
        }
        const failure = Exit.isFailure(exit) ? Cause.findErrorOption(exit.cause) : Option.none()
        if (Option.isNone(failure)) {
          assert.fail(`${name}: expected a CommandsFailure`)
          return
        }
        // The postcondition fails on the first step, the invariant on the model after the second.
        const failedAt = reason === "Invariant" ? 2 : 1
        assert.strictEqual(failure.value.reason, reason, name)
        assert.deepStrictEqual(failure.value.cause, cause, name)
        assert.deepStrictEqual(failure.value.steps.map((step) => step.model), [0, 1].slice(0, failedAt), name)
        assert.deepStrictEqual(failure.value.steps[failedAt - 1].exit, Exit.fail("failed"), name)
        assert.strictEqual(failure.value.model, failedAt, name)
      }
    }))

  it.effect("checks the invariant before the first command", () =>
    Effect.gen(function*() {
      let runs = 0
      const commands = Arbitrary.commands({
        initial: 0,
        commands: [Arbitrary.command({ name: "step", run: () => Effect.sync(() => runs++) })],
        invariant: () => false
      })
      const failure = yield* Effect.flip(Arbitrary.runCommands(yield* sampleOne(commands, 1)))
      assert.strictEqual(failure.reason, "Invariant")
      assert.deepStrictEqual(failure.steps, [])
      assert.strictEqual(failure.model, 0)
      assert.strictEqual(runs, 0)
    }))

  it.effect("propagates interruption of a command or postcondition instead of reporting a result", () =>
    Effect.gen(function*() {
      const interrupting = [
        Arbitrary.command({ name: "command", run: () => Effect.interrupt }),
        Arbitrary.command({ name: "postcondition", run: () => Effect.void, postcondition: () => Effect.interrupt })
      ]
      for (const command of interrupting) {
        const commands = Arbitrary.commands({ initial: undefined, commands: [command] })
        const fiber = yield* Effect.forkChild(Arbitrary.runCommands(yield* sampleOne(commands, 1)))
        assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(fiber)), command.name)
      }
    }))

  it("omits callbacks passed as undefined", () => {
    const command = Arbitrary.command({
      name: "step",
      args: undefined,
      precondition: undefined,
      next: undefined,
      postcondition: undefined,
      run: () => Effect.void
    })
    assert.deepStrictEqual(Object.keys(command).sort(), ["name", "run"])
  })
})

describe("Arbitrary.commands bank account model", () => {
  class InsufficientFunds extends Data.TaggedError("InsufficientFunds") {}

  class Bank extends Context.Service<Bank, {
    readonly open: Effect.Effect<string>
    readonly deposit: (account: string, amount: number) => Effect.Effect<void>
    readonly withdraw: (account: string, amount: number) => Effect.Effect<void, InsufficientFunds>
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
        Effect.sync(() => {
          balances.set(account, balances.get(account)! + amount)
        }),
      withdraw: (account, amount) =>
        balances.get(account)! - amount < -1 ? Effect.fail(new InsufficientFunds()) : Effect.sync(() => {
          balances.set(account, balances.get(account)! - amount)
        }),
      total: Effect.sync(() => [...balances.values()].reduce((sum, balance) => sum + balance, 0))
    })
  }

  type Model = ReadonlyMap<Arbitrary.Reference<string>, number>
  const transfer = (model: Model) =>
    model.size === 0 ? undefined : Arbitrary.all({ account: element([...model.keys()])!, amount: int(1, 20) })

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
        next: (model: Model, { account, amount }) => new Map(model).set(account, model.get(account)! + amount),
        run: ({ account, amount }, resolve) => Bank.use((bank) => bank.deposit(resolve(account), amount))
      }),
      Arbitrary.command({
        name: "withdraw",
        args: transfer,
        next: (model: Model, { account, amount }) =>
          amount <= model.get(account)! ? new Map(model).set(account, model.get(account)! - amount) : model,
        run: ({ account, amount }, resolve) => Bank.use((bank) => bank.withdraw(resolve(account), amount)),
        // Overdrawing is an expected failure.
        postcondition: (model, { account, amount }, exit) =>
          amount <= model.get(account)!
            ? Exit.isSuccess(exit)
            : Exit.isFailure(exit) && Cause.squash(exit.cause) instanceof InsufficientFunds
      })
    ],
    invariant: (model) =>
      Bank.use((bank) => bank.total).pipe(
        Effect.map((total) => total === [...model.values()].reduce((sum, balance) => sum + balance, 0))
      )
  })

  const property = (sequence: Arbitrary.Commands<Model, Bank>) =>
    Arbitrary.runCommands(sequence).pipe(Effect.as(true), Effect.provideService(Bank, makeBank()))

  it.effect("shrinks to the minimal overdraft and replays it", () =>
    Effect.gen(function*() {
      const options = { seed: "bank", size: 30 }
      const result = yield* Arbitrary.checkEffect(commands, property, options)
      assert.strictEqual(result._tag, "Falsified")
      if (result._tag !== "Falsified") return
      const [open, withdraw] = result.shrunkInput.steps
      assert.deepStrictEqual(result.shrunkInput.steps.map((step) => step.command), ["open", "withdraw"])
      assert.deepStrictEqual(withdraw.args, { account: open.reference, amount: 1 })
      const [account, withdrawal] = [open.reference.id, withdraw.reference.id]
      assert.strictEqual(
        String(result.shrunkInput),
        `Commands(\n  $${account} = open()\n  $${withdrawal} = withdraw({"account":$${account},"amount":1})\n)`
      )

      assert.deepStrictEqual(yield* Arbitrary.checkEffect(commands, property, { ...options, concurrency: 4 }), result)
      assert.deepStrictEqual(
        yield* Arbitrary.checkEffect(commands, property, { replay: result.replay }),
        { ...result, runs: 1, discards: 0 }
      )
    }))
})
