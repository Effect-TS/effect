import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Data, Deferred, Effect, Fiber, Ref, Schema, Stream } from "effect"
import { Machine } from "effect/unstable/machine"

class DeferredLog extends Context.Service<DeferredLog, {
  readonly push: (message: string) => Effect.Effect<void>
  readonly read: Effect.Effect<ReadonlyArray<string>>
}>()("test/Machine/DeferredLog") {}

class EntryRequirement extends Context.Service<EntryRequirement, {
  readonly entryMessage: string
}>()("test/Machine/EntryRequirement") {}

class InitialRequirement extends Context.Service<InitialRequirement, {
  readonly initialMessage: string
}>()("test/Machine/InitialRequirement") {}

class ExitRequirement extends Context.Service<ExitRequirement, {
  readonly exitMessage: string
}>()("test/Machine/ExitRequirement") {}

const makeDeferredLog = Effect.gen(function*() {
  const ref = yield* Ref.make<ReadonlyArray<string>>([])
  return DeferredLog.of({
    push: (message) => Ref.update(ref, (messages) => [...messages, message]),
    read: Ref.get(ref)
  })
})

class EntryError extends Data.TaggedError("EntryError")<{
  readonly state: string
}> {}

class InitialError extends Data.TaggedError("InitialError")<{
  readonly state: string
}> {}

class ExitError extends Data.TaggedError("ExitError")<{
  readonly state: string
}> {}

class InvokeError extends Data.TaggedError("InvokeError")<{
  readonly message: string
}> {}

const waitForSnapshot = <State, Event, Error, Output>(
  actor: Machine.MachineRef<State, Event, Error, Output>,
  predicate: (snapshot: Machine.RuntimeSnapshot<State, Error, Output>) => boolean
) =>
  actor.changes.pipe(
    Stream.filter(predicate),
    Stream.take(1),
    Stream.runCollect,
    Effect.map((snapshots) => Array.from(snapshots)[0] as Machine.RuntimeSnapshot<State, Error, Output>)
  )

const sendAndWaitForSnapshot = <State, Event, Error, Output>(
  actor: Machine.MachineRef<State, Event, Error, Output>,
  event: Event,
  predicate: (snapshot: Machine.RuntimeSnapshot<State, Error, Output>) => boolean
) =>
  Effect.gen(function*() {
    const observer = yield* waitForSnapshot(actor, predicate).pipe(Effect.forkChild)
    yield* actor.send(event)
    return yield* Fiber.join(observer)
  })

const assertStateSnapshot = <Path extends string, Value>(
  actual: Machine.Machine.AtomicSnapshot<Path, Value>,
  path: Path,
  value: Value
) => {
  assert.strictEqual(actual.path, path)
  assert.deepStrictEqual(actual.value, value)
}

const assertCompoundStateSnapshot = <Path extends string, Value, Child>(
  actual: Machine.Machine.CompoundSnapshot<Path, Value, Child>,
  path: Path,
  value: Value,
  state: Child
) => {
  assert.strictEqual(actual.path, path)
  assert.deepStrictEqual(actual.value, value)
  assert.deepStrictEqual(actual.state, state)
}

const assertParallelStateSnapshot = <Path extends string, Value, States>(
  actual: Machine.Machine.ParallelSnapshot<Path, Value, States>,
  path: Path,
  value: Value,
  states: States
) => {
  assert.strictEqual(actual.path, path)
  assert.deepStrictEqual(actual.value, value)
  assert.deepStrictEqual(actual.states, states)
}

const assertMachineSchemaDecodeError = (
  actual: unknown,
  boundary: Machine.MachineSchemaDecodeError["boundary"],
  options?: {
    readonly state?: string
    readonly event?: string
  }
) => {
  assert.instanceOf(actual, Machine.MachineSchemaDecodeError)
  assert.strictEqual(actual.boundary, boundary)
  if (options?.state !== undefined) {
    assert.strictEqual(actual.state, options.state)
  }
  if (options?.event !== undefined) {
    assert.strictEqual(actual.event, options.event)
  }
  assert.isTrue(Schema.isSchemaError(actual.cause))
}

const unsafeTagged = <A extends { readonly _tag: PropertyKey }>(value: A): A => value

describe("Machine", () => {
  const Input = Schema.Struct({
    userId: Schema.String
  })
  const NonEmptyInput = Schema.Struct({
    userId: Schema.NonEmptyString
  })
  class Idle extends Schema.TaggedClass<Idle>("Idle")("Idle", {
    userId: Schema.String
  }) {}

  class NonEmptyIdle extends Schema.TaggedClass<NonEmptyIdle>("NonEmptyIdle")("NonEmptyIdle", {
    userId: Schema.NonEmptyString
  }) {}

  class Loading extends Schema.TaggedClass<Loading>("Loading")("Loading", {
    requestId: Schema.String
  }) {}

  class NonEmptyLoading extends Schema.TaggedClass<NonEmptyLoading>("NonEmptyLoading")("NonEmptyLoading", {
    requestId: Schema.NonEmptyString
  }) {}

  class Success extends Schema.TaggedClass<Success>("Success")("Success", {
    requestId: Schema.String
  }) {}

  class NonEmptyDone extends Schema.TaggedClass<NonEmptyDone>("NonEmptyDone")("NonEmptyDone", {
    requestId: Schema.NonEmptyString
  }) {}

  class Failed extends Schema.TaggedClass<Failed>("Failed")("Failed", {
    message: Schema.String
  }) {}

  class Duplicate extends Schema.TaggedClass<Duplicate>("Duplicate")("Duplicate", {
    value: Schema.String
  }) {}

  class Payment extends Schema.TaggedClass<Payment>("Payment")("Payment", {
    id: Schema.String
  }) {}

  class EnteringPayment extends Schema.TaggedClass<EnteringPayment>("EnteringPayment")("EnteringPayment", {
    amount: Schema.Number
  }) {}

  class AuthorizedPayment extends Schema.TaggedClass<AuthorizedPayment>("AuthorizedPayment")("AuthorizedPayment", {
    code: Schema.String
  }) {}

  class Fulfillment extends Schema.TaggedClass<Fulfillment>("Fulfillment")("Fulfillment", {
    id: Schema.String
  }) {}

  class Inventory extends Schema.TaggedClass<Inventory>("Inventory")("Inventory", {
    warehouse: Schema.String
  }) {}

  class CheckingInventory extends Schema.TaggedClass<CheckingInventory>("CheckingInventory")("CheckingInventory", {
    sku: Schema.String
  }) {}

  class InventoryReserved extends Schema.TaggedClass<InventoryReserved>("InventoryReserved")("InventoryReserved", {
    reservationId: Schema.String
  }) {}

  class Shipping extends Schema.TaggedClass<Shipping>("Shipping")("Shipping", {
    address: Schema.String
  }) {}

  class QuotingShipping extends Schema.TaggedClass<QuotingShipping>("QuotingShipping")("QuotingShipping", {
    postalCode: Schema.String
  }) {}

  class ShippingQuoted extends Schema.TaggedClass<ShippingQuoted>("ShippingQuoted")("ShippingQuoted", {
    quoteId: Schema.String
  }) {}

  class Submit extends Schema.TaggedClass<Submit>("Submit")("Submit", {
    value: Schema.String
  }) {}

  class NonEmptySubmit extends Schema.TaggedClass<NonEmptySubmit>("NonEmptySubmit")("NonEmptySubmit", {
    value: Schema.NonEmptyString
  }) {}

  class RequestSucceeded extends Schema.TaggedClass<RequestSucceeded>("RequestSucceeded")("RequestSucceeded", {
    value: Schema.String
  }) {}

  class NonEmptyResolve extends Schema.TaggedClass<NonEmptyResolve>("NonEmptyResolve")("NonEmptyResolve", {
    value: Schema.NonEmptyString
  }) {}

  class NonEmptyEmit extends Schema.TaggedClass<NonEmptyEmit>("NonEmptyEmit")("NonEmptyEmit", {
    value: Schema.NonEmptyString
  }) {}

  class ParallelRoot extends Schema.TaggedClass<ParallelRoot>("ParallelRoot")("ParallelRoot", {
    id: Schema.String
  }) {}

  class ParallelLeftDone extends Schema.TaggedClass<ParallelLeftDone>("ParallelLeftDone")("ParallelLeftDone", {
    id: Schema.String
  }) {}

  class ParallelRightDone extends Schema.TaggedClass<ParallelRightDone>("ParallelRightDone")("ParallelRightDone", {
    id: Schema.String
  }) {}

  class RequestProgress extends Schema.TaggedClass<RequestProgress>("RequestProgress")("RequestProgress", {
    id: Schema.String,
    childState: Schema.String
  }) {}

  class ParentRequestProgress extends Schema.TaggedClass<ParentRequestProgress>("ParentRequestProgress")(
    "ParentRequestProgress",
    {
      id: Schema.String,
      loaded: Schema.Number
    }
  ) {}

  class RequestFailed extends Schema.TaggedClass<RequestFailed>("RequestFailed")("RequestFailed", {
    error: Schema.Any,
    cause: Schema.Any
  }) {}

  class Reset extends Schema.TaggedClass<Reset>("Reset")("Reset", {}) {}
  class Resolve extends Schema.TaggedClass<Resolve>("Resolve")("Resolve", {}) {}
  class Authorize extends Schema.TaggedClass<Authorize>("Authorize")("Authorize", {
    code: Schema.String
  }) {}
  class ReserveInventory extends Schema.TaggedClass<ReserveInventory>("ReserveInventory")("ReserveInventory", {
    reservationId: Schema.String
  }) {}
  class ChildPing extends Data.TaggedClass("ChildPing")<{
    readonly reply: Deferred.Deferred<void>
  }> {}

  const FlatInitial = Machine.defineStates({ Idle, Loading, Success, Failed }).initial
  const SuccessOutput = {
    schema: Success,
    type: "final",
    output: Schema.String
  } as const
  const FailedOutput = {
    schema: Failed,
    type: "final",
    output: Schema.String
  } as const
  const LowercaseInitial = Machine.defineStates({ idle: Idle, loading: Loading, success: Success }).initial
  const DuplicateInitial = Machine.defineStates({ a: Duplicate, b: Duplicate }).initial

  it.effect("make constructs the initial state from input", () =>
    Effect.gen(function*() {
      const states = Machine.defineStates({ Idle })
      const machine = Machine.make({
        states: states.states,
        events: [Submit],
        input: Input,
        initial: (input) => states.initial.Idle(new Idle({ userId: input.userId }))
      })

      const planned = yield* Machine.planInitial(machine, { userId: "user-1" })

      assert.strictEqual(Machine.isMachine(machine), true)
      assert.deepStrictEqual(planned.state.value, new Idle({ userId: "user-1" }))
    }))

  it("make stores the machine id", () => {
    const states = Machine.defineStates({ Idle, Loading })
    const machine = Machine.make({
      id: "UserMachine",
      states: states.states,
      events: [Submit],
      input: Input,
      initial: (input) => states.initial.Idle(new Idle({ userId: input.userId }))
    }).handle({
      Idle: {
        on: {
          Submit: Effect.fn(function*({ target }) {
            return target.full.Loading(new Loading({ requestId: "request-1" }))
          })
        }
      }
    })

    assert.strictEqual(machine.id, "UserMachine")
  })

  it("identifies the initial lifecycle event", () => {
    assert.strictEqual(Machine.isInitialEvent(Machine.InitialEvent), true)
    assert.strictEqual(Machine.isInitialEvent(new Submit({ value: "request-1" })), false)
  })

  it.effect("defineStates returns states accepted by make", () =>
    Effect.gen(function*() {
      const states = { idle: Idle, loading: Loading }
      const defined = Machine.defineStates(states)
      const machine = Machine.make({
        states: defined.states,
        events: [Submit],
        initial: () => defined.initial.idle(new Idle({ userId: "user-1" }))
      })

      const planned = yield* Machine.planInitial(machine)

      assert.strictEqual(defined.states, states)
      assert.strictEqual(planned.state.path, "idle")
      assert.deepStrictEqual(planned.state.value, new Idle({ userId: "user-1" }))
    }))

  it.effect("initial builder constructs effectful atomic initial snapshots", () =>
    Effect.gen(function*() {
      const states = Machine.defineStates({ Idle })
      const machine = Machine.make({
        states: states.states,
        events: [Submit],
        input: Input,
        initial: Effect.fn(function*({ userId }) {
          return states.initial.Idle(new Idle({ userId }))
        })
      })

      const planned = yield* Machine.planInitial(machine, { userId: "user-1" })

      assertStateSnapshot(planned.state, "Idle", new Idle({ userId: "user-1" }))
    }))

  it.effect("initial builder constructs compound initial snapshots", () =>
    Effect.gen(function*() {
      const states = Machine.defineStates({
        payment: {
          schema: Payment,
          initial: "entering",
          states: {
            entering: EnteringPayment,
            authorized: AuthorizedPayment
          }
        }
      })
      const payment = new Payment({ id: "payment-1" })
      const entering = new EnteringPayment({ amount: 100 })
      const machine = Machine.make({
        states: states.states,
        events: [Authorize],
        initial: () =>
          states.initial.payment(
            payment,
            (payment) => payment.entering(entering)
          )
      })

      const planned = yield* Machine.planInitial(machine)

      assertCompoundStateSnapshot(planned.state, "payment", payment, {
        path: "payment.entering",
        value: entering
      })
    }))

  it.effect("initial builder constructs parallel initial snapshots", () =>
    Effect.gen(function*() {
      const states = Machine.defineStates({
        fulfillment: {
          schema: Fulfillment,
          type: "parallel",
          states: {
            inventory: {
              schema: Inventory,
              initial: "checking",
              states: {
                checking: CheckingInventory,
                reserved: InventoryReserved
              }
            },
            shipping: {
              schema: Shipping,
              initial: "quoting",
              states: {
                quoting: QuotingShipping,
                quoted: ShippingQuoted
              }
            }
          }
        }
      })
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const checking = new CheckingInventory({ sku: "sku-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const machine = Machine.make({
        states: states.states,
        events: [ReserveInventory],
        initial: () =>
          states.initial.fulfillment(
            fulfillment,
            (fulfillment) =>
              fulfillment
                .inventory(
                  inventory,
                  (inventory) => inventory.checking(checking)
                )
                .shipping(
                  shipping,
                  (shipping) => shipping.quoting(quoting)
                )
          )
      })

      const planned = yield* Machine.planInitial(machine)

      assertParallelStateSnapshot(planned.state, "fulfillment", fulfillment, {
        inventory: {
          path: "fulfillment.inventory",
          value: inventory,
          state: {
            path: "fulfillment.inventory.checking",
            value: checking
          }
        },
        shipping: {
          path: "fulfillment.shipping",
          value: shipping,
          state: {
            path: "fulfillment.shipping.quoting",
            value: quoting
          }
        }
      })
    }))

  describe("runtime schema contracts", () => {
    it.effect("decodes input before initial state construction", () =>
      Effect.gen(function*() {
        const states = Machine.defineStates({ NonEmptyIdle })
        const machine = Machine.make({
          states: states.states,
          events: [NonEmptySubmit],
          input: NonEmptyInput,
          initial: (input) => states.initial.NonEmptyIdle(new NonEmptyIdle({ userId: input.userId }))
        })

        const error = yield* Effect.flip(Machine.planInitial(machine, { userId: "" as any }))

        assertMachineSchemaDecodeError(error, "input")
      }))

    it.effect("decodes initial state snapshots before accepting them", () =>
      Effect.gen(function*() {
        const states = Machine.defineStates({ NonEmptyIdle })
        const machine = Machine.make({
          states: states.states,
          events: [NonEmptySubmit],
          initial: () => states.initial.NonEmptyIdle(unsafeTagged({ _tag: "NonEmptyIdle", userId: "" }))
        })

        const error = yield* Effect.flip(Machine.planInitial(machine))

        assertMachineSchemaDecodeError(error, "state", { state: "NonEmptyIdle" })
      }))

    it.effect("decodes incoming events before handler selection", () =>
      Effect.gen(function*() {
        const states = Machine.defineStates({ NonEmptyIdle })
        const machine = Machine.make({
          states: states.states,
          events: [NonEmptySubmit],
          initial: () => states.initial.NonEmptyIdle(new NonEmptyIdle({ userId: "user-1" }))
        }).handle({
          NonEmptyIdle: {
            on: {
              NonEmptySubmit: ({ state, target }) => target.full.NonEmptyIdle(state)
            }
          }
        })

        const error = yield* Effect.flip(
          Machine.plan(
            machine,
            states.initial.NonEmptyIdle(new NonEmptyIdle({ userId: "user-1" })),
            unsafeTagged({ _tag: "NonEmptySubmit", value: "" })
          )
        )

        assertMachineSchemaDecodeError(error, "event", { event: "NonEmptySubmit" })
      }))

    it.effect("surfaces sent event decode failures through the machine lifecycle", () =>
      Effect.gen(function*() {
        const states = Machine.defineStates({ NonEmptyIdle })
        const machine = Machine.make({
          states: states.states,
          events: [NonEmptySubmit],
          initial: () => states.initial.NonEmptyIdle(new NonEmptyIdle({ userId: "user-1" }))
        }).handle({
          NonEmptyIdle: {
            on: {
              NonEmptySubmit: ({ state, target }) => target.full.NonEmptyIdle(state)
            }
          }
        })
        const actor = yield* Machine.start(machine)

        const snapshot = yield* sendAndWaitForSnapshot(
          actor,
          unsafeTagged({ _tag: "NonEmptySubmit", value: "" }),
          (snapshot) => snapshot.status === "error"
        )
        const error = yield* Effect.flip(actor.join)

        assertMachineSchemaDecodeError(error, "event", { event: "NonEmptySubmit" })
        assert.strictEqual(snapshot.status, "error")
        if (snapshot.status === "error") {
          const reason = snapshot.cause.reasons[0]
          assert.ok(reason !== undefined)
          assert.strictEqual(Cause.isFailReason(reason), true)
          if (Cause.isFailReason(reason)) {
            assertMachineSchemaDecodeError(reason.error, "event", { event: "NonEmptySubmit" })
          }
        }
      }))

    it.effect("decodes transition target values before accepting them", () =>
      Effect.gen(function*() {
        const states = Machine.defineStates({ NonEmptyIdle, NonEmptyLoading })
        const machine = Machine.make({
          states: states.states,
          events: [NonEmptySubmit],
          initial: () => states.initial.NonEmptyIdle(new NonEmptyIdle({ userId: "user-1" }))
        }).handle({
          NonEmptyIdle: {
            on: {
              NonEmptySubmit: ({ target }) =>
                target.full.NonEmptyLoading(unsafeTagged({ _tag: "NonEmptyLoading", requestId: "" }))
            }
          }
        })

        const error = yield* Effect.flip(
          Machine.plan(
            machine,
            states.initial.NonEmptyIdle(new NonEmptyIdle({ userId: "user-1" })),
            new NonEmptySubmit({ value: "request-1" })
          )
        )

        assertMachineSchemaDecodeError(error, "state", { state: "NonEmptyLoading" })
      }))

    it.effect("decodes final state output before caching it", () =>
      Effect.gen(function*() {
        const states = Machine.defineStates({
          NonEmptyIdle,
          done: {
            schema: NonEmptyDone,
            type: "final",
            output: Schema.NonEmptyString
          }
        })
        const machine = Machine.make({
          states: states.states,
          events: [NonEmptySubmit],
          initial: () => states.initial.NonEmptyIdle(new NonEmptyIdle({ userId: "user-1" }))
        }).handle({
          NonEmptyIdle: {
            on: {
              NonEmptySubmit: ({ event, target }) => target.full.done(new NonEmptyDone({ requestId: event.value }))
            }
          },
          done: {
            type: "final",
            output: () => "" as any
          }
        })

        const error = yield* Effect.flip(
          Machine.plan(
            machine,
            states.initial.NonEmptyIdle(new NonEmptyIdle({ userId: "user-1" })),
            new NonEmptySubmit({ value: "request-1" })
          )
        )

        assertMachineSchemaDecodeError(error, "output", { state: "done" })
      }))

    it.effect("decodes parallel state output before caching it", () =>
      Effect.gen(function*() {
        const states = Machine.defineStates({
          all: {
            schema: ParallelRoot,
            type: "parallel",
            output: Schema.Struct({ summary: Schema.NonEmptyString }),
            states: {
              left: {
                schema: ParallelLeftDone,
                type: "final"
              },
              right: {
                schema: ParallelRightDone,
                type: "final"
              }
            }
          }
        })
        const machine = Machine.make({
          states: states.states,
          events: [],
          initial: () =>
            states.initial.all(
              new ParallelRoot({ id: "all" }),
              (all) =>
                all
                  .left(new ParallelLeftDone({ id: "left" }))
                  .right(new ParallelRightDone({ id: "right" }))
            )
        }).handle({
          all: {
            output: () => ({ summary: "" as any })
          }
        })

        const error = yield* Effect.flip(Machine.planInitial(machine))

        assertMachineSchemaDecodeError(error, "output", { state: "all" })
      }))

    it.effect("decodes raised events before processing them", () =>
      Effect.gen(function*() {
        const states = Machine.defineStates({ NonEmptyIdle })
        const machine = Machine.make({
          states: states.states,
          events: [NonEmptySubmit, NonEmptyResolve],
          initial: () => states.initial.NonEmptyIdle(new NonEmptyIdle({ userId: "user-1" }))
        }).handle({
          NonEmptyIdle: {
            on: {
              NonEmptySubmit: ({ runtime }) =>
                Effect.flatMap(
                  runtime,
                  (machine) => machine.raise(unsafeTagged({ _tag: "NonEmptyResolve", value: "" }))
                )
            }
          }
        })

        const error = yield* Effect.flip(
          Machine.plan(
            machine,
            states.initial.NonEmptyIdle(new NonEmptyIdle({ userId: "user-1" })),
            new NonEmptySubmit({ value: "request-1" })
          )
        )

        assertMachineSchemaDecodeError(error, "event", { event: "NonEmptyResolve" })
      }))

    it.effect("reports malformed snapshots as configuration boundary errors", () =>
      Effect.gen(function*() {
        const states = Machine.defineStates({ NonEmptyIdle })
        const machine = Machine.make({
          states: states.states,
          events: [NonEmptySubmit],
          initial: () => states.initial.NonEmptyIdle(new NonEmptyIdle({ userId: "user-1" }))
        })

        const error = yield* Effect.flip(
          Machine.plan(
            machine,
            { path: "missing", value: new NonEmptyIdle({ userId: "user-1" }) } as any,
            new NonEmptySubmit({ value: "request-1" })
          )
        )

        assert.instanceOf(error, Machine.MachineSchemaDecodeError)
        assert.strictEqual(error.boundary, "configuration")
      }))

    it.effect("decodes emitted events before sending them to the parent", () =>
      Effect.gen(function*() {
        const states = Machine.defineStates({ NonEmptyIdle })
        const machine = Machine.make({
          states: states.states,
          events: [],
          emits: [NonEmptyEmit],
          initial: () => states.initial.NonEmptyIdle(new NonEmptyIdle({ userId: "user-1" }))
        }).handle({
          NonEmptyIdle: {
            entry: ({ runtime }) =>
              Effect.flatMap(
                runtime,
                (machine) => machine.sendParent(unsafeTagged({ _tag: "NonEmptyEmit", value: "" }))
              )
          }
        })

        const error = yield* Effect.flip(Machine.planInitial(machine))

        assertMachineSchemaDecodeError(error, "emit", { event: "NonEmptyEmit" })
      }))

    it.effect("plans emitted events without communicating with a parent", () =>
      Effect.gen(function*() {
        const states = Machine.defineStates({ NonEmptyIdle })
        const emitted = new NonEmptyEmit({ value: "ready" })
        const machine = Machine.make({
          states: states.states,
          events: [],
          emits: [NonEmptyEmit],
          initial: () => states.initial.NonEmptyIdle(new NonEmptyIdle({ userId: "user-1" }))
        }).handle({
          NonEmptyIdle: {
            entry: ({ emit }) => emit(emitted)
          }
        })

        const planned = yield* Machine.planInitial(machine)

        assert.deepStrictEqual(planned.emittedEvents, [emitted])
      }))
  })

  it.effect("supports flat object states with path-aware handlers", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: {
          idle: Idle,
          loading: Loading
        },
        events: [Submit],
        input: Input,
        initial: (input) => LowercaseInitial.idle(new Idle({ userId: input.userId }))
      }).handle({
        idle: {
          on: {
            Submit: ({ event, state, target }) =>
              target.full.loading(new Loading({ requestId: `${state.userId}:${event.value}` }))
          }
        }
      })

      const planned = yield* Machine.plan(
        machine,
        LowercaseInitial.idle(new Idle({ userId: "user-1" })),
        new Submit({ value: "request-1" })
      )

      assert.deepStrictEqual(planned.next.value, new Loading({ requestId: "user-1:request-1" }))
      assert.strictEqual(planned.next.path, "loading")
      assert.deepStrictEqual(Machine.enabled(machine, LowercaseInitial.idle(new Idle({ userId: "user-1" }))), [
        "Submit"
      ])
    }))

  it.effect("uses path identity for duplicate decoded state tags", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: {
          a: Duplicate,
          b: Duplicate
        },
        events: [Submit, Reset],
        initial: () => DuplicateInitial.a(new Duplicate({ value: "a" }))
      }).handle({
        a: {
          on: {
            Submit: ({ event, target }) => target.full.b(new Duplicate({ value: event.value }))
          }
        },
        b: {
          on: {
            Reset: ({ target }) => target.full.a(new Duplicate({ value: "reset" }))
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      assertStateSnapshot(initial.state, "a", new Duplicate({ value: "a" }))
      assert.deepStrictEqual(Machine.enabled(machine, initial.state), ["Submit"])
      assert.deepStrictEqual(
        Machine.enabled(machine, {
          path: "b",
          value: new Duplicate({ value: "b" })
        }),
        ["Reset"]
      )

      const submitted = yield* Machine.plan(machine, initial.state, new Submit({ value: "b" }))
      assertStateSnapshot(submitted.next, "b", new Duplicate({ value: "b" }))

      const reset = yield* Machine.plan(machine, submitted.next, new Reset({}))
      assertStateSnapshot(reset.next, "a", new Duplicate({ value: "reset" }))
    }))

  it.effect("exposes path identity through machine snapshots", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: {
          a: Duplicate,
          b: Duplicate
        },
        events: [Submit],
        initial: () => DuplicateInitial.a(new Duplicate({ value: "a" }))
      }).handle({
        a: {
          on: {
            Submit: ({ event, target }) => target.full.b(new Duplicate({ value: event.value }))
          }
        }
      })

      const actor = yield* Machine.start(machine)
      assertStateSnapshot(yield* actor.state, "a", new Duplicate({ value: "a" }))

      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new Submit({ value: "b" }),
        (snapshot) => snapshot.status === "active" && snapshot.state.path === "b"
      )
      assert.strictEqual(snapshot.status, "active")
      assertStateSnapshot(snapshot.state, "b", new Duplicate({ value: "b" }))
    }))

  it.effect("honors final flat object state node configs", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: {
          idle: Idle,
          success: {
            schema: Success,
            type: "final"
          }
        },
        events: [Submit],
        initial: () => LowercaseInitial.idle(new Idle({ userId: "user-1" }))
      }).handle({
        idle: {
          on: {
            Submit: ({ event, target }) => target.full.success(new Success({ requestId: event.value }))
          }
        }
      })

      const planned = yield* Machine.plan(
        machine,
        LowercaseInitial.idle(new Idle({ userId: "user-1" })),
        new Submit({ value: "request-1" })
      )

      assert.deepStrictEqual(planned.next.value, new Success({ requestId: "request-1" }))
      assert.strictEqual(planned.next.path, "success")
      assert.strictEqual(Machine.isFinal(machine, planned.next), true)
      assert.deepStrictEqual(Machine.enabled(machine, planned.next), [])
    }))

  it.effect("expands compound initial states and enters parent before child", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const initialPayment = new Payment({ id: "payment-1" })
      const initialEntering = new EnteringPayment({ amount: 100 })
      const machine = Machine.make({
        states: {
          payment: {
            schema: Payment,
            initial: "entering",
            states: {
              entering: EnteringPayment,
              authorized: {
                schema: AuthorizedPayment,
                type: "final",
                output: Schema.String
              }
            }
          }
        },
        events: [Authorize],
        initial: () => ({
          path: "payment",
          value: initialPayment,
          state: {
            path: "payment.entering" as const,
            value: initialEntering
          }
        })
      }).handle({
        payment: {
          entry: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("entry:payment"))
          }),
          states: {
            entering: {
              entry: Effect.fn(function*() {
                const deferredLog = yield* DeferredLog
                yield* Machine.action(deferredLog.push("entry:entering"))
              })
            }
          }
        }
      })

      const actor = yield* Machine.start(machine).pipe(Effect.provideService(DeferredLog, deferredLog))

      assertCompoundStateSnapshot(yield* actor.state, "payment", initialPayment, {
        path: "payment.entering" as const,
        value: initialEntering
      })
      assert.deepStrictEqual(yield* deferredLog.read, ["entry:payment", "entry:entering"])
    }))

  it.effect("selects child handlers before ancestor handlers", () =>
    Effect.gen(function*() {
      const payment = new Payment({ id: "payment-1" })
      const entering = new EnteringPayment({ amount: 100 })
      const machine = Machine.make({
        states: {
          payment: {
            schema: Payment,
            initial: "entering",
            states: {
              entering: EnteringPayment,
              authorized: AuthorizedPayment
            }
          },
          failed: Failed
        },
        events: [Authorize],
        initial: () => ({
          path: "payment",
          value: payment,
          state: {
            path: "payment.entering" as const,
            value: entering
          }
        })
      }).handle({
        payment: {
          on: {
            Authorize: ({ target }) => target.full.failed(new Failed({ message: "parent" }))
          },
          states: {
            entering: {
              on: {
                Authorize: ({ event, target }) => target.local.authorized(new AuthorizedPayment({ code: event.code }))
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new Authorize({ code: "auth-1" }))

      assertCompoundStateSnapshot(planned.next as any, "payment", payment, {
        path: "payment.authorized" as const,
        value: new AuthorizedPayment({ code: "auth-1" })
      })
    }))

  it.effect("handles parent config and nested states in the same object", () =>
    Effect.gen(function*() {
      const payment = new Payment({ id: "payment-1" })
      const entering = new EnteringPayment({ amount: 100 })
      const machine = Machine.make({
        states: {
          payment: {
            schema: Payment,
            initial: "entering",
            states: {
              entering: EnteringPayment,
              authorized: {
                schema: AuthorizedPayment,
                type: "final",
                output: Schema.String
              }
            }
          },
          failed: Failed
        },
        events: [Authorize, Reset],
        initial: () => ({
          path: "payment",
          value: payment,
          state: {
            path: "payment.entering" as const,
            value: entering
          }
        })
      }).handle({
        payment: {
          on: {
            Reset: ({ target }) => target.full.failed(new Failed({ message: "reset" }))
          },
          states: {
            entering: {
              on: {
                Authorize: ({ event, target }) => target.local.authorized(new AuthorizedPayment({ code: event.code }))
              }
            },
            authorized: {
              type: "final",
              output: ({ state }) => state.code
            }
          }
        }
      })

      assert.strictEqual("payment" in machine.handlers, true)
      assert.strictEqual("payment.entering" in machine.handlers, true)
      assert.strictEqual("payment.authorized" in machine.handlers, true)

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new Authorize({ code: "auth-1" }))

      assertCompoundStateSnapshot(planned.next as any, "payment", payment, {
        path: "payment.authorized" as const,
        value: new AuthorizedPayment({ code: "auth-1" })
      })
      assert.strictEqual(Machine.isFinal(machine, planned.next), true)
      assert.strictEqual(planned.output, "auth-1")
    }))

  it.effect("lets ancestor handlers catch events from active descendants", () =>
    Effect.gen(function*() {
      const payment = new Payment({ id: "payment-1" })
      const entering = new EnteringPayment({ amount: 100 })
      const machine = Machine.make({
        states: {
          idle: Idle,
          payment: {
            schema: Payment,
            initial: "entering",
            states: {
              entering: EnteringPayment,
              authorized: AuthorizedPayment
            }
          }
        },
        events: [Reset],
        initial: () => ({
          path: "payment",
          value: payment,
          state: {
            path: "payment.entering" as const,
            value: entering
          }
        })
      }).handle({
        payment: {
          on: {
            Reset: ({ target }) => target.full.idle(new Idle({ userId: "user-1" }))
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      assert.deepStrictEqual(Machine.enabled(machine, initial.state), ["Reset"])

      const planned = yield* Machine.plan(machine, initial.state, new Reset({}))

      assertStateSnapshot(planned.next as any, "idle", new Idle({ userId: "user-1" }))
    }))

  it.effect("runs compound exits deepest-first and entries parent-first", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: {
          idle: Idle,
          payment: {
            schema: Payment,
            initial: "entering",
            states: {
              entering: EnteringPayment,
              authorized: AuthorizedPayment
            }
          }
        },
        events: [Reset],
        initial: () => ({
          path: "payment",
          value: new Payment({ id: "payment-1" }),
          state: {
            path: "payment.entering" as const,
            value: new EnteringPayment({ amount: 100 })
          }
        })
      }).handle({
        idle: {
          entry: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("entry:idle"))
          })
        },
        payment: {
          entry: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("entry:payment"))
          }),
          exit: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("exit:payment"))
          }),
          on: {
            Reset: ({ target }) => target.full.idle(new Idle({ userId: "user-1" }))
          },
          states: {
            entering: {
              entry: Effect.fn(function*() {
                const deferredLog = yield* DeferredLog
                yield* Machine.action(deferredLog.push("entry:entering"))
              }),
              exit: Effect.fn(function*() {
                const deferredLog = yield* DeferredLog
                yield* Machine.action(deferredLog.push("exit:entering"))
              })
            }
          }
        }
      })

      const actor = yield* Machine.start(machine).pipe(Effect.provideService(DeferredLog, deferredLog))

      yield* sendAndWaitForSnapshot(
        actor,
        new Reset({}),
        (snapshot) => snapshot.status === "active" && snapshot.state.path === "idle"
      )
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* deferredLog.read, [
        "entry:payment",
        "entry:entering",
        "exit:entering",
        "exit:payment",
        "entry:idle"
      ])
    }))

  it.effect("preserves parent values for same-parent child transitions", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const payment = new Payment({ id: "payment-1" })
      const machine = Machine.make({
        states: {
          payment: {
            schema: Payment,
            initial: "entering",
            states: {
              entering: EnteringPayment,
              authorized: AuthorizedPayment
            }
          }
        },
        events: [Authorize],
        initial: () => ({
          path: "payment",
          value: payment,
          state: {
            path: "payment.entering" as const,
            value: new EnteringPayment({ amount: 100 })
          }
        })
      }).handle({
        payment: {
          entry: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("entry:payment"))
          }),
          exit: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("exit:payment"))
          }),
          states: {
            entering: {
              exit: Effect.fn(function*() {
                const deferredLog = yield* DeferredLog
                yield* Machine.action(deferredLog.push("exit:entering"))
              }),
              on: {
                Authorize: ({ event, target }) => target.local.authorized(new AuthorizedPayment({ code: event.code }))
              }
            },
            authorized: {
              entry: Effect.fn(function*() {
                const deferredLog = yield* DeferredLog
                yield* Machine.action(deferredLog.push("entry:authorized"))
              })
            }
          }
        }
      })

      const actor = yield* Machine.start(machine).pipe(Effect.provideService(DeferredLog, deferredLog))
      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new Authorize({ code: "auth-1" }),
        (snapshot) => {
          const state = snapshot.state as any
          return snapshot.status === "active" && state.path === "payment" && state.state.path === "payment.authorized"
        }
      )
      yield* Effect.yieldNow

      assert.strictEqual(snapshot.status, "active")
      assertCompoundStateSnapshot(snapshot.state as any, "payment", payment, {
        path: "payment.authorized" as const,
        value: new AuthorizedPayment({ code: "auth-1" })
      })
      assert.deepStrictEqual(yield* deferredLog.read, [
        "entry:payment",
        "exit:entering",
        "entry:authorized"
      ])
    }))

  it.effect("uses target.full when targeting a nested state from outside", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: {
          idle: Idle,
          payment: {
            schema: Payment,
            initial: "entering",
            states: {
              entering: EnteringPayment,
              authorized: AuthorizedPayment
            }
          }
        },
        events: [Submit],
        initial: () => LowercaseInitial.idle(new Idle({ userId: "user-1" }))
      }).handle({
        idle: {
          on: {
            Submit: ({ event, target }) =>
              target.full.payment(
                new Payment({ id: event.value }),
                (payment) => payment.entering(new EnteringPayment({ amount: event.value.length }))
              )
          }
        },
        payment: {
          entry: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("entry:payment"))
          }),
          states: {
            entering: {
              entry: Effect.fn(function*() {
                const deferredLog = yield* DeferredLog
                yield* Machine.action(deferredLog.push("entry:entering"))
              })
            }
          }
        }
      })

      const actor = yield* Machine.start(machine).pipe(Effect.provideService(DeferredLog, deferredLog))
      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new Submit({ value: "payment-1" }),
        (snapshot) => snapshot.status === "active" && snapshot.state.path === "payment"
      )
      yield* Effect.yieldNow

      assert.strictEqual(snapshot.status, "active")
      assertCompoundStateSnapshot(snapshot.state as any, "payment", new Payment({ id: "payment-1" }), {
        path: "payment.entering" as const,
        value: new EnteringPayment({ amount: "payment-1".length })
      })
      assert.deepStrictEqual(yield* deferredLog.read, ["entry:payment", "entry:entering"])
    }))

  it.effect("uses target.full to enter an inactive parallel root", () =>
    Effect.gen(function*() {
      const states = Machine.defineStates({
        idle: Idle,
        fulfillment: {
          schema: Fulfillment,
          type: "parallel",
          states: {
            inventory: {
              schema: Inventory,
              initial: "checking",
              states: {
                checking: CheckingInventory,
                reserved: {
                  schema: InventoryReserved,
                  type: "final"
                }
              }
            },
            shipping: {
              schema: Shipping,
              initial: "quoting",
              states: {
                quoting: QuotingShipping,
                quoted: {
                  schema: ShippingQuoted,
                  type: "final"
                }
              }
            }
          }
        }
      })
      const machine = Machine.make({
        states: states.states,
        events: [Submit],
        initial: () => states.initial.idle(new Idle({ userId: "user-1" }))
      }).handle({
        idle: {
          on: {
            Submit: ({ event, target }) =>
              target.full.fulfillment(
                new Fulfillment({ id: event.value }),
                (fulfillment) =>
                  fulfillment
                    .inventory(
                      new Inventory({ warehouse: "warehouse-1" }),
                      (inventory) => inventory.reserved(new InventoryReserved({ reservationId: event.value }))
                    )
                    .shipping(
                      new Shipping({ address: "Main Street" }),
                      (shipping) => shipping.quoted(new ShippingQuoted({ quoteId: event.value }))
                    )
              )
          }
        }
      })

      const planned = yield* Machine.plan(
        machine,
        states.initial.idle(new Idle({ userId: "user-1" })),
        new Submit({ value: "order-1" })
      )

      assertParallelStateSnapshot(planned.next as any, "fulfillment", new Fulfillment({ id: "order-1" }), {
        inventory: {
          path: "fulfillment.inventory",
          value: new Inventory({ warehouse: "warehouse-1" }),
          state: {
            path: "fulfillment.inventory.reserved",
            value: new InventoryReserved({ reservationId: "order-1" })
          }
        },
        shipping: {
          path: "fulfillment.shipping",
          value: new Shipping({ address: "Main Street" }),
          state: {
            path: "fulfillment.shipping.quoted",
            value: new ShippingQuoted({ quoteId: "order-1" })
          }
        }
      })
      assert.deepStrictEqual(planned.microsteps[0]?.entryPaths, [
        "fulfillment",
        "fulfillment.inventory",
        "fulfillment.shipping",
        "fulfillment.inventory.reserved",
        "fulfillment.shipping.quoted"
      ])
    }))

  it.effect("uses target.local to preserve parent and sibling parallel region values", () =>
    Effect.gen(function*() {
      const states = Machine.defineStates({
        fulfillment: {
          schema: Fulfillment,
          type: "parallel",
          states: {
            inventory: {
              schema: Inventory,
              initial: "checking",
              states: {
                checking: CheckingInventory,
                reserved: InventoryReserved
              }
            },
            shipping: {
              schema: Shipping,
              initial: "quoting",
              states: {
                quoting: QuotingShipping,
                quoted: ShippingQuoted
              }
            }
          }
        }
      })
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const machine = Machine.make({
        states: states.states,
        events: [ReserveInventory],
        initial: () =>
          states.initial.fulfillment(
            fulfillment,
            (fulfillment) =>
              fulfillment
                .inventory(
                  inventory,
                  (inventory) => inventory.checking(new CheckingInventory({ sku: "sku-1" }))
                )
                .shipping(
                  shipping,
                  (shipping) => shipping.quoting(quoting)
                )
          )
      }).handle({
        fulfillment: {
          states: {
            inventory: {
              states: {
                checking: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.local.reserved(new InventoryReserved({ reservationId: event.reservationId }))
                  }
                }
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new ReserveInventory({ reservationId: "res-1" }))

      assertParallelStateSnapshot(planned.next as any, "fulfillment", fulfillment, {
        inventory: {
          path: "fulfillment.inventory",
          value: inventory,
          state: {
            path: "fulfillment.inventory.reserved",
            value: new InventoryReserved({ reservationId: "res-1" })
          }
        },
        shipping: {
          path: "fulfillment.shipping",
          value: shipping,
          state: {
            path: "fulfillment.shipping.quoting",
            value: quoting
          }
        }
      })
    }))

  it.effect("uses target.local.with to replace the local compound value", () =>
    Effect.gen(function*() {
      const states = Machine.defineStates({
        fulfillment: {
          schema: Fulfillment,
          type: "parallel",
          states: {
            inventory: {
              schema: Inventory,
              initial: "checking",
              states: {
                checking: CheckingInventory,
                reserved: InventoryReserved
              }
            },
            shipping: {
              schema: Shipping,
              initial: "quoting",
              states: {
                quoting: QuotingShipping,
                quoted: ShippingQuoted
              }
            }
          }
        }
      })
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const nextInventory = new Inventory({ warehouse: "warehouse-2" })
      const machine = Machine.make({
        states: states.states,
        events: [ReserveInventory],
        initial: () =>
          states.initial.fulfillment(
            fulfillment,
            (fulfillment) =>
              fulfillment
                .inventory(
                  new Inventory({ warehouse: "warehouse-1" }),
                  (inventory) => inventory.checking(new CheckingInventory({ sku: "sku-1" }))
                )
                .shipping(
                  shipping,
                  (shipping) => shipping.quoting(quoting)
                )
          )
      }).handle({
        fulfillment: {
          states: {
            inventory: {
              states: {
                checking: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.local.with(
                        nextInventory,
                        (inventory) => inventory.reserved(new InventoryReserved({ reservationId: event.reservationId }))
                      )
                  }
                }
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new ReserveInventory({ reservationId: "res-1" }))

      assertParallelStateSnapshot(planned.next as any, "fulfillment", fulfillment, {
        inventory: {
          path: "fulfillment.inventory",
          value: nextInventory,
          state: {
            path: "fulfillment.inventory.reserved",
            value: new InventoryReserved({ reservationId: "res-1" })
          }
        },
        shipping: {
          path: "fulfillment.shipping",
          value: shipping,
          state: {
            path: "fulfillment.shipping.quoting",
            value: quoting
          }
        }
      })
    }))

  it.effect("uses target.branch to replace one parallel region while preserving siblings", () =>
    Effect.gen(function*() {
      const states = Machine.defineStates({
        fulfillment: {
          schema: Fulfillment,
          type: "parallel",
          states: {
            inventory: {
              schema: Inventory,
              initial: "checking",
              states: {
                checking: CheckingInventory,
                reserved: InventoryReserved
              }
            },
            shipping: {
              schema: Shipping,
              initial: "quoting",
              states: {
                quoting: QuotingShipping,
                quoted: ShippingQuoted
              }
            }
          }
        }
      })
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const nextInventory = new Inventory({ warehouse: "warehouse-2" })
      const machine = Machine.make({
        states: states.states,
        events: [ReserveInventory],
        initial: () =>
          states.initial.fulfillment(
            fulfillment,
            (fulfillment) =>
              fulfillment
                .inventory(
                  inventory,
                  (inventory) => inventory.checking(new CheckingInventory({ sku: "sku-1" }))
                )
                .shipping(
                  shipping,
                  (shipping) => shipping.quoting(quoting)
                )
          )
      }).handle({
        fulfillment: {
          states: {
            inventory: {
              states: {
                checking: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.branch.fulfillment.inventory(
                        nextInventory,
                        (inventory) => inventory.reserved(new InventoryReserved({ reservationId: event.reservationId }))
                      )
                  }
                }
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new ReserveInventory({ reservationId: "res-1" }))

      assertParallelStateSnapshot(planned.next as any, "fulfillment", fulfillment, {
        inventory: {
          path: "fulfillment.inventory",
          value: nextInventory,
          state: {
            path: "fulfillment.inventory.reserved",
            value: new InventoryReserved({ reservationId: "res-1" })
          }
        },
        shipping: {
          path: "fulfillment.shipping",
          value: shipping,
          state: {
            path: "fulfillment.shipping.quoting",
            value: quoting
          }
        }
      })
    }))

  it.effect("uses target.branch to replace root and nested region values", () =>
    Effect.gen(function*() {
      const states = Machine.defineStates({
        fulfillment: {
          schema: Fulfillment,
          type: "parallel",
          states: {
            inventory: {
              schema: Inventory,
              initial: "checking",
              states: {
                checking: CheckingInventory,
                reserved: InventoryReserved
              }
            },
            shipping: {
              schema: Shipping,
              initial: "quoting",
              states: {
                quoting: QuotingShipping,
                quoted: ShippingQuoted
              }
            }
          }
        }
      })
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const nextFulfillment = new Fulfillment({ id: "fulfillment-2" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const nextInventory = new Inventory({ warehouse: "warehouse-2" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const machine = Machine.make({
        states: states.states,
        events: [ReserveInventory],
        initial: () =>
          states.initial.fulfillment(
            fulfillment,
            (fulfillment) =>
              fulfillment
                .inventory(
                  inventory,
                  (inventory) => inventory.checking(new CheckingInventory({ sku: "sku-1" }))
                )
                .shipping(
                  shipping,
                  (shipping) => shipping.quoting(quoting)
                )
          )
      }).handle({
        fulfillment: {
          states: {
            inventory: {
              states: {
                checking: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.branch.fulfillment(
                        nextFulfillment,
                        (fulfillment) =>
                          fulfillment.inventory(
                            nextInventory,
                            (inventory) =>
                              inventory.reserved(new InventoryReserved({ reservationId: event.reservationId }))
                          )
                      )
                  }
                }
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new ReserveInventory({ reservationId: "res-1" }))

      assertParallelStateSnapshot(planned.next as any, "fulfillment", nextFulfillment, {
        inventory: {
          path: "fulfillment.inventory",
          value: nextInventory,
          state: {
            path: "fulfillment.inventory.reserved",
            value: new InventoryReserved({ reservationId: "res-1" })
          }
        },
        shipping: {
          path: "fulfillment.shipping",
          value: shipping,
          state: {
            path: "fulfillment.shipping.quoting",
            value: quoting
          }
        }
      })
    }))

  it.effect("uses target.branch from a compound descendant to a sibling descendant", () =>
    Effect.gen(function*() {
      const states = Machine.defineStates({
        payment: {
          schema: Payment,
          initial: "inventory",
          states: {
            inventory: {
              schema: Inventory,
              initial: "checking",
              states: {
                checking: CheckingInventory,
                reserved: InventoryReserved
              }
            },
            shipping: {
              schema: Shipping,
              initial: "quoting",
              states: {
                quoting: QuotingShipping,
                quoted: ShippingQuoted
              }
            }
          }
        }
      })
      const payment = new Payment({ id: "payment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const machine = Machine.make({
        states: states.states,
        events: [ReserveInventory],
        initial: () =>
          states.initial.payment(
            payment,
            (payment) =>
              payment.inventory(
                inventory,
                (inventory) => inventory.checking(new CheckingInventory({ sku: "sku-1" }))
              )
          )
      }).handle({
        payment: {
          states: {
            inventory: {
              states: {
                checking: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.branch.payment.shipping(
                        shipping,
                        (shipping) => shipping.quoted(new ShippingQuoted({ quoteId: event.reservationId }))
                      )
                  }
                }
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(
        machine,
        initial.state,
        new ReserveInventory({ reservationId: "quote-1" })
      )

      assertCompoundStateSnapshot(planned.next as any, "payment", payment, {
        path: "payment.shipping",
        value: shipping,
        state: {
          path: "payment.shipping.quoted",
          value: new ShippingQuoted({ quoteId: "quote-1" })
        }
      })
    }))

  it.effect("treats compound states as final when their active child is final", () =>
    Effect.gen(function*() {
      const payment = new Payment({ id: "payment-1" })
      const machine = Machine.make({
        states: {
          payment: {
            schema: Payment,
            initial: "entering",
            states: {
              entering: EnteringPayment,
              authorized: {
                schema: AuthorizedPayment,
                type: "final",
                output: Schema.String
              }
            }
          }
        },
        events: [Authorize, Reset],
        initial: () => ({
          path: "payment",
          value: payment,
          state: {
            path: "payment.entering" as const,
            value: new EnteringPayment({ amount: 100 })
          }
        })
      }).handle({
        payment: {
          on: {
            Reset: ({ target }) => target.local.entering(new EnteringPayment({ amount: 0 }))
          },
          states: {
            entering: {
              on: {
                Authorize: ({ event, target }) => target.local.authorized(new AuthorizedPayment({ code: event.code }))
              }
            },
            authorized: {
              type: "final",
              output: ({ state }) => state.code
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new Authorize({ code: "auth-1" }))

      assertCompoundStateSnapshot(planned.next as any, "payment", payment, {
        path: "payment.authorized" as const,
        value: new AuthorizedPayment({ code: "auth-1" })
      })
      assert.strictEqual(Machine.isFinal(machine, planned.next), true)
      assert.deepStrictEqual(Machine.enabled(machine, planned.next), [])
      assert.strictEqual(planned.output, "auth-1")
    }))

  it.effect("produces output from an initially active nested final state", () =>
    Effect.gen(function*() {
      const payment = new Payment({ id: "payment-1" })
      const authorized = new AuthorizedPayment({ code: "auth-1" })
      const machine = Machine.make({
        states: {
          payment: {
            schema: Payment,
            initial: "authorized",
            states: {
              authorized: {
                schema: AuthorizedPayment,
                type: "final",
                output: Schema.String
              }
            }
          }
        },
        events: [Reset],
        initial: () => ({
          path: "payment",
          value: payment,
          state: {
            path: "payment.authorized" as const,
            value: authorized
          }
        })
      }).handle({
        payment: {
          states: {
            authorized: {
              type: "final",
              output: ({ state }) => state.code
            }
          }
        }
      })

      const planned = yield* Machine.planInitial(machine)

      assertCompoundStateSnapshot(planned.state as any, "payment", payment, {
        path: "payment.authorized" as const,
        value: authorized
      })
      assert.strictEqual(Machine.isFinal(machine, planned.state), true)
      assert.deepStrictEqual(Machine.enabled(machine, planned.state), [])
      assert.strictEqual(planned.output, "auth-1")
    }))

  it.effect("joins with output from nested final completion and rejects later events", () =>
    Effect.gen(function*() {
      const payment = new Payment({ id: "payment-1" })
      const machine = Machine.make({
        states: {
          idle: Idle,
          payment: {
            schema: Payment,
            initial: "entering",
            states: {
              entering: EnteringPayment,
              authorized: {
                schema: AuthorizedPayment,
                type: "final",
                output: Schema.String
              }
            }
          }
        },
        events: [Authorize, Reset],
        initial: () => ({
          path: "payment",
          value: payment,
          state: {
            path: "payment.entering" as const,
            value: new EnteringPayment({ amount: 100 })
          }
        })
      }).handle({
        payment: {
          on: {
            Reset: ({ target }) => target.full.idle(new Idle({ userId: "user-1" }))
          },
          states: {
            entering: {
              on: {
                Authorize: ({ event, target }) => target.local.authorized(new AuthorizedPayment({ code: event.code }))
              }
            },
            authorized: {
              type: "final",
              output: ({ state }) => state.code
            }
          }
        }
      })

      const actor = yield* Machine.start(machine)

      yield* actor.send(new Authorize({ code: "auth-1" }))
      assert.strictEqual(yield* actor.join, "auth-1")
      assert.instanceOf(yield* Effect.flip(actor.send(new Reset({}))), Machine.StoppedError)

      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: {
          path: "payment",
          value: payment,
          state: {
            path: "payment.authorized",
            value: new AuthorizedPayment({ code: "auth-1" })
          }
        },
        output: "auth-1"
      })
    }))

  it.effect("does not process raised events from nested final state entry actions", () =>
    Effect.gen(function*() {
      const payment = new Payment({ id: "payment-1" })
      const machine = Machine.make({
        states: {
          payment: {
            schema: Payment,
            initial: "entering",
            states: {
              entering: EnteringPayment,
              authorized: {
                schema: AuthorizedPayment,
                type: "final"
              }
            }
          },
          failed: Failed
        },
        events: [Authorize, Reset],
        initial: () => ({
          path: "payment",
          value: payment,
          state: {
            path: "payment.entering" as const,
            value: new EnteringPayment({ amount: 100 })
          }
        })
      }).handle({
        payment: {
          on: {
            Reset: ({ target }) => target.full.failed(new Failed({ message: "raised" }))
          },
          states: {
            entering: {
              on: {
                Authorize: ({ event, target }) => target.local.authorized(new AuthorizedPayment({ code: event.code }))
              }
            },
            authorized: {
              type: "final",
              entry: ({ runtime }) => Effect.flatMap(runtime, (machine) => machine.raise(new Reset({})))
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new Authorize({ code: "auth-1" }))

      assertCompoundStateSnapshot(planned.next as any, "payment", payment, {
        path: "payment.authorized" as const,
        value: new AuthorizedPayment({ code: "auth-1" })
      })
      assert.strictEqual(Machine.isFinal(machine, planned.next), true)
    }))

  it.effect("runs onDone for nested compound completion without completing the root state", () =>
    Effect.gen(function*() {
      const checkout = new Fulfillment({ id: "checkout-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const machine = Machine.make({
        states: {
          checkout: {
            schema: Fulfillment,
            initial: "inventory",
            states: {
              inventory: {
                schema: Inventory,
                initial: "checking",
                states: {
                  checking: CheckingInventory,
                  reserved: {
                    schema: InventoryReserved,
                    type: "final",
                    output: Schema.String
                  }
                }
              },
              shipped: ShippingQuoted
            }
          },
          failed: Failed
        },
        events: [ReserveInventory, Reset],
        initial: () => ({
          path: "checkout",
          value: checkout,
          state: {
            path: "checkout.inventory" as const,
            value: inventory,
            state: {
              path: "checkout.inventory.checking" as const,
              value: new CheckingInventory({ sku: "sku-1" })
            }
          }
        })
      }).handle({
        checkout: {
          on: {
            Reset: ({ target }) => target.full.failed(new Failed({ message: "reset" }))
          },
          states: {
            inventory: {
              onDone: ({ output, target }) =>
                target.branch.checkout.shipped(new ShippingQuoted({ quoteId: String(output) })),
              states: {
                checking: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.local.reserved(new InventoryReserved({ reservationId: event.reservationId }))
                  }
                },
                reserved: {
                  type: "final",
                  output: ({ state }) => state.reservationId
                }
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new ReserveInventory({ reservationId: "res-1" }))

      assertCompoundStateSnapshot(planned.next as any, "checkout", checkout, {
        path: "checkout.shipped",
        value: new ShippingQuoted({ quoteId: "res-1" })
      })
      assert.strictEqual(Machine.isFinal(machine, planned.next), false)
      assert.deepStrictEqual(Machine.enabled(machine, planned.next), ["Reset"])
      assert.strictEqual(planned.output, undefined)
    }))

  it.effect("does not run a completed state's onDone handler more than once in the same macrostep", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const checkout = new Fulfillment({ id: "checkout-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const machine = Machine.make({
        states: {
          checkout: {
            schema: Fulfillment,
            initial: "inventory",
            states: {
              inventory: {
                schema: Inventory,
                initial: "checking",
                states: {
                  checking: CheckingInventory,
                  reserved: {
                    schema: InventoryReserved,
                    type: "final"
                  }
                }
              }
            }
          },
          failed: Failed
        },
        events: [ReserveInventory, Reset],
        initial: () => ({
          path: "checkout",
          value: checkout,
          state: {
            path: "checkout.inventory" as const,
            value: inventory,
            state: {
              path: "checkout.inventory.checking" as const,
              value: new CheckingInventory({ sku: "sku-1" })
            }
          }
        })
      }).handle({
        checkout: {
          on: {
            Reset: ({ target }) => target.full.failed(new Failed({ message: "raised" }))
          },
          states: {
            inventory: {
              onDone: Effect.fn(function*() {
                const deferredLog = yield* DeferredLog
                yield* deferredLog.push("done:inventory")
              }),
              states: {
                checking: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.local.reserved(new InventoryReserved({ reservationId: event.reservationId }))
                  }
                },
                reserved: {
                  type: "final",
                  entry: ({ runtime }) => Effect.flatMap(runtime, (machine) => machine.raise(new Reset({})))
                }
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine).pipe(Effect.provideService(DeferredLog, deferredLog))
      const planned = yield* Machine.plan(machine, initial.state, new ReserveInventory({ reservationId: "res-1" }))
        .pipe(Effect.provideService(DeferredLog, deferredLog))

      assertStateSnapshot(planned.next as any, "failed", new Failed({ message: "raised" }))
      assert.deepStrictEqual(yield* deferredLog.read, ["done:inventory"])
    }))

  it.effect("expands parallel initial states and enters all regions", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const checking = new CheckingInventory({ sku: "sku-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const machine = Machine.make({
        states: {
          fulfillment: {
            schema: Fulfillment,
            type: "parallel",
            states: {
              inventory: {
                schema: Inventory,
                initial: "checking",
                states: {
                  checking: CheckingInventory,
                  reserved: {
                    schema: InventoryReserved,
                    type: "final"
                  }
                }
              },
              shipping: {
                schema: Shipping,
                initial: "quoting",
                states: {
                  quoting: QuotingShipping,
                  quoted: {
                    schema: ShippingQuoted,
                    type: "final"
                  }
                }
              }
            }
          }
        },
        events: [ReserveInventory],
        initial: () => ({
          path: "fulfillment",
          value: fulfillment,
          states: {
            inventory: {
              path: "fulfillment.inventory" as const,
              value: inventory,
              state: {
                path: "fulfillment.inventory.checking" as const,
                value: checking
              }
            },
            shipping: {
              path: "fulfillment.shipping" as const,
              value: shipping,
              state: {
                path: "fulfillment.shipping.quoting" as const,
                value: quoting
              }
            }
          }
        })
      }).handle({
        fulfillment: {
          entry: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("entry:fulfillment"))
          }),
          states: {
            inventory: {
              entry: Effect.fn(function*() {
                const deferredLog = yield* DeferredLog
                yield* Machine.action(deferredLog.push("entry:inventory"))
              }),
              states: {
                checking: {
                  entry: Effect.fn(function*() {
                    const deferredLog = yield* DeferredLog
                    yield* Machine.action(deferredLog.push("entry:checking"))
                  })
                }
              }
            },
            shipping: {
              entry: Effect.fn(function*() {
                const deferredLog = yield* DeferredLog
                yield* Machine.action(deferredLog.push("entry:shipping"))
              }),
              states: {
                quoting: {
                  entry: Effect.fn(function*() {
                    const deferredLog = yield* DeferredLog
                    yield* Machine.action(deferredLog.push("entry:quoting"))
                  })
                }
              }
            }
          }
        }
      })

      const actor = yield* Machine.start(machine).pipe(Effect.provideService(DeferredLog, deferredLog))

      assertParallelStateSnapshot(yield* actor.state, "fulfillment", fulfillment, {
        inventory: {
          path: "fulfillment.inventory",
          value: inventory,
          state: {
            path: "fulfillment.inventory.checking",
            value: checking
          }
        },
        shipping: {
          path: "fulfillment.shipping",
          value: shipping,
          state: {
            path: "fulfillment.shipping.quoting",
            value: quoting
          }
        }
      })
      assert.deepStrictEqual(yield* deferredLog.read, [
        "entry:fulfillment",
        "entry:inventory",
        "entry:checking",
        "entry:shipping",
        "entry:quoting"
      ])
    }))

  it.effect("updates one parallel region while preserving sibling regions and parent value", () =>
    Effect.gen(function*() {
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const machine = Machine.make({
        states: {
          fulfillment: {
            schema: Fulfillment,
            type: "parallel",
            states: {
              inventory: {
                schema: Inventory,
                initial: "checking",
                states: {
                  checking: CheckingInventory,
                  reserved: {
                    schema: InventoryReserved,
                    type: "final"
                  }
                }
              },
              shipping: {
                schema: Shipping,
                initial: "quoting",
                states: {
                  quoting: QuotingShipping,
                  quoted: {
                    schema: ShippingQuoted,
                    type: "final",
                    output: Schema.String
                  }
                }
              }
            }
          }
        },
        events: [ReserveInventory],
        initial: () => ({
          path: "fulfillment",
          value: fulfillment,
          states: {
            inventory: {
              path: "fulfillment.inventory" as const,
              value: inventory,
              state: {
                path: "fulfillment.inventory.checking" as const,
                value: new CheckingInventory({ sku: "sku-1" })
              }
            },
            shipping: {
              path: "fulfillment.shipping" as const,
              value: shipping,
              state: {
                path: "fulfillment.shipping.quoting" as const,
                value: quoting
              }
            }
          }
        })
      }).handle({
        fulfillment: {
          states: {
            inventory: {
              states: {
                checking: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.local.reserved(new InventoryReserved({ reservationId: event.reservationId }))
                  }
                }
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new ReserveInventory({ reservationId: "res-1" }))

      assertParallelStateSnapshot(planned.next as any, "fulfillment", fulfillment, {
        inventory: {
          path: "fulfillment.inventory",
          value: inventory,
          state: {
            path: "fulfillment.inventory.reserved",
            value: new InventoryReserved({ reservationId: "res-1" })
          }
        },
        shipping: {
          path: "fulfillment.shipping",
          value: shipping,
          state: {
            path: "fulfillment.shipping.quoting",
            value: quoting
          }
        }
      })
      assert.strictEqual(Machine.isFinal(machine, planned.next), false)
    }))

  it.effect("completes a parallel parent when every region is final and aggregates region outputs", () =>
    Effect.gen(function*() {
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const checking = new CheckingInventory({ sku: "sku-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const machine = Machine.make({
        states: {
          fulfillment: {
            schema: Fulfillment,
            type: "parallel",
            output: Schema.Struct({
              inventory: Schema.String,
              shipping: Schema.String
            }),
            states: {
              inventory: {
                schema: Inventory,
                initial: "checking",
                states: {
                  checking: CheckingInventory,
                  reserved: {
                    schema: InventoryReserved,
                    type: "final",
                    output: Schema.String
                  }
                }
              },
              shipping: {
                schema: Shipping,
                initial: "quoting",
                states: {
                  quoting: QuotingShipping,
                  quoted: {
                    schema: ShippingQuoted,
                    type: "final",
                    output: Schema.String
                  }
                }
              }
            }
          }
        },
        events: [ReserveInventory],
        initial: () => ({
          path: "fulfillment",
          value: fulfillment,
          states: {
            inventory: {
              path: "fulfillment.inventory" as const,
              value: inventory,
              state: {
                path: "fulfillment.inventory.checking" as const,
                value: checking
              }
            },
            shipping: {
              path: "fulfillment.shipping" as const,
              value: shipping,
              state: {
                path: "fulfillment.shipping.quoting" as const,
                value: quoting
              }
            }
          }
        })
      }).handle({
        fulfillment: {
          output: ({ outputs }) => ({
            inventory: outputs.inventory,
            shipping: outputs.shipping
          }),
          states: {
            inventory: {
              states: {
                checking: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.local.reserved(new InventoryReserved({ reservationId: event.reservationId }))
                  }
                },
                reserved: {
                  type: "final",
                  output: ({ state }) => state.reservationId
                }
              }
            },
            shipping: {
              states: {
                quoting: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.local.quoted(new ShippingQuoted({ quoteId: event.reservationId }))
                  }
                },
                quoted: {
                  type: "final",
                  output: ({ state }) => state.quoteId
                }
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new ReserveInventory({ reservationId: "res-1" }))

      assertParallelStateSnapshot(planned.next as any, "fulfillment", fulfillment, {
        inventory: {
          path: "fulfillment.inventory",
          value: inventory,
          state: {
            path: "fulfillment.inventory.reserved",
            value: new InventoryReserved({ reservationId: "res-1" })
          }
        },
        shipping: {
          path: "fulfillment.shipping",
          value: shipping,
          state: {
            path: "fulfillment.shipping.quoted",
            value: new ShippingQuoted({ quoteId: "res-1" })
          }
        }
      })
      assert.strictEqual(Machine.isFinal(machine, planned.next), true)
      assert.deepStrictEqual(Machine.enabled(machine, planned.next), [])
      assert.deepStrictEqual(planned.output, {
        inventory: "res-1",
        shipping: "res-1"
      })

      const actor = yield* Machine.start(machine)
      yield* actor.send(new ReserveInventory({ reservationId: "res-2" }))

      assert.deepStrictEqual(yield* actor.join, {
        inventory: "res-2",
        shipping: "res-2"
      })
    }))

  it.effect("preserves completed parallel region outputs across separate events", () =>
    Effect.gen(function*() {
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const machine = Machine.make({
        states: {
          fulfillment: {
            schema: Fulfillment,
            type: "parallel",
            output: Schema.Struct({
              inventory: Schema.String,
              shipping: Schema.String
            }),
            states: {
              inventory: {
                schema: Inventory,
                initial: "checking",
                states: {
                  checking: CheckingInventory,
                  reserved: {
                    schema: InventoryReserved,
                    type: "final",
                    output: Schema.String
                  }
                }
              },
              shipping: {
                schema: Shipping,
                initial: "quoting",
                states: {
                  quoting: QuotingShipping,
                  quoted: {
                    schema: ShippingQuoted,
                    type: "final",
                    output: Schema.String
                  }
                }
              }
            }
          }
        },
        events: [ReserveInventory, Resolve],
        initial: () => ({
          path: "fulfillment",
          value: fulfillment,
          states: {
            inventory: {
              path: "fulfillment.inventory" as const,
              value: inventory,
              state: {
                path: "fulfillment.inventory.checking" as const,
                value: new CheckingInventory({ sku: "sku-1" })
              }
            },
            shipping: {
              path: "fulfillment.shipping" as const,
              value: shipping,
              state: {
                path: "fulfillment.shipping.quoting" as const,
                value: quoting
              }
            }
          }
        })
      }).handle({
        fulfillment: {
          output: ({ outputs }) => outputs,
          states: {
            inventory: {
              states: {
                checking: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.local.reserved(new InventoryReserved({ reservationId: event.reservationId }))
                  }
                },
                reserved: {
                  type: "final",
                  output: ({ event, state }) => `${state.reservationId}:${String(event._tag)}`
                }
              }
            },
            shipping: {
              states: {
                quoting: {
                  on: {
                    Resolve: ({ target }) => target.local.quoted(new ShippingQuoted({ quoteId: "quote-1" }))
                  }
                },
                quoted: {
                  type: "final",
                  output: ({ event, state }) => `${state.quoteId}:${String(event._tag)}`
                }
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const reserved = yield* Machine.plan(
        machine,
        initial.state,
        new ReserveInventory({ reservationId: "res-1" })
      )
      const serialized = { ...reserved.next } as typeof reserved.next
      const quoted = yield* Machine.plan(machine, serialized, new Resolve({}))

      assert.strictEqual(Machine.isFinal(machine, reserved.next), false)
      assert.strictEqual(reserved.output, undefined)
      assert.ok(serialized.completed !== undefined)
      assert.strictEqual(Machine.isFinal(machine, quoted.next), true)
      assert.deepStrictEqual(quoted.output, {
        inventory: "res-1:ReserveInventory",
        shipping: "quote-1:Resolve"
      })

      const actor = yield* Machine.start(machine)
      yield* sendAndWaitForSnapshot(
        actor,
        new ReserveInventory({ reservationId: "res-2" }),
        (snapshot) =>
          snapshot.status === "active" &&
          snapshot.state.path === "fulfillment" &&
          snapshot.state.states.inventory.state.path === "fulfillment.inventory.reserved"
      )
      yield* actor.send(new Resolve({}))

      assert.deepStrictEqual(yield* actor.join, {
        inventory: "res-2:ReserveInventory",
        shipping: "quote-1:Resolve"
      })
    }))

  it.effect("does not process raised events after parallel final completion", () =>
    Effect.gen(function*() {
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const checking = new CheckingInventory({ sku: "sku-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const machine = Machine.make({
        states: {
          fulfillment: {
            schema: Fulfillment,
            type: "parallel",
            states: {
              inventory: {
                schema: Inventory,
                initial: "checking",
                states: {
                  checking: CheckingInventory,
                  reserved: {
                    schema: InventoryReserved,
                    type: "final"
                  }
                }
              },
              shipping: {
                schema: Shipping,
                initial: "quoting",
                states: {
                  quoting: QuotingShipping,
                  quoted: {
                    schema: ShippingQuoted,
                    type: "final"
                  }
                }
              }
            }
          },
          failed: Failed
        },
        events: [ReserveInventory, Reset],
        initial: () => ({
          path: "fulfillment",
          value: fulfillment,
          states: {
            inventory: {
              path: "fulfillment.inventory" as const,
              value: inventory,
              state: {
                path: "fulfillment.inventory.checking" as const,
                value: checking
              }
            },
            shipping: {
              path: "fulfillment.shipping" as const,
              value: shipping,
              state: {
                path: "fulfillment.shipping.quoting" as const,
                value: quoting
              }
            }
          }
        })
      }).handle({
        fulfillment: {
          on: {
            Reset: ({ target }) => target.full.failed(new Failed({ message: "raised" }))
          },
          states: {
            inventory: {
              states: {
                checking: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.local.reserved(new InventoryReserved({ reservationId: event.reservationId }))
                  }
                }
              }
            },
            shipping: {
              states: {
                quoting: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.local.quoted(new ShippingQuoted({ quoteId: event.reservationId }))
                  }
                },
                quoted: {
                  type: "final",
                  entry: ({ runtime }) => Effect.flatMap(runtime, (machine) => machine.raise(new Reset({})))
                }
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new ReserveInventory({ reservationId: "res-1" }))

      assert.strictEqual(Machine.isFinal(machine, planned.next), true)
      assertParallelStateSnapshot(planned.next as any, "fulfillment", fulfillment, {
        inventory: {
          path: "fulfillment.inventory",
          value: inventory,
          state: {
            path: "fulfillment.inventory.reserved",
            value: new InventoryReserved({ reservationId: "res-1" })
          }
        },
        shipping: {
          path: "fulfillment.shipping",
          value: shipping,
          state: {
            path: "fulfillment.shipping.quoted",
            value: new ShippingQuoted({ quoteId: "res-1" })
          }
        }
      })
    }))

  it.effect("transitions all matching parallel regions for the same event", () =>
    Effect.gen(function*() {
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const checking = new CheckingInventory({ sku: "sku-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const machine = Machine.make({
        states: {
          fulfillment: {
            schema: Fulfillment,
            type: "parallel",
            states: {
              inventory: {
                schema: Inventory,
                initial: "checking",
                states: {
                  checking: CheckingInventory,
                  reserved: InventoryReserved
                }
              },
              shipping: {
                schema: Shipping,
                initial: "quoting",
                states: {
                  quoting: QuotingShipping,
                  quoted: ShippingQuoted
                }
              }
            }
          }
        },
        events: [ReserveInventory],
        initial: () => ({
          path: "fulfillment",
          value: fulfillment,
          states: {
            inventory: {
              path: "fulfillment.inventory" as const,
              value: inventory,
              state: {
                path: "fulfillment.inventory.checking" as const,
                value: checking
              }
            },
            shipping: {
              path: "fulfillment.shipping" as const,
              value: shipping,
              state: {
                path: "fulfillment.shipping.quoting" as const,
                value: quoting
              }
            }
          }
        })
      }).handle({
        fulfillment: {
          states: {
            inventory: {
              states: {
                checking: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.local.reserved(new InventoryReserved({ reservationId: event.reservationId }))
                  }
                }
              }
            },
            shipping: {
              states: {
                quoting: {
                  on: {
                    ReserveInventory: ({ event, target }) =>
                      target.local.quoted(new ShippingQuoted({ quoteId: event.reservationId }))
                  }
                }
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new ReserveInventory({ reservationId: "res-1" }))

      assertParallelStateSnapshot(planned.next as any, "fulfillment", fulfillment, {
        inventory: {
          path: "fulfillment.inventory",
          value: inventory,
          state: {
            path: "fulfillment.inventory.reserved",
            value: new InventoryReserved({ reservationId: "res-1" })
          }
        },
        shipping: {
          path: "fulfillment.shipping",
          value: shipping,
          state: {
            path: "fulfillment.shipping.quoted",
            value: new ShippingQuoted({ quoteId: "res-1" })
          }
        }
      })
    }))

  it.effect("prefers child transitions over conflicting ancestor transitions", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const checking = new CheckingInventory({ sku: "sku-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const machine = Machine.make({
        states: {
          fulfillment: {
            schema: Fulfillment,
            type: "parallel",
            states: {
              inventory: {
                schema: Inventory,
                initial: "checking",
                states: {
                  checking: CheckingInventory,
                  reserved: InventoryReserved
                }
              },
              shipping: {
                schema: Shipping,
                initial: "quoting",
                states: {
                  quoting: QuotingShipping,
                  quoted: ShippingQuoted
                }
              }
            }
          },
          failed: Failed
        },
        events: [ReserveInventory],
        initial: () => ({
          path: "fulfillment",
          value: fulfillment,
          states: {
            inventory: {
              path: "fulfillment.inventory" as const,
              value: inventory,
              state: {
                path: "fulfillment.inventory.checking" as const,
                value: checking
              }
            },
            shipping: {
              path: "fulfillment.shipping" as const,
              value: shipping,
              state: {
                path: "fulfillment.shipping.quoting" as const,
                value: quoting
              }
            }
          }
        })
      }).handle({
        fulfillment: {
          on: {
            ReserveInventory: Effect.fn(function*({ target }) {
              const deferredLog = yield* DeferredLog
              yield* deferredLog.push("evaluate:parent")
              yield* Machine.action(deferredLog.push("transition:parent"))
              return target.full.failed(new Failed({ message: "parent" }))
            })
          },
          states: {
            inventory: {
              states: {
                checking: {
                  on: {
                    ReserveInventory: Effect.fn(function*({ event, target }) {
                      const deferredLog = yield* DeferredLog
                      yield* deferredLog.push("evaluate:child")
                      yield* Machine.action(deferredLog.push("transition:child"))
                      return target.local.reserved(
                        new InventoryReserved({
                          reservationId: event.reservationId
                        })
                      )
                    })
                  }
                }
              }
            }
          }
        }
      })

      const actor = yield* Machine.start(machine).pipe(Effect.provideService(DeferredLog, deferredLog))
      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new ReserveInventory({ reservationId: "res-1" }),
        (snapshot) =>
          snapshot.status === "active" &&
          snapshot.state.path === "fulfillment" &&
          snapshot.state.states.inventory.state.path === "fulfillment.inventory.reserved"
      )
      yield* Effect.yieldNow

      assertParallelStateSnapshot(snapshot.state as any, "fulfillment", fulfillment, {
        inventory: {
          path: "fulfillment.inventory",
          value: inventory,
          state: {
            path: "fulfillment.inventory.reserved",
            value: new InventoryReserved({ reservationId: "res-1" })
          }
        },
        shipping: {
          path: "fulfillment.shipping",
          value: shipping,
          state: {
            path: "fulfillment.shipping.quoting",
            value: quoting
          }
        }
      })
      assert.deepStrictEqual(yield* deferredLog.read, ["evaluate:child", "transition:child"])
    }))

  it.effect("runs parallel exit, transition, and entry actions in deterministic order", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const checking = new CheckingInventory({ sku: "sku-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const machine = Machine.make({
        states: {
          fulfillment: {
            schema: Fulfillment,
            type: "parallel",
            states: {
              inventory: {
                schema: Inventory,
                initial: "checking",
                states: {
                  checking: CheckingInventory,
                  reserved: InventoryReserved
                }
              },
              shipping: {
                schema: Shipping,
                initial: "quoting",
                states: {
                  quoting: QuotingShipping,
                  quoted: ShippingQuoted
                }
              }
            }
          }
        },
        events: [ReserveInventory],
        initial: () => ({
          path: "fulfillment",
          value: fulfillment,
          states: {
            inventory: {
              path: "fulfillment.inventory" as const,
              value: inventory,
              state: {
                path: "fulfillment.inventory.checking" as const,
                value: checking
              }
            },
            shipping: {
              path: "fulfillment.shipping" as const,
              value: shipping,
              state: {
                path: "fulfillment.shipping.quoting" as const,
                value: quoting
              }
            }
          }
        })
      }).handle({
        fulfillment: {
          states: {
            inventory: {
              states: {
                checking: {
                  exit: Effect.fn(function*() {
                    const deferredLog = yield* DeferredLog
                    yield* Machine.action(deferredLog.push("exit:inventory.checking"))
                  }),
                  on: {
                    ReserveInventory: Effect.fn(function*({ event, target }) {
                      const deferredLog = yield* DeferredLog
                      yield* Machine.action(deferredLog.push("transition:inventory"))
                      return target.local.reserved(
                        new InventoryReserved({
                          reservationId: event.reservationId
                        })
                      )
                    })
                  }
                },
                reserved: {
                  entry: Effect.fn(function*() {
                    const deferredLog = yield* DeferredLog
                    yield* Machine.action(deferredLog.push("entry:inventory.reserved"))
                  })
                }
              }
            },
            shipping: {
              states: {
                quoting: {
                  exit: Effect.fn(function*() {
                    const deferredLog = yield* DeferredLog
                    yield* Machine.action(deferredLog.push("exit:shipping.quoting"))
                  }),
                  on: {
                    ReserveInventory: Effect.fn(function*({ event, target }) {
                      const deferredLog = yield* DeferredLog
                      yield* Machine.action(deferredLog.push("transition:shipping"))
                      return target.local.quoted(new ShippingQuoted({ quoteId: event.reservationId }))
                    })
                  }
                },
                quoted: {
                  entry: Effect.fn(function*() {
                    const deferredLog = yield* DeferredLog
                    yield* Machine.action(deferredLog.push("entry:shipping.quoted"))
                  })
                }
              }
            }
          }
        }
      })

      const actor = yield* Machine.start(machine).pipe(Effect.provideService(DeferredLog, deferredLog))
      yield* sendAndWaitForSnapshot(
        actor,
        new ReserveInventory({ reservationId: "res-1" }),
        (snapshot) =>
          snapshot.status === "active" &&
          snapshot.state.path === "fulfillment" &&
          snapshot.state.states.inventory.state.path === "fulfillment.inventory.reserved" &&
          snapshot.state.states.shipping.state.path === "fulfillment.shipping.quoted"
      )
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* deferredLog.read, [
        "exit:shipping.quoting",
        "exit:inventory.checking",
        "transition:inventory",
        "transition:shipping",
        "entry:inventory.reserved",
        "entry:shipping.quoted"
      ])
    }))

  it.effect("processes raised events from one parallel region after the current microstep", () =>
    Effect.gen(function*() {
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const checking = new CheckingInventory({ sku: "sku-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const quoting = new QuotingShipping({ postalCode: "12345" })
      const machine = Machine.make({
        states: {
          fulfillment: {
            schema: Fulfillment,
            type: "parallel",
            states: {
              inventory: {
                schema: Inventory,
                initial: "checking",
                states: {
                  checking: CheckingInventory,
                  reserved: InventoryReserved
                }
              },
              shipping: {
                schema: Shipping,
                initial: "quoting",
                states: {
                  quoting: QuotingShipping,
                  quoted: ShippingQuoted
                }
              }
            }
          }
        },
        events: [ReserveInventory, Resolve],
        initial: () => ({
          path: "fulfillment",
          value: fulfillment,
          states: {
            inventory: {
              path: "fulfillment.inventory" as const,
              value: inventory,
              state: {
                path: "fulfillment.inventory.checking" as const,
                value: checking
              }
            },
            shipping: {
              path: "fulfillment.shipping" as const,
              value: shipping,
              state: {
                path: "fulfillment.shipping.quoting" as const,
                value: quoting
              }
            }
          }
        })
      }).handle({
        fulfillment: {
          states: {
            inventory: {
              states: {
                checking: {
                  on: {
                    ReserveInventory: Effect.fn(function*({ event, runtime, target }) {
                      const machine = yield* runtime
                      yield* machine.raise(new Resolve({}))
                      return target.local.reserved(
                        new InventoryReserved({
                          reservationId: event.reservationId
                        })
                      )
                    })
                  }
                }
              }
            },
            shipping: {
              states: {
                quoting: {
                  on: {
                    Resolve: ({ target }) => target.local.quoted(new ShippingQuoted({ quoteId: "raised" }))
                  }
                }
              }
            }
          }
        }
      })

      const initial = yield* Machine.planInitial(machine)
      const planned = yield* Machine.plan(machine, initial.state, new ReserveInventory({ reservationId: "res-1" }))

      assertParallelStateSnapshot(planned.next as any, "fulfillment", fulfillment, {
        inventory: {
          path: "fulfillment.inventory",
          value: inventory,
          state: {
            path: "fulfillment.inventory.reserved",
            value: new InventoryReserved({ reservationId: "res-1" })
          }
        },
        shipping: {
          path: "fulfillment.shipping",
          value: shipping,
          state: {
            path: "fulfillment.shipping.quoted",
            value: new ShippingQuoted({ quoteId: "raised" })
          }
        }
      })
      assert.strictEqual(planned.microsteps.length, 2)
    }))

  it.effect("starts a machine without input", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle },
        events: [Submit],
        initial: () => FlatInitial.Idle(new Idle({ userId: "user-1" }))
      })

      const actor = yield* Machine.start(machine)

      assert.deepStrictEqual((yield* actor.state).value, new Idle({ userId: "user-1" }))
    }))

  it.effect("planInitial computes the initial state without running deferred actions", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle },
        events: [Submit],
        input: Input,
        initial: Effect.fn(function*({ userId }) {
          yield* Machine.action(
            Effect.gen(function*() {
              const deferredLog = yield* DeferredLog
              yield* deferredLog.push("initial")
            })
          )
          return FlatInitial.Idle(new Idle({ userId }))
        })
      })

      const planned = yield* Machine.planInitial(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      assert.deepStrictEqual(planned.state.value, new Idle({ userId: "user-1" }))
      assert.strictEqual(planned.actions.length, 1)
      assert.deepStrictEqual(yield* deferredLog.read, [])
    }))

  it.effect("planInitial uses the planning runtime for initial raised events", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Resolve],
        input: Input,
        initial: Effect.fn(function*({ userId }) {
          const runtime = yield* Machine.runtime<{ readonly events: Resolve }>()
          yield* runtime.raise(new Resolve({}))
          return FlatInitial.Idle(new Idle({ userId }))
        })
      }).handle({
        Idle: {
          on: {
            Resolve: () => FlatInitial.Loading(new Loading({ requestId: "resolved" }))
          }
        }
      })

      const planned = yield* Machine.planInitial(machine, { userId: "user-1" })

      assert.deepStrictEqual(planned.state, FlatInitial.Loading(new Loading({ requestId: "resolved" })))
    }))

  it.effect("planInitial carries external initial and entry requirements", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle },
        events: [Submit],
        input: Input,
        initial: Effect.fn(function*({ userId }) {
          const requirement = yield* InitialRequirement
          return FlatInitial.Idle(new Idle({ userId: `${userId}:${requirement.initialMessage}` }))
        })
      }).handle({
        Idle: {
          entry: Effect.fn(function*() {
            const requirement = yield* EntryRequirement
            yield* Machine.action(Effect.sync(() => {
              void requirement.entryMessage
            }))
          })
        }
      })

      const planned = yield* Machine.planInitial(machine, { userId: "user-1" }).pipe(
        Effect.provideService(InitialRequirement, InitialRequirement.of({ initialMessage: "initial" })),
        Effect.provideService(EntryRequirement, EntryRequirement.of({ entryMessage: "entry" }))
      )

      assert.deepStrictEqual(planned.state, FlatInitial.Idle(new Idle({ userId: "user-1:initial" })))
      assert.strictEqual(planned.actions.length, 1)
    }))

  it.effect("start runs deferred initial actions", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle },
        events: [Submit],
        input: Input,
        initial: Effect.fn(function*({ userId }) {
          yield* Machine.action(
            Effect.gen(function*() {
              const deferredLog = yield* DeferredLog
              yield* deferredLog.push("initial")
            })
          )
          return FlatInitial.Idle(new Idle({ userId }))
        })
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      assert.deepStrictEqual((yield* actor.state).value, new Idle({ userId: "user-1" }))
      assert.deepStrictEqual(yield* deferredLog.read, ["initial"])
    }))

  it.effect("planInitial collects initial state entry actions without running them", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          entry: Effect.fn(function*({ event }) {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push(`entry:${String(event._tag)}`))
          })
        }
      })

      const planned = yield* Machine.planInitial(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      assert.deepStrictEqual(planned.state.value, new Idle({ userId: "user-1" }))
      assert.strictEqual(planned.actions.length, 1)
      assert.deepStrictEqual(yield* deferredLog.read, [])
    }))

  it.effect("start runs initial state entry actions", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle },
        events: [Submit],
        input: Input,
        initial: Effect.fn(function*({ userId }) {
          const deferredLog = yield* DeferredLog
          yield* Machine.action(deferredLog.push("initial"))
          return FlatInitial.Idle(new Idle({ userId }))
        })
      }).handle({
        Idle: {
          entry: Effect.fn(function*({ event }) {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push(`entry:${String(event._tag)}`))
          })
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      assert.deepStrictEqual((yield* actor.state).value, new Idle({ userId: "user-1" }))
      assert.deepStrictEqual(yield* deferredLog.read, ["initial", "entry:Symbol(effect/Machine/InitialEvent)"])
    }))

  it.effect("start follows always transitions from the initial state before exposing runtime state", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          entry: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("entry"))
          }),
          always: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("always"))
            return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          })
        },
        Loading: {
          entry: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("loading-entry"))
          })
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      assert.deepStrictEqual((yield* actor.state).value, new Loading({ requestId: "request-1" }))
      assert.deepStrictEqual(yield* deferredLog.read, ["entry", "always", "loading-entry"])
    }))

  it.effect("start processes raised events from initial state entry actions", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit, Resolve],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          entry: Effect.fn(function*({ runtime }) {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("entry"))
            const machine = yield* runtime
            yield* machine.raise(new Resolve({}))
          }),
          on: {
            Resolve: Effect.fn(function*() {
              const deferredLog = yield* DeferredLog
              yield* Machine.action(deferredLog.push("resolve"))
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {
          entry: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("loading-entry"))
          })
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      assert.deepStrictEqual((yield* actor.state).value, new Loading({ requestId: "request-1" }))
      assert.deepStrictEqual(yield* deferredLog.read, ["entry", "resolve", "loading-entry"])
    }))

  it.effect("carries initial action requirements", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle },
        events: [Submit],
        input: Input,
        initial: Effect.fn(function*({ userId }) {
          yield* Machine.action(
            Effect.gen(function*() {
              const requirement = yield* InitialRequirement
              const deferredLog = yield* DeferredLog
              yield* deferredLog.push(requirement.initialMessage)
            })
          )
          return FlatInitial.Idle(new Idle({ userId }))
        })
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(InitialRequirement, InitialRequirement.of({ initialMessage: "initial" })),
        Effect.provideService(DeferredLog, deferredLog)
      )

      assert.deepStrictEqual((yield* actor.state).value, new Idle({ userId: "user-1" }))
      assert.deepStrictEqual(yield* deferredLog.read, ["initial"])
    }))

  it.effect("propagates initial action failures", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle },
        events: [Submit],
        input: Input,
        initial: Effect.fn(function*({ userId }) {
          const state = new Idle({ userId })
          yield* Machine.action(Effect.fail(new InitialError({ state: state._tag })))
          return FlatInitial.Idle(state)
        })
      })

      const error = yield* Effect.flip(Machine.start(machine, { userId: "user-1" }))

      assert.instanceOf(error, InitialError)
      assert.strictEqual(error._tag, "InitialError")
      assert.strictEqual(error.state, "Idle")
    }))

  it.effect("propagates initial state entry action failures", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          entry: ({ state }) => Machine.action(Effect.fail(new EntryError({ state: state._tag })))
        }
      })

      const error = yield* Effect.flip(Machine.start(machine, { userId: "user-1" }))

      assert.instanceOf(error, EntryError)
      assert.strictEqual(error._tag, "EntryError")
      assert.strictEqual(error.state, "Idle")
    }))

  it("handle stores handlers and sync transitions enqueue actions", () => {
    const effect = Effect.succeed("submitted")
    const machine = Machine.make({
      states: { Idle, Loading },
      events: [Submit],
      input: Input,
      initial: (input) => FlatInitial.Idle(Idle.make({ userId: input.userId }))
    }).handle({
      Idle: {
        on: {
          Submit: Effect.fn(function*() {
            yield* Machine.action(effect)
            return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          })
        }
      }
    })

    assert.strictEqual("Idle" in machine.handlers, true)
    assert.strictEqual("Submit" in (machine.handlers.Idle.on ?? {}), true)
  })

  it.effect("handlers can return snapshots directly", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new Submit({ value: "hello" }),
        (snapshot) => snapshot.state.value._tag === "Loading"
      )

      assert.deepStrictEqual(snapshot, {
        status: "active",
        state: { path: "Loading", value: new Loading({ requestId: "request-1" }) }
      })
    }))

  it("enabled returns the event tags handled by the current state", () => {
    const machine = Machine.make({
      states: { Idle, Loading },
      events: [Submit, Reset],
      input: Input,
      initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
    }).handle({
      Idle: {
        on: {
          Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
        }
      },
      Loading: {
        on: {
          Reset: () => FlatInitial.Idle(new Idle({ userId: "user-1" }))
        }
      }
    })

    assert.deepStrictEqual(Machine.enabled(machine, FlatInitial.Idle(new Idle({ userId: "user-1" }))), ["Submit"])
    assert.deepStrictEqual(
      Machine.enabled(machine, FlatInitial.Loading(new Loading({ requestId: "request-1" }))),
      ["Reset"]
    )
  })

  it("enabled returns no event tags for final states", () => {
    const machine = Machine.make({
      states: { Idle, Success },
      events: [Submit],
      input: Input,
      initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
    }).handle({
      Idle: {
        on: {
          Submit: () => FlatInitial.Success(new Success({ requestId: "request-1" }))
        }
      },
      Success: {
        type: "final"
      }
    })

    assert.deepStrictEqual(
      Machine.enabled(machine, FlatInitial.Success(new Success({ requestId: "request-1" }))),
      []
    )
  })

  it.effect("runs final state entry actions when entering a final state", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Success },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Success(new Success({ requestId: "request-1" }))
          }
        },
        Success: {
          type: "final",
          entry: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("success"))
          })
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      yield* actor.send(new Submit({ value: "hello" }))

      assert.strictEqual(yield* actor.join, undefined)
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "request-1" }) },
        output: undefined
      })
      assert.deepStrictEqual(yield* deferredLog.read, ["success"])
    }))

  it.effect("exposes final state output from a running machine", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Success: SuccessOutput },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Success(new Success({ requestId: "request-1" }))
          }
        },
        Success: {
          type: "final",
          output: ({ event, state }) => `${state.requestId}:${String(event._tag)}`
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "active",
        state: { path: "Idle", value: new Idle({ userId: "user-1" }) }
      })

      yield* actor.send(new Submit({ value: "hello" }))

      assert.strictEqual(yield* actor.join, "request-1:Submit")
    }))

  it.effect("plans final state output without running deferred actions", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Success: SuccessOutput },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Success(new Success({ requestId: "request-1" }))
          }
        },
        Success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const planned = yield* Machine.plan(
        machine,
        FlatInitial.Idle(new Idle({ userId: "user-1" })),
        new Submit({ value: "hello" })
      )

      assert.strictEqual(planned.output, "request-1")
    }))

  it.effect("exposes output when the initial state is final", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Success: SuccessOutput },
        events: [Submit],
        initial: () => FlatInitial.Success(new Success({ requestId: "request-1" }))
      }).handle({
        Success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const planned = yield* Machine.planInitial(machine)
      const actor = yield* Machine.start(machine)

      assert.strictEqual(planned.output, "request-1")
      assert.strictEqual(yield* actor.join, "request-1")
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "request-1" }) },
        output: "request-1"
      })
    }))

  it.effect("defaults final state output to undefined", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Success },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Success(new Success({ requestId: "request-1" }))
          }
        },
        Success: {
          type: "final"
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })
      yield* actor.send(new Submit({ value: "hello" }))

      assert.strictEqual(yield* actor.join, undefined)
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "request-1" }) },
        output: undefined
      })
    }))

  it.effect("rejects events after reaching a final state", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Success },
        events: [Submit, Reset],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Success(new Success({ requestId: "request-1" })),
            Reset: () => FlatInitial.Idle(new Idle({ userId: "user-2" }))
          }
        },
        Success: {
          type: "final"
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })
      yield* actor.send(new Submit({ value: "hello" }))
      yield* actor.join
      assert.instanceOf(yield* Effect.flip(actor.send(new Reset({}))), Machine.StoppedError)

      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "request-1" }) },
        output: undefined
      })
    }))

  it.effect("start keeps the machine alive after the starting fiber completes", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        initial: () => FlatInitial.Idle(new Idle({ userId: "user-1" }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        }
      })

      const startingFiber = yield* Machine.start(machine).pipe(Effect.forkChild)
      const ref = yield* Fiber.join(startingFiber)
      const snapshot = yield* sendAndWaitForSnapshot(
        ref,
        new Submit({ value: "hello" }),
        (snapshot) => snapshot.status === "active" && snapshot.state.path === "Loading"
      )

      assert.strictEqual(snapshot.status, "active")
      assert.strictEqual(snapshot.state.path, "Loading")
      yield* ref.stop
    }))

  it.effect("start rejects events sent after stop", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        }
      })
      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.stop
      assert.instanceOf(
        yield* Effect.flip(actor.send(new Submit({ value: "hello" }))),
        Machine.StoppedError
      )

      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "stopped",
        state: { path: "Idle", value: new Idle({ userId: "user-1" }) }
      })
    }))

  it.effect("plans no-op transitions from final states", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Success },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Success: {
          type: "final"
        }
      })

      const state = FlatInitial.Success(new Success({ requestId: "request-1" }))
      const planned = yield* Machine.plan(machine, state, new Submit({ value: "hello" }))

      assert.deepStrictEqual(planned.next.value, state.value)
      assert.deepStrictEqual(planned.actions, [])
      assert.deepStrictEqual(planned.microsteps, [])
    }))

  it.effect("does not process raised events from final state entry actions", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Success },
        events: [Submit, Reset],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Success(new Success({ requestId: "request-1" })),
            Reset: () => FlatInitial.Idle(new Idle({ userId: "user-2" }))
          }
        },
        Success: {
          type: "final",
          entry: ({ runtime }) => Effect.flatMap(runtime, (machine) => machine.raise(new Reset({})))
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })
      yield* actor.send(new Submit({ value: "hello" }))
      yield* actor.join

      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "request-1" }) },
        output: undefined
      })
    }))

  it.effect("plan computes the next state without running deferred actions", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              const deferredLog = yield* DeferredLog
              yield* Machine.action(deferredLog.push("submitted"))
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        }
      })

      const planned = yield* Machine.plan(
        machine,
        FlatInitial.Idle(new Idle({ userId: "user-1" })),
        new Submit({ value: "hello" })
      ).pipe(Effect.provideService(DeferredLog, deferredLog))

      assert.deepStrictEqual(planned.next.value, new Loading({ requestId: "request-1" }))
      assert.deepStrictEqual(yield* deferredLog.read, [])
    }))

  it.effect("handlers can omit returning a state for self-transitions", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => {}
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))
      yield* Effect.yieldNow

      assert.deepStrictEqual((yield* actor.state).value, new Idle({ userId: "user-1" }))
    }))

  it.effect("effect handlers can omit returning a state for self-transitions", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              yield* Machine.action(
                Effect.gen(function*() {
                  const deferredLog = yield* DeferredLog
                  yield* deferredLog.push("submitted")
                })
              )
            })
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      yield* actor.send(new Submit({ value: "hello" }))
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* deferredLog.read, ["submitted"])
      assert.deepStrictEqual((yield* actor.state).value, new Idle({ userId: "user-1" }))
    }))

  it("can reuse the same machine with multiple different handlers", () => {
    const effect = Effect.succeed("submitted")
    const machine = Machine.make({
      states: { Idle, Loading },
      events: [Submit, Reset],
      input: Input,
      initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
    })

    const machine1 = machine.handle({
      Idle: {
        on: {
          Submit: Effect.fn(function*() {
            yield* Machine.action(effect)
            return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          })
        }
      }
    })

    const machine2 = machine.handle({
      Idle: {
        on: {
          Reset: Effect.fn(function*() {
            return FlatInitial.Idle(new Idle({ userId: "user-1" }))
          })
        }
      }
    })

    assert.strictEqual("Idle" in machine1.handlers, true)
    assert.strictEqual("Submit" in (machine1.handlers.Idle.on ?? {}), true)
    assert.strictEqual("Reset" in (machine2.handlers.Idle.on ?? {}), true)
  })

  it.effect("start creates a runtime that sends events and stops", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit, Reset],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              yield* Machine.action(Effect.succeed("submitted"))
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {
          on: {
            Reset: () => Effect.succeed(FlatInitial.Idle(new Idle({ userId: "user-1" })))
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      assert.deepStrictEqual((yield* actor.state).value, new Idle({ userId: "user-1" }))

      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new Submit({ value: "hello" }),
        (snapshot) => snapshot.state.value._tag === "Loading"
      )

      assert.deepStrictEqual(snapshot, {
        status: "active",
        state: { path: "Loading", value: new Loading({ requestId: "request-1" }) }
      })
    }))

  it.effect("start returns a machine runtime with lifecycle snapshots", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })
      const observer = yield* actor.changes.pipe(
        Stream.filter((snapshot) => snapshot.state.value._tag === "Loading"),
        Stream.take(1),
        Stream.runCollect,
        Effect.forkChild
      )

      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "active",
        state: { path: "Idle", value: new Idle({ userId: "user-1" }) }
      })

      yield* actor.send(new Submit({ value: "hello" }))

      const snapshots = Array.from(yield* Fiber.join(observer))
      assert.deepStrictEqual(snapshots, [{
        status: "active",
        state: { path: "Loading", value: new Loading({ requestId: "request-1" }) }
      }])
      assert.deepStrictEqual((yield* actor.state).value, new Loading({ requestId: "request-1" }))

      yield* actor.stop
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "stopped",
        state: { path: "Loading", value: new Loading({ requestId: "request-1" }) }
      })
    }))

  it.effect("start completes machine output from a final state", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Success: SuccessOutput },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Success(new Success({ requestId: "request-1" }))
          }
        },
        Success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))

      assert.strictEqual(yield* actor.join, "request-1")
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "request-1" }) },
        output: "request-1"
      })
    }))

  it.effect("start surfaces transition failures through the machine lifecycle", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        id: "UserMachine",
        states: { Idle, Loading },
        events: [Submit, Reset],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Reset({}))

      const error = yield* Effect.flip(actor.join)
      assert.instanceOf(error, Machine.UnhandledEventError)
      assert.strictEqual(error._tag, "UnhandledEventError")
      assert.strictEqual(error.machineId, "UserMachine")
      assert.strictEqual(error.state, "Idle")
      assert.strictEqual(error.event, "Reset")

      const snapshot = yield* actor.snapshot
      assert.strictEqual(snapshot.status, "error")
      if (snapshot.status === "error") {
        assert.deepStrictEqual(snapshot.state.value, new Idle({ userId: "user-1" }))
        const reason = snapshot.cause.reasons[0]
        assert.ok(reason !== undefined)
        assert.strictEqual(Cause.isFailReason(reason), true)
        if (Cause.isFailReason(reason)) {
          assert.instanceOf(reason.error, Machine.UnhandledEventError)
        }
      }
    }))

  it.effect("start runs invoke configs", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading, Success: SuccessOutput },
        events: [Submit, RequestSucceeded],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          invoke: Machine.invoke({
            id: "request",
            src: ({ state }) =>
              Machine.effect(
                Effect.succeed(new RequestSucceeded({ value: `done:${state.requestId}` }))
              )
          }),
          on: {
            RequestSucceeded: ({ event }) => FlatInitial.Success(new Success({ requestId: event.value }))
          }
        },
        Success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))

      assert.strictEqual(yield* actor.join, "done:request-1")
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "done:request-1" }) },
        output: "done:request-1"
      })
    }))

  it.effect("spawned child processes send events to the parent", () =>
    Effect.gen(function*() {
      const childLogic = Machine.logic({
        initial: undefined,
        run: ({ sendParent }) => sendParent(new ParentRequestProgress({ id: "request", loaded: 42 }))
      })
      const parentMachine = Machine.make({
        states: { Idle, Success: SuccessOutput },
        events: [Submit, ParentRequestProgress],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              yield* Machine.action(
                Machine.spawn(childLogic, { id: "request" }).pipe(Effect.asVoid)
              )
            }),
            ParentRequestProgress: ({ event }) =>
              FlatInitial.Success(new Success({ requestId: `${event.id}:${event.loaded}` }))
          }
        },
        Success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(parentMachine, { userId: "parent-user" })

      yield* actor.send(new Submit({ value: "start" }))

      assert.strictEqual(yield* actor.join, "request:42")
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "request:42" }) },
        output: "request:42"
      })
    }))

  it.effect("sendParent is ignored when there is no parent", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Success: SuccessOutput },
        events: [ParentRequestProgress],
        emits: [ParentRequestProgress],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          entry: ({ runtime }) =>
            Machine.action(
              Effect.gen(function*() {
                const machine = yield* runtime
                yield* machine.sendParent(new ParentRequestProgress({ id: "request", loaded: 42 }))
              })
            ),
          on: {
            ParentRequestProgress: () => FlatInitial.Success(new Success({ requestId: "unexpected" }))
          }
        },
        Success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "active",
        state: { path: "Idle", value: new Idle({ userId: "user-1" }) }
      })
      yield* actor.stop
    }))

  it.effect("runtime raises events from local deferred actions", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Success: SuccessOutput },
        events: [Resolve],
        initial: () => FlatInitial.Idle(new Idle({ userId: "user-1" }))
      }).handle({
        Idle: {
          entry: ({ runtime }) =>
            Machine.action(
              Effect.gen(function*() {
                const machine = yield* runtime
                yield* machine.raise(new Resolve({}))
              })
            ),
          on: {
            Resolve: ({ state }) => FlatInitial.Success(new Success({ requestId: state.userId }))
          }
        },
        Success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(machine)

      assert.strictEqual(yield* actor.join, "user-1")
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "user-1" }) },
        output: "user-1"
      })
    }))

  it.effect("runtime sends emitted events to the parent from external action helpers", () =>
    Effect.gen(function*() {
      const notifyWorkerDone = (
        sendParent: (event: ParentRequestProgress) => Effect.Effect<void, Machine.StoppedError>
      ) => sendParent(new ParentRequestProgress({ id: "request", loaded: 42 }))
      const childLogic = Machine.logic({
        initial: undefined,
        run: ({ sendParent }) => notifyWorkerDone(sendParent)
      })

      const parentMachine = Machine.make({
        states: { Idle, Success: SuccessOutput },
        events: [Submit, ParentRequestProgress],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              yield* Machine.action(
                Machine.spawn(childLogic, { id: "request" }).pipe(Effect.asVoid)
              )
            }),
            ParentRequestProgress: ({ event }) =>
              FlatInitial.Success(new Success({ requestId: `${event.id}:${event.loaded}` }))
          }
        },
        Success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(parentMachine, { userId: "parent-user" })

      yield* actor.send(new Submit({ value: "start" }))

      assert.strictEqual(yield* actor.join, "request:42")
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "request:42" }) },
        output: "request:42"
      })
    }))

  it.effect("start spawns children from machine actions and sends to them by id", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Machine.MachineRef<number, ChildPing, never, void>>()
      const childLogic = Machine.logic({
        initial: 0,
        run: ({ receive }) =>
          receive.pipe(
            Effect.flatMap((event) => Deferred.succeed(event.reply, void 0)),
            Effect.forever
          )
      })
      const machine = Machine.make({
        states: { Idle, Loading, Success: SuccessOutput },
        events: [Submit, Resolve],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              yield* Machine.action(
                Effect.gen(function*() {
                  const child = yield* Machine.spawn(childLogic, { id: "child" })
                  const reply = yield* Deferred.make<void>()
                  yield* Deferred.succeed(childRef, child)
                  yield* Machine.sendTo("child", new ChildPing({ reply }))
                  yield* Deferred.await(reply)
                })
              )
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {
          on: {
            Resolve: () => FlatInitial.Success(new Success({ requestId: "request-1" }))
          }
        },
        Success: {
          type: "final",
          entry: () => Machine.action(Machine.stopChild("child")),
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })
      yield* actor.send(new Submit({ value: "hello" }))
      const child = yield* Deferred.await(childRef)

      yield* actor.send(new Resolve({}))

      assert.strictEqual(yield* actor.join, "request-1")
      assert.deepStrictEqual(yield* child.snapshot, {
        status: "stopped",
        state: 0
      })
    }))

  it.effect("start sends to spawned child processes by typed child address", () =>
    Effect.gen(function*() {
      const Child = Machine.child<ChildPing>("child")
      const childRef = yield* Deferred.make<Machine.MachineRef<number, ChildPing, never, void>>()
      const childLogic = Machine.logic({
        initial: 0,
        run: ({ receive }) =>
          receive.pipe(
            Effect.flatMap((event) => Deferred.succeed(event.reply, void 0)),
            Effect.forever
          )
      })
      const machine = Machine.make({
        states: { Idle, Loading, Success: SuccessOutput },
        events: [Submit, Resolve],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              yield* Machine.action(
                Effect.gen(function*() {
                  const child = yield* Machine.spawn(childLogic, { id: Child })
                  const reply = yield* Deferred.make<void>()
                  yield* Deferred.succeed(childRef, child)
                  yield* Machine.sendTo(Child, new ChildPing({ reply }))
                  yield* Deferred.await(reply)
                })
              )
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {
          on: {
            Resolve: () => FlatInitial.Success(new Success({ requestId: "request-1" }))
          }
        },
        Success: {
          type: "final",
          entry: () => Machine.action(Machine.stopChild(Child)),
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })
      yield* actor.send(new Submit({ value: "hello" }))
      const child = yield* Deferred.await(childRef)

      yield* actor.send(new Resolve({}))

      assert.strictEqual(yield* actor.join, "request-1")
      assert.deepStrictEqual(yield* child.snapshot, {
        status: "stopped",
        state: 0
      })
    }))

  it.effect("start returns spawned child refs to machine actions", () =>
    Effect.gen(function*() {
      const childRef = yield* Deferred.make<Machine.MachineRef<number, ChildPing, never, void>>()
      const childLogic = Machine.logic({
        initial: 0,
        run: ({ receive }) =>
          receive.pipe(
            Effect.flatMap((event) => Deferred.succeed(event.reply, void 0)),
            Effect.forever
          )
      })
      const machine = Machine.make({
        states: { Idle, Loading, Success: SuccessOutput },
        events: [Submit, Resolve],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              yield* Machine.action(
                Effect.gen(function*() {
                  const child = yield* Machine.spawn(childLogic, { id: "child" })
                  const reply = yield* Deferred.make<void>()
                  yield* Deferred.succeed(childRef, child)
                  yield* child.send(new ChildPing({ reply }))
                  yield* Deferred.await(reply)
                })
              )
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {
          on: {
            Resolve: () => FlatInitial.Success(new Success({ requestId: "request-1" }))
          }
        },
        Success: {
          type: "final",
          entry: () => Machine.action(Machine.stopChild("child")),
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })
      yield* actor.send(new Submit({ value: "hello" }))
      const child = yield* Deferred.await(childRef)

      yield* actor.send(new Resolve({}))

      assert.strictEqual(yield* actor.join, "request-1")
      assert.deepStrictEqual(yield* child.snapshot, {
        status: "stopped",
        state: 0
      })
    }))

  it.effect("start fails when machine actions spawn duplicate child ids", () =>
    Effect.gen(function*() {
      const childLogic = Machine.effect(Effect.never)
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              yield* Machine.action(
                Effect.gen(function*() {
                  yield* Machine.spawn(childLogic, { id: "worker" })
                  yield* Machine.spawn(childLogic, { id: "worker" })
                })
              )
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {}
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))
      const error = yield* Effect.flip(actor.join)

      assert.strictEqual(error._tag, "ChildAlreadyExistsError")
      if (error._tag === "ChildAlreadyExistsError") {
        assert.strictEqual(error.id, "worker")
      }
      const snapshot = yield* actor.snapshot
      assert.strictEqual(snapshot.status, "error")
    }))

  it.effect("start releases named child ids after a child completes immediately", () =>
    Effect.gen(function*() {
      const completed = yield* Deferred.make<void>()
      const childLogic = Machine.effect(Effect.void)
      const machine = Machine.make({
        states: { Idle },
        events: [Resolve],
        initial: () => FlatInitial.Idle(new Idle({ userId: "user-1" }))
      }).handle({
        Idle: {
          on: {
            Resolve: () =>
              Machine.action(
                Effect.gen(function*() {
                  const first = yield* Machine.spawn(childLogic, { id: "worker" })
                  yield* first.join
                  const second = yield* Machine.spawn(childLogic, { id: "worker" })
                  yield* second.join
                  yield* Deferred.succeed(completed, void 0)
                })
              )
          }
        }
      })

      const ref = yield* Machine.start(machine)
      yield* ref.send(new Resolve({}))
      yield* Deferred.await(completed)
      yield* ref.stop
    }))

  it.effect("start invokes a child process and handles its output event", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading, Success: SuccessOutput },
        events: [Submit, RequestSucceeded],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          invoke: Machine.invoke({
            id: "request",
            src: ({ state }) =>
              Machine.effect(
                Effect.succeed(new RequestSucceeded({ value: `done:${state.requestId}` }))
              )
          }),
          on: {
            RequestSucceeded: ({ event }) => FlatInitial.Success(new Success({ requestId: event.value }))
          }
        },
        Success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))

      assert.strictEqual(yield* actor.join, "done:request-1")
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "done:request-1" }) },
        output: "done:request-1"
      })
    }))

  it.effect("start invokes a child process by typed child address", () =>
    Effect.gen(function*() {
      const Request = Machine.child<never>("request")
      const childLogic = Machine.effect(
        Effect.succeed(new RequestSucceeded({ value: "done:request-1" }))
      )
      const machine = Machine.make({
        states: { Idle, Loading, Success: SuccessOutput },
        events: [Submit, RequestSucceeded],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          invoke: Machine.invoke({
            id: Request,
            src: () => childLogic
          }),
          on: {
            RequestSucceeded: ({ event }) => FlatInitial.Success(new Success({ requestId: event.value }))
          }
        },
        Success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))

      assert.strictEqual(yield* actor.join, "done:request-1")
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "done:request-1" }) },
        output: "done:request-1"
      })
    }))

  it.effect("start maps invoked child failures to machine events", () =>
    Effect.gen(function*() {
      const error = new InvokeError({ message: "boom" })
      const machine = Machine.make({
        states: { Idle, Loading, Failed: FailedOutput },
        events: [Submit, RequestFailed],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          invoke: Machine.invoke({
            id: "request",
            src: () =>
              Machine.effect(
                Effect.fail(error).pipe(
                  Effect.catch((error) => Effect.succeed(new RequestFailed({ error, cause: Cause.fail(error) })))
                )
              )
          }),
          on: {
            RequestFailed: ({ event }) => FlatInitial.Failed(new Failed({ message: event.error.message }))
          }
        },
        Failed: {
          type: "final",
          output: ({ state }) => state.message
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))

      assert.strictEqual(yield* actor.join, "boom")
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Failed", value: new Failed({ message: "boom" }) },
        output: "boom"
      })
    }))

  it.effect("start maps invoked child active snapshots to machine events", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading, Success: SuccessOutput },
        events: [Submit, RequestProgress],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          invoke: Machine.invoke({
            id: "request",
            src: () => Machine.logic({ initial: "pending", run: () => Effect.never }),
            snapshot: ({ id, snapshot }) => new RequestProgress({ id, childState: snapshot.state })
          }),
          on: {
            RequestProgress: ({ event }) =>
              FlatInitial.Success(new Success({ requestId: `${event.id}:${event.childState}` }))
          }
        },
        Success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))

      assert.strictEqual(yield* actor.join, "request:pending")
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "request:pending" }) },
        output: "request:pending"
      })
    }))

  it.effect("start fails the owning machine when an invoked effect failure is not recovered", () =>
    Effect.gen(function*() {
      const error = new InvokeError({ message: "boom" })
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          invoke: Machine.invoke({
            id: "request",
            src: () => Machine.effect(Effect.fail(error))
          })
        }
      })

      const ref = yield* Machine.start(machine, { userId: "user-1" })
      yield* ref.send(new Submit({ value: "hello" }))

      assert.strictEqual(yield* Effect.flip(ref.join), error)
      const snapshot = yield* ref.snapshot
      assert.strictEqual(snapshot.status, "error")
      assert.deepStrictEqual(snapshot.state, {
        path: "Loading",
        value: new Loading({ requestId: "request-1" })
      })
    }))

  it.effect("start lets invoke snapshot mappers filter with undefined", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const machine = Machine.make({
        states: { Idle, Loading, Success: SuccessOutput },
        events: [Submit, RequestProgress],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          invoke: Machine.invoke({
            id: "request",
            src: () =>
              Machine.logic({
                initial: "pending",
                run: ({ setState }) =>
                  Deferred.succeed(started, void 0).pipe(
                    Effect.andThen(Deferred.await(release)),
                    Effect.andThen(setState("ready")),
                    Effect.andThen(Effect.never)
                  )
              }),
            snapshot: ({ id, snapshot }) =>
              snapshot.state === "ready" ? new RequestProgress({ id, childState: snapshot.state }) : undefined
          }),
          on: {
            RequestProgress: ({ event }) => FlatInitial.Success(new Success({ requestId: event.childState }))
          }
        },
        Success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))
      yield* Deferred.await(started)
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "active",
        state: { path: "Loading", value: new Loading({ requestId: "request-1" }) }
      })

      yield* Deferred.succeed(release, void 0)

      assert.strictEqual(yield* actor.join, "ready")
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "ready" }) },
        output: "ready"
      })
    }))

  it.effect("start allows invoked children without a snapshot mapper", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          invoke: Machine.invoke({
            id: "request",
            src: () =>
              Machine.logic({
                initial: "pending",
                run: () => Effect.void
              })
          })
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "active",
        state: { path: "Loading", value: new Loading({ requestId: "request-1" }) }
      })

      yield* actor.stop
    }))

  it.effect("start stops invoked children when leaving a state and ignores stale snapshots", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const resetHandled = yield* Deferred.make<void>()
      const machine = Machine.make({
        states: { Idle, Loading, Success },
        events: [Submit, Reset, RequestProgress],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          invoke: Machine.invoke({
            id: "request",
            src: () =>
              Machine.logic({
                initial: "pending",
                run: ({ setState }) =>
                  Deferred.succeed(started, void 0).pipe(
                    Effect.andThen(Deferred.await(release)),
                    Effect.andThen(setState("ready")),
                    Effect.andThen(Effect.never)
                  )
              }),
            snapshot: ({ id, snapshot }) =>
              snapshot.state === "ready" ? new RequestProgress({ id, childState: snapshot.state }) : undefined
          }),
          on: {
            Reset: Effect.fn(function*() {
              yield* Machine.action(Deferred.succeed(resetHandled, void 0))
              return FlatInitial.Idle(new Idle({ userId: "user-1" }))
            }),
            RequestProgress: ({ event }) => FlatInitial.Success(new Success({ requestId: event.childState }))
          }
        },
        Success: {
          type: "final"
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))
      yield* Deferred.await(started)
      yield* actor.send(new Reset({}))
      yield* Deferred.await(resetHandled)
      yield* Deferred.succeed(release, void 0)
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "active",
        state: { path: "Idle", value: new Idle({ userId: "user-1" }) }
      })

      yield* actor.stop
    }))

  it.effect("start stops invoked children when leaving a state and ignores stale outcomes", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const resetHandled = yield* Deferred.make<void>()
      const machine = Machine.make({
        states: { Idle, Loading, Success },
        events: [Submit, Reset, RequestSucceeded],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          invoke: Machine.invoke({
            id: "request",
            src: () =>
              Machine.logic({
                initial: "pending",
                run: () =>
                  Deferred.succeed(started, void 0).pipe(
                    Effect.andThen(Deferred.await(release)),
                    Effect.as(new RequestSucceeded({ value: "late" }))
                  )
              })
          }),
          on: {
            Reset: Effect.fn(function*() {
              yield* Machine.action(Deferred.succeed(resetHandled, void 0))
              return FlatInitial.Idle(new Idle({ userId: "user-1" }))
            }),
            RequestSucceeded: ({ event }) => FlatInitial.Success(new Success({ requestId: event.value }))
          }
        },
        Success: {
          type: "final"
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))
      yield* Deferred.await(started)
      yield* actor.send(new Reset({}))
      yield* Deferred.await(resetHandled)
      yield* Deferred.succeed(release, void 0)
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "active",
        state: { path: "Idle", value: new Idle({ userId: "user-1" }) }
      })

      yield* actor.stop
    }))

  it.effect("start finishes invoke cleanup before leaving a state", () =>
    Effect.gen(function*() {
      const childStarted = yield* Deferred.make<void>()
      const childStopping = yield* Deferred.make<void>()
      const releaseChildStop = yield* Deferred.make<void>()
      const resetHandled = yield* Deferred.make<void>()
      let stoppedOutcomes = 0
      const childLogic = Machine.logic({
        initial: "pending",
        run: () =>
          Deferred.succeed(childStarted, void 0).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() =>
              Deferred.succeed(childStopping, void 0).pipe(
                Effect.andThen(Deferred.await(releaseChildStop))
              )
            )
          )
      })
      const machine = Machine.make({
        states: { Idle, Loading, Success },
        events: [Submit, Reset, RequestSucceeded],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          invoke: Machine.invoke({
            id: "request",
            src: () => childLogic
          }),
          on: {
            Reset: Effect.fn(function*() {
              yield* Machine.action(Deferred.succeed(resetHandled, void 0))
              return FlatInitial.Idle(new Idle({ userId: "user-1" }))
            }),
            RequestSucceeded: ({ event }) => FlatInitial.Success(new Success({ requestId: event.value }))
          }
        },
        Success: {
          type: "final"
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))
      yield* Deferred.await(childStarted)
      yield* actor.send(new Reset({}))
      yield* Deferred.await(childStopping)

      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "active",
        state: { path: "Loading", value: new Loading({ requestId: "request-1" }) }
      })

      yield* Deferred.succeed(releaseChildStop, void 0)
      yield* Deferred.await(resetHandled)
      yield* Effect.yieldNow

      assert.strictEqual(stoppedOutcomes, 0)
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "active",
        state: { path: "Idle", value: new Idle({ userId: "user-1" }) }
      })

      yield* actor.stop
    }))

  it.effect("start stops active invokes before final join completes", () =>
    Effect.gen(function*() {
      const childStarted = yield* Deferred.make<void>()
      const childStopping = yield* Deferred.make<void>()
      const releaseChildStop = yield* Deferred.make<void>()
      const joinDone = yield* Ref.make(false)
      let stoppedOutcomes = 0
      const childLogic = Machine.logic({
        initial: "pending",
        run: () =>
          Deferred.succeed(childStarted, void 0).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() =>
              Deferred.succeed(childStopping, void 0).pipe(
                Effect.andThen(Deferred.await(releaseChildStop))
              )
            )
          )
      })
      const machine = Machine.make({
        states: { Idle, Loading, Success: SuccessOutput },
        events: [Submit, Resolve, RequestSucceeded],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          invoke: Machine.invoke({
            id: "request",
            src: () => childLogic
          }),
          on: {
            Resolve: () => FlatInitial.Success(new Success({ requestId: "request-1" })),
            RequestSucceeded: ({ event }) => FlatInitial.Success(new Success({ requestId: event.value }))
          }
        },
        Success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })
      const joinFiber = yield* actor.join.pipe(
        Effect.tap(() => Ref.set(joinDone, true)),
        Effect.forkChild
      )

      yield* actor.send(new Submit({ value: "hello" }))
      yield* Deferred.await(childStarted)
      yield* actor.send(new Resolve({}))
      yield* Deferred.await(childStopping)

      assert.strictEqual(yield* Ref.get(joinDone), false)
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "active",
        state: { path: "Loading", value: new Loading({ requestId: "request-1" }) }
      })

      yield* Deferred.succeed(releaseChildStop, void 0)

      assert.strictEqual(yield* Fiber.join(joinFiber), "request-1")
      assert.strictEqual(stoppedOutcomes, 0)
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "done",
        state: { path: "Success", value: new Success({ requestId: "request-1" }) },
        output: "request-1"
      })
    }))

  it.effect("start keeps invokes on implicit self-transitions and restarts them on reentry", () =>
    Effect.gen(function*() {
      const firstStarted = yield* Deferred.make<void>()
      const secondStarted = yield* Deferred.make<void>()
      const resolved = yield* Deferred.make<void>()
      const resetHandled = yield* Deferred.make<void>()
      const starts = yield* Ref.make(0)
      const childLogic = Machine.logic({
        initial: "pending",
        run: () =>
          Effect.gen(function*() {
            const count = yield* Ref.updateAndGet(starts, (count) => count + 1)
            if (count === 1) {
              yield* Deferred.succeed(firstStarted, void 0)
            } else if (count === 2) {
              yield* Deferred.succeed(secondStarted, void 0)
            }
            return yield* Effect.never
          })
      })
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit, Reset, Resolve, RequestSucceeded],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          invoke: Machine.invoke({
            id: "request",
            src: () => childLogic
          }),
          on: {
            Resolve: Effect.fn(function*() {
              yield* Machine.action(Deferred.succeed(resolved, void 0))
            }),
            Reset: {
              reenter: true,
              transition: Effect.fn(function*() {
                yield* Machine.action(Deferred.succeed(resetHandled, void 0))
                return FlatInitial.Loading(new Loading({ requestId: "request-2" }))
              })
            }
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      yield* actor.send(new Submit({ value: "hello" }))
      yield* Deferred.await(firstStarted)
      yield* actor.send(new Resolve({}))
      yield* Deferred.await(resolved)
      yield* Effect.yieldNow

      assert.strictEqual(yield* Ref.get(starts), 1)

      yield* actor.send(new Reset({}))
      yield* Deferred.await(resetHandled)
      yield* Deferred.await(secondStarted)

      assert.strictEqual(yield* Ref.get(starts), 2)
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "active",
        state: { path: "Loading", value: new Loading({ requestId: "request-2" }) }
      })

      yield* actor.stop
    }))

  it.effect("start scopes invokes to entered and exited compound state nodes", () =>
    Effect.gen(function*() {
      const payment = new Payment({ id: "payment-1" })
      const entering = new EnteringPayment({ amount: 100 })
      const parentStarted = yield* Deferred.make<void>()
      const enteringStarted = yield* Deferred.make<void>()
      const authorizedStarted = yield* Deferred.make<void>()
      const stopped = yield* Ref.make<ReadonlyArray<string>>([])
      const makeInvokeLogic = (label: string, started: Deferred.Deferred<void>) =>
        Machine.logic({
          initial: "pending",
          run: () =>
            Deferred.succeed(started, void 0).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() => Ref.update(stopped, (labels) => [...labels, label]))
            )
        })
      const machine = Machine.make({
        states: {
          payment: {
            schema: Payment,
            initial: "entering",
            states: {
              entering: EnteringPayment,
              authorized: AuthorizedPayment
            }
          }
        },
        events: [Authorize],
        initial: () => ({
          path: "payment",
          value: payment,
          state: {
            path: "payment.entering" as const,
            value: entering
          }
        })
      }).handle({
        payment: {
          invoke: Machine.invoke({
            id: "request",
            src: () => makeInvokeLogic("parent", parentStarted)
          }),
          states: {
            entering: {
              invoke: Machine.invoke({
                id: "request",
                src: () => makeInvokeLogic("entering", enteringStarted)
              }),
              on: {
                Authorize: ({ event, target }) => target.local.authorized(new AuthorizedPayment({ code: event.code }))
              }
            },
            authorized: {
              invoke: Machine.invoke({
                id: "request",
                src: () => makeInvokeLogic("authorized", authorizedStarted)
              })
            }
          }
        }
      })

      const actor = yield* Machine.start(machine)
      yield* Deferred.await(parentStarted)
      yield* Deferred.await(enteringStarted)

      yield* sendAndWaitForSnapshot(
        actor,
        new Authorize({ code: "auth-1" }),
        (snapshot) =>
          snapshot.status === "active" &&
          snapshot.state.path === "payment" &&
          (snapshot.state as any).state.path === "payment.authorized"
      )
      yield* Deferred.await(authorizedStarted)

      assert.deepStrictEqual(yield* Ref.get(stopped), ["entering"])

      yield* actor.stop

      const stoppedLabels = yield* Ref.get(stopped)
      assert.deepStrictEqual([...stoppedLabels].sort(), ["authorized", "entering", "parent"])
    }))

  it.effect("start stops parent and parallel region invokes before final completion", () =>
    Effect.gen(function*() {
      const fulfillment = new Fulfillment({ id: "fulfillment-1" })
      const inventory = new Inventory({ warehouse: "warehouse-1" })
      const shipping = new Shipping({ address: "Main Street" })
      const releaseStops = yield* Deferred.make<void>()
      const parentStarted = yield* Deferred.make<void>()
      const inventoryStarted = yield* Deferred.make<void>()
      const shippingStarted = yield* Deferred.make<void>()
      const parentStopping = yield* Deferred.make<void>()
      const inventoryStopping = yield* Deferred.make<void>()
      const shippingStopping = yield* Deferred.make<void>()
      const joinDone = yield* Ref.make(false)
      const makeInvokeLogic = (started: Deferred.Deferred<void>, stopping: Deferred.Deferred<void>) =>
        Machine.logic({
          initial: "pending",
          run: () =>
            Deferred.succeed(started, void 0).pipe(
              Effect.andThen(Effect.never),
              Effect.onInterrupt(() =>
                Deferred.succeed(stopping, void 0).pipe(
                  Effect.andThen(Deferred.await(releaseStops))
                )
              )
            )
        })
      const machine = Machine.make({
        states: {
          fulfillment: {
            schema: Fulfillment,
            type: "parallel",
            states: {
              inventory: {
                schema: Inventory,
                initial: "checking",
                states: {
                  checking: CheckingInventory
                }
              },
              shipping: {
                schema: Shipping,
                initial: "quoting",
                states: {
                  quoting: QuotingShipping
                }
              }
            }
          },
          success: {
            schema: Success,
            type: "final",
            output: Schema.String
          }
        },
        events: [ReserveInventory],
        initial: () => ({
          path: "fulfillment",
          value: fulfillment,
          states: {
            inventory: {
              path: "fulfillment.inventory" as const,
              value: inventory,
              state: {
                path: "fulfillment.inventory.checking" as const,
                value: new CheckingInventory({ sku: "sku-1" })
              }
            },
            shipping: {
              path: "fulfillment.shipping" as const,
              value: shipping,
              state: {
                path: "fulfillment.shipping.quoting" as const,
                value: new QuotingShipping({ postalCode: "12345" })
              }
            }
          }
        })
      }).handle({
        fulfillment: {
          invoke: Machine.invoke({
            id: "request",
            src: () => makeInvokeLogic(parentStarted, parentStopping)
          }),
          states: {
            inventory: {
              invoke: Machine.invoke({
                id: "request",
                src: () => makeInvokeLogic(inventoryStarted, inventoryStopping)
              }),
              states: {
                checking: {
                  on: {
                    ReserveInventory: ({ target }) => target.full.success(new Success({ requestId: "done" }))
                  }
                }
              }
            },
            shipping: {
              invoke: Machine.invoke({
                id: "request",
                src: () => makeInvokeLogic(shippingStarted, shippingStopping)
              })
            }
          }
        },
        success: {
          type: "final",
          output: ({ state }) => state.requestId
        }
      })

      const actor = yield* Machine.start(machine)
      const joinFiber = yield* actor.join.pipe(
        Effect.tap(() => Ref.set(joinDone, true)),
        Effect.forkChild
      )
      yield* Deferred.await(parentStarted)
      yield* Deferred.await(inventoryStarted)
      yield* Deferred.await(shippingStarted)

      const sendFiber = yield* actor.send(new ReserveInventory({ reservationId: "res-1" })).pipe(
        Effect.forkChild
      )
      yield* Deferred.await(parentStopping)
      yield* Deferred.await(inventoryStopping)
      yield* Deferred.await(shippingStopping)

      assert.strictEqual(yield* Ref.get(joinDone), false)

      yield* Deferred.succeed(releaseStops, void 0)
      yield* Fiber.join(sendFiber)

      assert.strictEqual(yield* Fiber.join(joinFiber), "done")
    }))

  it.effect("start keeps state-scoped invokes separate from spawned children", () =>
    Effect.gen(function*() {
      const spawnedStarted = yield* Deferred.make<void>()
      const spawnedStopped = yield* Deferred.make<void>()
      const invokeStarted = yield* Deferred.make<void>()
      const invokeStops = yield* Ref.make(0)
      const spawnedLogic = Machine.logic({
        initial: "pending",
        run: () =>
          Deferred.succeed(spawnedStarted, void 0).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() => Deferred.succeed(spawnedStopped, void 0))
          )
      })
      const invokeLogic = Machine.logic({
        initial: "pending",
        run: () =>
          Deferred.succeed(invokeStarted, void 0).pipe(
            Effect.andThen(Effect.never),
            Effect.onInterrupt(() => Ref.update(invokeStops, (count) => count + 1))
          )
      })
      const machine = Machine.make({
        states: { Idle },
        events: [Resolve],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          entry: () =>
            Machine.action(
              Machine.spawn(spawnedLogic, { id: "worker" }).pipe(
                Effect.asVoid
              )
            ),
          invoke: Machine.invoke({
            id: "worker",
            src: () => invokeLogic
          }),
          on: {
            Resolve: () => Machine.action(Machine.stopChild("worker"))
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })
      yield* Deferred.await(spawnedStarted)
      yield* Deferred.await(invokeStarted)

      yield* actor.send(new Resolve({}))
      yield* Deferred.await(spawnedStopped)

      assert.strictEqual(yield* Ref.get(invokeStops), 0)

      yield* actor.stop

      assert.strictEqual(yield* Ref.get(invokeStops), 1)
    }))

  it.effect("start propagates startup failures", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle },
        events: [Submit],
        input: Input,
        initial: Effect.fn(function*({ userId }) {
          const state = new Idle({ userId })
          yield* Machine.action(Effect.fail(new InitialError({ state: state._tag })))
          return FlatInitial.Idle(state)
        })
      })

      const error = yield* Effect.flip(Machine.start(machine, { userId: "user-1" }))

      assert.instanceOf(error, InitialError)
      assert.strictEqual(error._tag, "InitialError")
      assert.strictEqual(error.state, "Idle")
    }))

  it.effect("sending an event that is not handled by the current state fails", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        id: "UserMachine",
        states: { Idle, Loading },
        events: [Submit, Reset],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              yield* Machine.action(Effect.succeed("submitted"))
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      assert.deepStrictEqual((yield* actor.state).value, new Idle({ userId: "user-1" }))

      yield* actor.send(new Reset({}))
      const error = yield* Effect.flip(actor.join)

      assert.instanceOf(error, Machine.UnhandledEventError)
      assert.strictEqual(error._tag, "UnhandledEventError")
      assert.strictEqual(error.machineId, "UserMachine")
      assert.strictEqual(error.state, "Idle")
      assert.strictEqual(error.event, "Reset")
      const snapshot = yield* actor.snapshot
      assert.strictEqual(snapshot.status, "error")
      if (snapshot.status === "error") {
        assert.deepStrictEqual(snapshot.state.value, new Idle({ userId: "user-1" }))
      }
    }))

  it.effect("handles required services in actions", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit, Reset],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              yield* Machine.action(
                Effect.gen(function*() {
                  const deferredLog = yield* DeferredLog
                  yield* deferredLog.push("submitted")
                })
              )

              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new Submit({ value: "hello" }),
        (snapshot) => snapshot.state.value._tag === "Loading"
      )
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* deferredLog.read, ["submitted"])
      assert.deepStrictEqual(snapshot, {
        status: "active",
        state: { path: "Loading", value: new Loading({ requestId: "request-1" }) }
      })
    }))

  it.effect("runs the actions in sequential order", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit, Reset],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              yield* Machine.action(
                Effect.gen(function*() {
                  const deferredLog = yield* DeferredLog
                  yield* deferredLog.push("submitted1")
                  yield* deferredLog.push("submitted2")
                })
              )

              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new Submit({ value: "hello" }),
        (snapshot) => snapshot.state.value._tag === "Loading"
      )
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* deferredLog.read, ["submitted1", "submitted2"])
      assert.deepStrictEqual(snapshot, {
        status: "active",
        state: { path: "Loading", value: new Loading({ requestId: "request-1" }) }
      })
    }))

  it.effect("runs exit, transition, and entry actions in order", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          exit: Effect.fn(function*({ event }) {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push(`exit:${String(event._tag)}`))
          }),
          on: {
            Submit: Effect.fn(function*() {
              const deferredLog = yield* DeferredLog
              yield* Machine.action(deferredLog.push("transition"))
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {
          entry: Effect.fn(function*({ event }) {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push(`entry:${String(event._tag)}`))
          })
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new Submit({ value: "hello" }),
        (snapshot) => snapshot.state.value._tag === "Loading"
      )
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* deferredLog.read, ["exit:Submit", "transition", "entry:Submit"])
      assert.deepStrictEqual(snapshot, {
        status: "active",
        state: { path: "Loading", value: new Loading({ requestId: "request-1" }) }
      })
    }))

  it.effect("plan collects entry and exit actions without running them", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          exit: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("exit"))
          }),
          on: {
            Submit: Effect.fn(function*() {
              const deferredLog = yield* DeferredLog
              yield* Machine.action(deferredLog.push("transition"))
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {
          entry: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("entry"))
          })
        }
      })

      const planned = yield* Machine.plan(
        machine,
        FlatInitial.Idle(new Idle({ userId: "user-1" })),
        new Submit({ value: "hello" })
      ).pipe(Effect.provideService(DeferredLog, deferredLog))

      assert.deepStrictEqual(planned.next.value, new Loading({ requestId: "request-1" }))
      assert.strictEqual(planned.actions.length, 3)
      assert.deepStrictEqual(yield* deferredLog.read, [])
    }))

  it.effect("plan follows always transitions to a settled state", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading, Success },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              const deferredLog = yield* DeferredLog
              yield* Machine.action(deferredLog.push("submit"))
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {
          always: Effect.fn(function*({ event, state }) {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push(`always:${String(event._tag)}`))
            return FlatInitial.Success(new Success({ requestId: state.requestId }))
          })
        }
      })

      const planned = yield* Machine.plan(
        machine,
        FlatInitial.Idle(new Idle({ userId: "user-1" })),
        new Submit({ value: "hello" })
      ).pipe(Effect.provideService(DeferredLog, deferredLog))

      assert.deepStrictEqual(planned.next.value, new Success({ requestId: "request-1" }))
      assert.strictEqual(planned.microsteps.length, 2)
      assert.strictEqual(planned.actions.length, 2)
      assert.deepStrictEqual(yield* deferredLog.read, [])
    }))

  it.effect("send follows always transitions before exposing the runtime state", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading, Success },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*() {
              const deferredLog = yield* DeferredLog
              yield* Machine.action(deferredLog.push("submit"))
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {
          always: Effect.fn(function*({ state }) {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("always"))
            return FlatInitial.Success(new Success({ requestId: state.requestId }))
          })
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new Submit({ value: "hello" }),
        (snapshot) => snapshot.state.value._tag === "Success"
      )
      yield* Effect.yieldNow

      assert.deepStrictEqual(snapshot, {
        status: "active",
        state: { path: "Success", value: new Success({ requestId: "request-1" }) }
      })
      assert.deepStrictEqual(yield* deferredLog.read, ["submit", "always"])
    }))

  it.effect("plan processes raised events before settling", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading, Success },
        events: [Submit, Resolve],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*({ runtime }) {
              const machine = yield* runtime
              yield* machine.raise(new Resolve({}))
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {
          on: {
            Resolve: ({ state }) => FlatInitial.Success(new Success({ requestId: state.requestId }))
          }
        }
      })

      const planned = yield* Machine.plan(
        machine,
        FlatInitial.Idle(new Idle({ userId: "user-1" })),
        new Submit({ value: "hello" })
      )

      assert.deepStrictEqual(planned.next.value, new Success({ requestId: "request-1" }))
      assert.strictEqual(planned.microsteps.length, 2)
    }))

  it.effect("send processes raised events from entry actions", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading, Success },
        events: [Submit, Resolve],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          entry: ({ runtime }) => Effect.flatMap(runtime, (machine) => machine.raise(new Resolve({}))),
          on: {
            Resolve: ({ state }) => FlatInitial.Success(new Success({ requestId: state.requestId }))
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })

      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new Submit({ value: "hello" }),
        (snapshot) => snapshot.state.value._tag === "Success"
      )

      assert.deepStrictEqual(snapshot, {
        status: "active",
        state: { path: "Success", value: new Success({ requestId: "request-1" }) }
      })
    }))

  it.effect("processes raised events in FIFO order", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading, Success },
        events: [Submit, Reset, Resolve],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*({ runtime }) {
              const machine = yield* runtime
              yield* machine.raise(new Reset({}))
              yield* machine.raise(new Resolve({}))
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {
          on: {
            Reset: ({ state }) => FlatInitial.Success(new Success({ requestId: state.requestId }))
          }
        },
        Success: {
          on: {
            Resolve: () => FlatInitial.Loading(new Loading({ requestId: "request-2" }))
          }
        }
      })

      const planned = yield* Machine.plan(
        machine,
        FlatInitial.Idle(new Idle({ userId: "user-1" })),
        new Submit({ value: "hello" })
      )

      assert.deepStrictEqual(planned.next.value, new Loading({ requestId: "request-2" }))
      assert.strictEqual(planned.microsteps.length, 3)
    }))

  it.effect("queues events raised from exit actions before transition actions", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit, Reset, Resolve],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          exit: Effect.fn(function*({ runtime }) {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("exit"))
            const machine = yield* runtime
            yield* machine.raise(new Reset({}))
          }),
          on: {
            Submit: Effect.fn(function*({ runtime }) {
              const deferredLog = yield* DeferredLog
              yield* Machine.action(deferredLog.push("transition"))
              const machine = yield* runtime
              yield* machine.raise(new Resolve({}))
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {
          on: {
            Reset: Effect.fn(function*() {
              const deferredLog = yield* DeferredLog
              yield* Machine.action(deferredLog.push("reset"))
            }),
            Resolve: Effect.fn(function*() {
              const deferredLog = yield* DeferredLog
              yield* Machine.action(deferredLog.push("resolve"))
            })
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new Submit({ value: "hello" }),
        (snapshot) => snapshot.state.value._tag === "Loading"
      )
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* deferredLog.read, ["exit", "transition", "reset", "resolve"])
      assert.deepStrictEqual(snapshot, {
        status: "active",
        state: { path: "Loading", value: new Loading({ requestId: "request-1" }) }
      })
    }))

  it.effect("selects always transitions before raised events", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading, Success },
        events: [Submit, Reset],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: Effect.fn(function*({ runtime }) {
              const machine = yield* runtime
              yield* machine.raise(new Reset({}))
              return FlatInitial.Loading(new Loading({ requestId: "request-1" }))
            })
          }
        },
        Loading: {
          always: ({ state }) => FlatInitial.Success(new Success({ requestId: state.requestId })),
          on: {
            Reset: () => FlatInitial.Idle(new Idle({ userId: "wrong" }))
          }
        },
        Success: {
          on: {
            Reset: () => FlatInitial.Loading(new Loading({ requestId: "request-2" }))
          }
        }
      })

      const planned = yield* Machine.plan(
        machine,
        FlatInitial.Idle(new Idle({ userId: "user-1" })),
        new Submit({ value: "hello" })
      )

      assert.deepStrictEqual(planned.next.value, new Success({ requestId: "request-2" }))
      assert.strictEqual(planned.microsteps.length, 4)
    }))

  it.effect("stops following always transitions after a no-op microstep", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          always: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("always"))
          })
        }
      })

      const planned = yield* Machine.plan(
        machine,
        FlatInitial.Idle(new Idle({ userId: "user-1" })),
        new Submit({ value: "hello" })
      ).pipe(Effect.provideService(DeferredLog, deferredLog))

      assert.deepStrictEqual(planned.next.value, new Loading({ requestId: "request-1" }))
      assert.strictEqual(planned.microsteps.length, 2)
      assert.strictEqual(planned.microsteps[1]?.changed, false)
    }))

  it.effect("fails when always transitions do not stabilize", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        id: "LoopMachine",
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          always: () => FlatInitial.Loading(new Loading({ requestId: "request-1" })),
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          always: () => FlatInitial.Idle(new Idle({ userId: "user-1" }))
        }
      })

      const error = yield* Effect.flip(
        Machine.plan(machine, FlatInitial.Idle(new Idle({ userId: "user-1" })), new Submit({ value: "hello" }))
      )

      assert.instanceOf(error, Machine.InfiniteTransitionError)
      assert.strictEqual(error._tag, "InfiniteTransitionError")
      assert.strictEqual(error.machineId, "LoopMachine")
      assert.strictEqual(error.maxIterations, 1000)
    }))

  it.effect("fails when completion transitions do not stabilize", () =>
    Effect.gen(function*() {
      const states = Machine.defineStates({
        idle: Idle,
        done: {
          schema: Success,
          type: "final"
        }
      })
      const machine = Machine.make({
        id: "CompletionLoopMachine",
        states: states.states,
        events: [Submit],
        initial: () => states.initial.idle(new Idle({ userId: "user-1" }))
      }).handle({
        idle: {
          on: {
            Submit: () => states.initial.done(new Success({ requestId: "request-1" }))
          }
        },
        done: {
          onDone: ({ state, target }) => target.full.done(state)
        }
      })

      const error = yield* Effect.flip(
        Machine.plan(
          machine,
          states.initial.idle(new Idle({ userId: "user-1" })),
          new Submit({ value: "request-1" })
        )
      )

      assert.instanceOf(error, Machine.InfiniteTransitionError)
      assert.strictEqual(error.machineId, "CompletionLoopMachine")
      assert.strictEqual(error.maxIterations, 1000)
    }))

  it.effect("does not run entry or exit actions for implicit self-transitions", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          entry: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("entry"))
          }),
          exit: Effect.fn(function*() {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push("exit"))
          }),
          on: {
            Submit: Effect.fn(function*() {
              const deferredLog = yield* DeferredLog
              yield* Machine.action(deferredLog.push("transition"))
            })
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      yield* actor.send(new Submit({ value: "hello" }))
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* deferredLog.read, ["entry", "transition"])
      assert.deepStrictEqual((yield* actor.state).value, new Idle({ userId: "user-1" }))
    }))

  it.effect("runs exit, transition, and entry actions for reentering self-transitions", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          entry: Effect.fn(function*({ event }) {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push(`entry:${String(event._tag)}`))
          }),
          exit: Effect.fn(function*({ event }) {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push(`exit:${String(event._tag)}`))
          }),
          on: {
            Submit: {
              reenter: true,
              transition: Effect.fn(function*() {
                const deferredLog = yield* DeferredLog
                yield* Machine.action(deferredLog.push("transition"))
                return FlatInitial.Idle(new Idle({ userId: "user-2" }))
              })
            }
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new Submit({ value: "hello" }),
        (snapshot) => snapshot.state.value._tag === "Idle" && snapshot.state.value.userId === "user-2"
      )
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* deferredLog.read, [
        "entry:Symbol(effect/Machine/InitialEvent)",
        "exit:Submit",
        "transition",
        "entry:Submit"
      ])
      assert.deepStrictEqual(snapshot, {
        status: "active",
        state: { path: "Idle", value: new Idle({ userId: "user-2" }) }
      })
    }))

  it.effect("reentering self-transitions can omit returning a state", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          entry: Effect.fn(function*({ event }) {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push(`entry:${String(event._tag)}`))
          }),
          exit: Effect.fn(function*({ event }) {
            const deferredLog = yield* DeferredLog
            yield* Machine.action(deferredLog.push(`exit:${String(event._tag)}`))
          }),
          on: {
            Submit: {
              reenter: true,
              transition: Effect.fn(function*() {
                const deferredLog = yield* DeferredLog
                yield* Machine.action(deferredLog.push("transition"))
              })
            }
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(DeferredLog, deferredLog)
      )

      yield* actor.send(new Submit({ value: "hello" }))
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* deferredLog.read, [
        "entry:Symbol(effect/Machine/InitialEvent)",
        "exit:Submit",
        "transition",
        "entry:Submit"
      ])
      assert.deepStrictEqual((yield* actor.state).value, new Idle({ userId: "user-1" }))
    }))

  it.effect("carries entry and exit action requirements", () =>
    Effect.gen(function*() {
      const deferredLog = yield* makeDeferredLog
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          exit: () =>
            ExitRequirement.pipe(
              Effect.flatMap((requirement) =>
                Machine.action(
                  DeferredLog.pipe(Effect.flatMap((deferredLog) => deferredLog.push(requirement.exitMessage)))
                )
              )
            ),
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          entry: () =>
            EntryRequirement.pipe(
              Effect.flatMap((requirement) =>
                Machine.action(
                  DeferredLog.pipe(Effect.flatMap((deferredLog) => deferredLog.push(requirement.entryMessage)))
                )
              )
            )
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" }).pipe(
        Effect.provideService(EntryRequirement, EntryRequirement.of({ entryMessage: "entry" })),
        Effect.provideService(ExitRequirement, ExitRequirement.of({ exitMessage: "exit" })),
        Effect.provideService(DeferredLog, deferredLog)
      )

      const snapshot = yield* sendAndWaitForSnapshot(
        actor,
        new Submit({ value: "hello" }),
        (snapshot) => snapshot.state.value._tag === "Loading"
      )
      yield* Effect.yieldNow

      assert.deepStrictEqual(yield* deferredLog.read, ["exit", "entry"])
      assert.deepStrictEqual(snapshot, {
        status: "active",
        state: { path: "Loading", value: new Loading({ requestId: "request-1" }) }
      })
    }))

  it.effect("propagates entry action failures", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        },
        Loading: {
          entry: ({ state }) => Machine.action(Effect.fail(new EntryError({ state: state._tag })))
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })
      yield* actor.send(new Submit({ value: "hello" }))
      const error = yield* Effect.flip(actor.join)

      assert.instanceOf(error, EntryError)
      assert.strictEqual(error._tag, "EntryError")
      assert.strictEqual(error.state, "Loading")
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "error",
        state: { path: "Idle", value: new Idle({ userId: "user-1" }) },
        cause: Cause.fail(error)
      })
    }))

  it.effect("propagates exit action failures", () =>
    Effect.gen(function*() {
      const machine = Machine.make({
        states: { Idle, Loading },
        events: [Submit],
        input: Input,
        initial: (input) => FlatInitial.Idle(new Idle({ userId: input.userId }))
      }).handle({
        Idle: {
          exit: ({ state }) => Machine.action(Effect.fail(new ExitError({ state: state._tag }))),
          on: {
            Submit: () => FlatInitial.Loading(new Loading({ requestId: "request-1" }))
          }
        }
      })

      const actor = yield* Machine.start(machine, { userId: "user-1" })
      yield* actor.send(new Submit({ value: "hello" }))
      const error = yield* Effect.flip(actor.join)

      assert.instanceOf(error, ExitError)
      assert.strictEqual(error._tag, "ExitError")
      assert.strictEqual(error.state, "Idle")
      assert.deepStrictEqual(yield* actor.snapshot, {
        status: "error",
        state: { path: "Idle", value: new Idle({ userId: "user-1" }) },
        cause: Cause.fail(error)
      })
    }))

  class CounterRunning extends Schema.TaggedClass<CounterRunning>("CounterRunning")("CounterRunning", {}) {}

  class LeftCounter extends Schema.TaggedClass<LeftCounter>("LeftCounter")("LeftCounter", {
    value: Schema.Number
  }) {}

  class RightCounter extends Schema.TaggedClass<RightCounter>("RightCounter")("RightCounter", {
    value: Schema.Number
  }) {}

  class AdvanceCounters extends Schema.TaggedClass<AdvanceCounters>("AdvanceCounters")("AdvanceCounters", {}) {}

  class ConcurrentIdle extends Schema.TaggedClass<ConcurrentIdle>("ConcurrentIdle")("ConcurrentIdle", {}) {}

  class ConcurrentPing extends Schema.TaggedClass<ConcurrentPing>("ConcurrentPing")("ConcurrentPing", {}) {}

  const ParallelCounterStates = Machine.defineStates({
    running: {
      schema: CounterRunning,
      type: "parallel",
      states: {
        left: LeftCounter,
        right: RightCounter
      }
    }
  })

  const makeParallelCounterMachine = () =>
    Machine.make({
      states: ParallelCounterStates.states,
      events: [AdvanceCounters],
      initial: () =>
        ParallelCounterStates.initial.running(
          new CounterRunning({}),
          (running) => running.left(new LeftCounter({ value: 0 })).right(new RightCounter({ value: 0 }))
        )
    }).handle({
      running: {
        states: {
          left: {
            on: {
              AdvanceCounters: ({ state, target }) =>
                target.branch.running.left(new LeftCounter({ value: state.value + 1 }))
            }
          },
          right: {
            on: {
              AdvanceCounters: ({ state, target }) =>
                target.branch.running.right(new RightCounter({ value: state.value + 1 }))
            }
          }
        }
      }
    })

  const makeConcurrentMachine = () => {
    const states = Machine.defineStates({ ConcurrentIdle })
    return Machine.make({
      states: states.states,
      events: [ConcurrentPing],
      initial: () => states.initial.ConcurrentIdle(new ConcurrentIdle({}))
    }).handle({
      ConcurrentIdle: {
        on: {
          ConcurrentPing: () => {}
        }
      }
    })
  }

  it.effect("keeps every parallel state active across repeated transitions", () =>
    Effect.gen(function*() {
      const machine = makeParallelCounterMachine()
      let snapshot: Machine.Machine.Snapshot<typeof ParallelCounterStates.states> =
        (yield* Machine.planInitial(machine)).state

      for (let iteration = 1; iteration <= 32; iteration++) {
        const cloned = {
          ...snapshot,
          states: { ...snapshot.states }
        }
        const planned = yield* Machine.plan(machine, cloned, new AdvanceCounters({}))

        assert.strictEqual(planned.next.path, "running")
        assert.deepStrictEqual(Object.keys(planned.next.states).sort(), ["left", "right"])
        assert.strictEqual(planned.next.states.left.path, "running.left")
        assert.strictEqual(planned.next.states.right.path, "running.right")
        assert.strictEqual(planned.next.states.left.value.value, iteration)
        assert.strictEqual(planned.next.states.right.value.value, iteration)

        for (const microstep of planned.microsteps) {
          assert.strictEqual(new Set(microstep.exitPaths).size, microstep.exitPaths.length)
          assert.strictEqual(new Set(microstep.entryPaths).size, microstep.entryPaths.length)
        }

        snapshot = planned.next
      }
    }))

  it.effect("reports a schema error when structuredClone removes state class identity", () =>
    Effect.gen(function*() {
      const machine = makeParallelCounterMachine()
      const snapshot = (yield* Machine.planInitial(machine)).state
      const error = yield* Effect.flip(Machine.plan(machine, structuredClone(snapshot), new AdvanceCounters({})))

      assert.instanceOf(error, Machine.MachineSchemaDecodeError)
      assert.strictEqual(error.boundary, "state")
      assert.strictEqual(error.state, "running")
    }))

  it.effect("leaves a machine stopped when it is stopped concurrently", () =>
    Effect.gen(function*() {
      const ref = yield* Machine.start(makeConcurrentMachine())

      yield* Effect.all([ref.stop, ref.stop, ref.stop], { concurrency: "unbounded" })

      assert.deepStrictEqual(yield* ref.snapshot, {
        status: "stopped",
        state: { path: "ConcurrentIdle", value: new ConcurrentIdle({}) }
      })
    }))

  it.effect("keeps a machine stopped when sending an event races with stopping it", () =>
    Effect.gen(function*() {
      for (let iteration = 0; iteration < 32; iteration++) {
        const ref = yield* Machine.start(makeConcurrentMachine())
        const send = ref.send(new ConcurrentPing({})).pipe(
          Effect.as("accepted" as const),
          Effect.catchTag("StoppedError", () => Effect.succeed("stopped" as const))
        )

        const [sendResult] = yield* Effect.all([send, ref.stop], { concurrency: "unbounded" })

        assert.strictEqual(sendResult === "accepted" || sendResult === "stopped", true)
        assert.strictEqual((yield* ref.snapshot).status, "stopped")
        assert.instanceOf(yield* Effect.flip(ref.send(new ConcurrentPing({}))), Machine.StoppedError)
      }
    }))
})
