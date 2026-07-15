import { Context, Effect, Schema } from "effect"
import { Machine } from "effect/unstable/machine"
import { describe, expect, it } from "tstyche"

describe("Machine", () => {
  class Up extends Schema.TaggedClass<Up>("Up")("Up", {
    id: Schema.String
  }) {}

  class Down extends Schema.TaggedClass<Down>("Down")("Down", {}) {}

  class Auth extends Schema.TaggedClass<Auth>("Auth")("Auth", {
    userId: Schema.String
  }) {}

  class SignedOut extends Schema.TaggedClass<SignedOut>("SignedOut")("SignedOut", {}) {}

  class SignedIn extends Schema.TaggedClass<SignedIn>("SignedIn")("SignedIn", {
    userId: Schema.String
  }) {}

  class Sync extends Schema.TaggedClass<Sync>("Sync")("Sync", {
    enabled: Schema.Boolean
  }) {}

  class SyncIdle extends Schema.TaggedClass<SyncIdle>("SyncIdle")("SyncIdle", {}) {}

  class Syncing extends Schema.TaggedClass<Syncing>("Syncing")("Syncing", {
    requestId: Schema.String
  }) {}

  class Payment extends Schema.TaggedClass<Payment>("Payment")("Payment", {}) {}

  class PendingPayment extends Schema.TaggedClass<PendingPayment>("PendingPayment")("PendingPayment", {}) {}

  class ApprovedPayment extends Schema.TaggedClass<ApprovedPayment>("ApprovedPayment")("ApprovedPayment", {
    authId: Schema.String
  }) {}

  class DeclinedPayment extends Schema.TaggedClass<DeclinedPayment>("DeclinedPayment")("DeclinedPayment", {
    reason: Schema.String
  }) {}

  class SignIn extends Schema.TaggedClass<SignIn>("SignIn")("SignIn", {
    userId: Schema.String
  }) {}

  class InitialRequirement extends Context.Service<InitialRequirement, {
    readonly initialMessage: string
  }>()("test/Machine/InitialRequirement") {}

  class EntryRequirement extends Context.Service<EntryRequirement, {
    readonly entryMessage: string
  }>()("test/Machine/EntryRequirement") {}

  class DoneRequirement extends Context.Service<DoneRequirement, {
    readonly doneMessage: string
  }>()("test/Machine/DoneRequirement") {}

  class DeferredRequirement extends Context.Service<DeferredRequirement, {
    readonly deferredMessage: string
  }>()("test/Machine/DeferredRequirement") {}

  const UpStates = Machine.defineStates({
    up: {
      schema: Up,
      type: "parallel",
      states: {
        auth: {
          schema: Auth,
          initial: "signedOut",
          states: {
            signedOut: SignedOut,
            signedIn: SignedIn
          }
        },
        sync: {
          schema: Sync,
          initial: "idle",
          states: {
            idle: SyncIdle,
            syncing: Syncing
          }
        }
      }
    },
    down: Down
  })

  type ChildBuilder<Method> = Method extends (value: any, build: (builder: infer Builder) => any) => any ? Builder
    : never
  type IsCallable<A> = A extends (...args: ReadonlyArray<any>) => any ? true : false

  type SignInContext = Machine.Machine.HandlerContext<
    typeof UpStates.states,
    readonly [typeof SignIn],
    [],
    "down",
    "SignIn",
    never,
    never
  >

  type SignedOutContext = Machine.Machine.HandlerContext<
    typeof UpStates.states,
    readonly [typeof SignIn],
    [],
    "up.auth.signedOut",
    "SignIn",
    never,
    never
  >

  type AuthContext = Machine.Machine.HandlerContext<
    typeof UpStates.states,
    readonly [typeof SignIn],
    [],
    "up.auth",
    "SignIn",
    never,
    never
  >

  it("defineStates preserves literal state paths", () => {
    expect<Machine.Machine.StateIdentifier<typeof UpStates.states>>().type.toBe<
      | "up"
      | "up.auth"
      | "up.auth.signedOut"
      | "up.auth.signedIn"
      | "up.sync"
      | "up.sync.idle"
      | "up.sync.syncing"
      | "down"
    >()
  })

  it("defineStates preserves declared compound initial keys", () => {
    expect<typeof UpStates.states.up.states.auth.initial>().type.toBe<"signedOut">()
    expect<typeof UpStates.states.up.states.sync.initial>().type.toBe<"idle">()
  })

  it("make accepts defined states", () => {
    const machine = Machine.make({
      states: UpStates.states,
      events: [SignIn],
      initial: () => UpStates.initial.down(new Down({}))
    })

    expect(machine.states).type.toBe<typeof UpStates.states>()
  })

  it("make rejects raw decoded initial states", () => {
    expect(Machine.make).type.not.toBeCallableWith({
      states: UpStates.states,
      events: [SignIn],
      initial: () => new Down({})
    })
  })

  it("make accepts effectful initial snapshots", () => {
    const machine = Machine.make({
      states: UpStates.states,
      events: [SignIn],
      initial: () => Effect.succeed(UpStates.initial.down(new Down({})))
    })

    expect(machine.states).type.toBe<typeof UpStates.states>()
  })

  it("planInitial carries external initial and lifecycle requirements", () => {
    const machine = Machine.make({
      states: UpStates.states,
      events: [SignIn],
      initial: () => Effect.as(InitialRequirement, UpStates.initial.down(new Down({})))
    }).handle({
      down: {
        entry: () => Effect.as(EntryRequirement, undefined)
      }
    })

    const planned = Machine.planInitial(machine)

    expect<Effect.Services<typeof planned>>().type.toBe<InitialRequirement | EntryRequirement>()
    expect<Effect.Services<Effect.Success<typeof planned>["actions"][number]>>().type.toBe<never>()
  })

  it("planInitial provides compatible machine runtime requirements", () => {
    const machine = Machine.make({
      states: UpStates.states,
      events: [SignIn],
      initial: () =>
        Effect.gen(function*() {
          const runtime = yield* Machine.runtime<{ readonly events: SignIn }>()
          yield* runtime.raise(new SignIn({ userId: "user-1" }))
          return UpStates.initial.down(new Down({}))
        })
    })

    const planned = Machine.planInitial(machine)

    expect<Effect.Services<typeof planned>>().type.toBe<never>()
  })

  it("keeps staged action errors and services out of planning", () => {
    const machine = Machine.make({
      states: UpStates.states,
      events: [SignIn],
      initial: () => UpStates.initial.down(new Down({}))
    }).handle({
      down: {
        entry: ({ action }) =>
          action(
            DeferredRequirement.pipe(
              Effect.andThen(Effect.fail("action-failed" as const))
            )
          )
      }
    })

    const planned = Machine.planInitial(machine)
    const started = Machine.start(machine)

    expect<Effect.Services<typeof planned>>().type.toBe<never>()
    expect<Effect.Error<Effect.Success<typeof planned>["actions"][number]>>().type.toBe<"action-failed">()
    expect<Effect.Services<Effect.Success<typeof planned>["actions"][number]>>().type.toBe<DeferredRequirement>()
    expect<"action-failed">().type.toBeAssignableTo<Effect.Error<typeof started>>()
  })

  it("effect infers output, errors, and requirements without an event protocol", () => {
    const success = Machine.effect(Effect.as(DeferredRequirement, 1 as const))
    const failure = Machine.effect(Effect.fail("effect-failed" as const))

    expect(success).type.toBeAssignableTo<
      Machine.Logic<void, never, never, DeferredRequirement, 1>
    >()
    expect(failure).type.toBeAssignableTo<
      Machine.Logic<void, never, "effect-failed", never, never>
    >()
    expect(Machine.effect).type.not.toBeCallableWith(() => Effect.succeed(1))
  })

  it("logic exposes public machine-scoped context types", () => {
    Machine.logic<number, SignIn>({
      initial: (scope) => {
        expect(scope).type.toBe<Machine.Logic.Scope<SignIn>>()
        expect(scope.self).type.toBe<Machine.Logic.Address<SignIn>>()
        return Effect.succeed(0)
      },
      run: (context) => {
        expect(context).type.toBe<Machine.Logic.Context<number, SignIn>>()
        return Effect.void
      }
    })
  })

  it("start discharges machine-scoped child runtime requirements", () => {
    const child = Machine.transition(0, (_state: number, _event: SignIn) => Effect.succeed(1))
    const machine = Machine.make({
      states: UpStates.states,
      events: [SignIn],
      initial: () => UpStates.initial.down(new Down({}))
    }).handle({
      down: {
        entry: ({ action }) => action(Machine.spawn(child).pipe(Effect.asVoid))
      }
    })
    const started = Machine.start(machine)

    expect<Effect.Services<typeof started>>().type.toBe<never>()
  })

  it("invoke requires one-shot outputs to be parent machine events or void", () => {
    const machine = Machine.make({
      states: UpStates.states,
      events: [SignIn],
      initial: () => UpStates.initial.down(new Down({}))
    })

    expect(machine.handle).type.toBeCallableWith({
      down: {
        invoke: Machine.invoke({
          id: "valid",
          src: () => Machine.effect(Effect.succeed(new SignIn({ userId: "user-1" })))
        })
      }
    })
    expect(machine.handle).type.not.toBeCallableWith({
      down: {
        invoke: Machine.invoke({
          id: "invalid",
          src: () => Machine.effect(Effect.succeed(1))
        })
      }
    })
  })

  it("plan and getters require snapshots", () => {
    const machine = Machine.make({
      states: UpStates.states,
      events: [SignIn],
      initial: () => UpStates.initial.down(new Down({}))
    })

    expect(Machine.plan).type.toBeCallableWith(
      machine,
      UpStates.initial.down(new Down({})),
      new SignIn({
        userId: "user-1"
      })
    )
    expect(Machine.enabled).type.toBeCallableWith(machine, UpStates.initial.down(new Down({})))
    expect(Machine.isFinal).type.toBeCallableWith(machine, UpStates.initial.down(new Down({})))

    expect(Machine.plan).type.not.toBeCallableWith(machine, new Down({}), new SignIn({ userId: "user-1" }))
    expect(Machine.enabled).type.not.toBeCallableWith(machine, new Down({}))
    expect(Machine.isFinal).type.not.toBeCallableWith(machine, new Down({}))
  })

  it("handlers reject raw decoded state returns", () => {
    const machine = Machine.make({
      states: UpStates.states,
      events: [SignIn],
      initial: () => UpStates.initial.down(new Down({}))
    })

    expect<IsCallable<typeof machine.handle>>().type.toBe<true>()
    expect(machine.handle).type.not.toBeCallableWith({
      down: {
        on: {
          SignIn: () => new Down({})
        }
      }
    })
    expect(machine.handle).type.not.toBeCallableWith({
      down: {
        on: {
          SignIn: () => Effect.succeed(new Down({}))
        }
      }
    })
  })

  it("handle accepts nested states through reserved states objects", () => {
    const machine = Machine.make({
      states: UpStates.states,
      events: [SignIn],
      initial: () => UpStates.initial.down(new Down({}))
    })

    machine.handle({
      up: {
        states: {
          auth: {
            states: {
              signedOut: {
                on: {
                  SignIn: ({ event, state, target }) => {
                    expect(event).type.toBe<SignIn>()
                    expect(state).type.toBe<SignedOut>()
                    return target.local.signedIn(new SignedIn({ userId: event.userId }))
                  }
                }
              }
            }
          }
        }
      }
    })
  })

  it("handle accepts parent config and child config in the same object", () => {
    const machine = Machine.make({
      states: UpStates.states,
      events: [SignIn],
      initial: () => UpStates.initial.down(new Down({}))
    })

    machine.handle({
      up: {
        entry: ({ event, state }) => {
          const id: string = state.id
          expect(event).type.toBe<SignIn | Machine.InitialEvent>()
          if (Machine.isInitialEvent(event)) {
            expect(event._tag).type.toBe<typeof Machine.InitialEventTypeId>()
          } else {
            expect(event.userId).type.toBe<string>()
          }
          void id
        },
        always: ({ event }) => {
          expect(event).type.toBe<SignIn | Machine.InitialEvent>()
        },
        states: {
          auth: {
            states: {
              signedOut: {
                on: {
                  SignIn: ({ event, target }) => target.local.signedIn(new SignedIn({ userId: event.userId }))
                }
              }
            }
          },
          sync: {
            states: {
              idle: {
                entry: ({ state }) => {
                  const tag: "SyncIdle" = state._tag
                  void tag
                }
              }
            }
          }
        }
      }
    })
  })

  it("onDone handlers receive typed state context and contribute effect requirements", () => {
    const machine = Machine.make({
      states: UpStates.states,
      events: [SignIn],
      initial: () =>
        UpStates.initial.up(
          new Up({ id: "up-1" }),
          (up) =>
            up
              .auth(
                new Auth({ userId: "user-1" }),
                (auth) => auth.signedOut(new SignedOut({}))
              )
              .sync(
                new Sync({ enabled: true }),
                (sync) => sync.idle(new SyncIdle({}))
              )
        )
    }).handle({
      up: {
        states: {
          auth: {
            onDone: ({ event, output, state, target }) => {
              expect(event).type.toBe<SignIn | Machine.InitialEvent>()
              expect(output).type.toBe<undefined>()
              expect(state).type.toBe<Auth>()
              return Effect.as(DoneRequirement, target.full.down(new Down({})))
            },
            states: {
              signedIn: {
                type: "final"
              }
            }
          }
        }
      }
    })

    const planned = Machine.plan(
      machine,
      UpStates.initial.up(
        new Up({ id: "up-1" }),
        (up) =>
          up
            .auth(
              new Auth({ userId: "user-1" }),
              (auth) => auth.signedOut(new SignedOut({}))
            )
            .sync(
              new Sync({ enabled: true }),
              (sync) => sync.idle(new SyncIdle({}))
            )
      ),
      new SignIn({ userId: "user-1" })
    )

    expect<Effect.Services<typeof planned>>().type.toBe<DoneRequirement>()
  })

  it("handle rejects old property and callback APIs", () => {
    const machine = Machine.make({
      states: UpStates.states,
      events: [SignIn],
      initial: () => UpStates.initial.down(new Down({}))
    })

    expect(machine.handle).type.not.toHaveProperty("up")
    expect(machine.handle).type.not.toBeCallableWith("up.auth.signedOut", {
      on: {}
    })
    expect(machine.handle).type.not.toBeCallableWith((up: unknown) => up)
  })

  it("final output callbacks receive lifecycle events", () => {
    const machine = Machine.make({
      states: {
        down: {
          schema: Down,
          type: "final",
          output: Schema.Void
        }
      },
      events: [SignIn],
      initial: () =>
        Machine.defineStates({ down: { schema: Down, type: "final", output: Schema.Void } }).initial.down(
          new Down({})
        )
    }).handle({
      down: {
        type: "final",
        output: ({ event }) => {
          expect(event).type.toBe<SignIn | Machine.InitialEvent>()
        }
      }
    })

    expect(machine).type.toBeAssignableTo<Machine.Machine.Any>()
  })

  it("final output callbacks conform to declared output schemas", () => {
    const States = Machine.defineStates({
      signedIn: {
        schema: SignedIn,
        type: "final",
        output: Schema.String
      }
    })

    const machine = Machine.make({
      states: States.states,
      events: [SignIn],
      initial: () => States.initial.signedIn(new SignedIn({ userId: "user-1" }))
    }).handle({
      signedIn: {
        type: "final",
        output: ({ state }) => state.userId
      }
    })

    const planned = Machine.planInitial(machine)
    expect<Effect.Success<typeof planned>["output"]>().type.toBe<string | undefined>()
  })

  it("rejects final output callbacks that do not match declared output schemas", () => {
    const States = Machine.defineStates({
      signedIn: {
        schema: SignedIn,
        type: "final",
        output: Schema.String
      }
    })
    const machine = Machine.make({
      states: States.states,
      events: [SignIn],
      initial: () => States.initial.signedIn(new SignedIn({ userId: "user-1" }))
    })

    expect(machine.handle).type.not.toBeCallableWith({
      signedIn: {
        type: "final",
        output: () => 1
      }
    })
  })

  it("compound onDone receives the declared child final output type", () => {
    const States = Machine.defineStates({
      auth: {
        schema: Auth,
        initial: "signedOut",
        states: {
          signedOut: SignedOut,
          signedIn: {
            schema: SignedIn,
            type: "final",
            output: Schema.String
          }
        }
      },
      down: Down
    })

    const machine = Machine.make({
      states: States.states,
      events: [SignIn],
      initial: () => States.initial.auth(new Auth({ userId: "user-1" }), (auth) => auth.signedOut(new SignedOut({})))
    })

    machine.handle({
      auth: {
        onDone: ({ output, target }) => {
          expect(output).type.toBe<string>()
          return target.full.down(new Down({}))
        },
        states: {
          signedIn: {
            type: "final",
            output: ({ state }) => state.userId
          }
        }
      }
    })
  })

  it("rejects compound onDone when declared child output is not implemented", () => {
    const States = Machine.defineStates({
      auth: {
        schema: Auth,
        initial: "signedOut",
        states: {
          signedOut: SignedOut,
          signedIn: {
            schema: SignedIn,
            type: "final",
            output: Schema.String
          }
        }
      }
    })
    const machine = Machine.make({
      states: States.states,
      events: [SignIn],
      initial: () => States.initial.auth(new Auth({ userId: "user-1" }), (auth) => auth.signedOut(new SignedOut({})))
    })

    expect(machine.handle).type.not.toBeCallableWith({
      auth: {
        onDone: () => undefined
      }
    })
  })

  it("multiple final children produce a discriminated completion output union", () => {
    const States = Machine.defineStates({
      payment: {
        schema: Payment,
        initial: "pending",
        states: {
          pending: PendingPayment,
          approved: {
            schema: ApprovedPayment,
            type: "final",
            output: Schema.Struct({
              status: Schema.Literal("approved"),
              authId: Schema.String
            })
          },
          declined: {
            schema: DeclinedPayment,
            type: "final",
            output: Schema.Struct({
              status: Schema.Literal("declined"),
              reason: Schema.String
            })
          }
        }
      }
    })
    const machine = Machine.make({
      states: States.states,
      events: [SignIn],
      initial: () => States.initial.payment(new Payment({}), (payment) => payment.pending(new PendingPayment({})))
    })

    machine.handle({
      payment: {
        onDone: ({ output }) => {
          expect(output.status).type.toBe<"approved" | "declined">()
          if (output.status === "approved") {
            expect(output.authId).type.toBe<string>()
          } else {
            expect(output.reason).type.toBe<string>()
          }
        },
        states: {
          approved: {
            type: "final",
            output: ({ state }) => ({
              status: "approved" as const,
              authId: state.authId
            })
          },
          declined: {
            type: "final",
            output: ({ state }) => ({
              status: "declined" as const,
              reason: state.reason
            })
          }
        }
      }
    })
  })

  it("parallel output callbacks receive typed region outputs and conform to declared output schemas", () => {
    const States = Machine.defineStates({
      up: {
        schema: Up,
        type: "parallel",
        output: Schema.Struct({
          userId: Schema.String,
          requestId: Schema.String
        }),
        states: {
          auth: {
            schema: Auth,
            initial: "signedOut",
            states: {
              signedOut: SignedOut,
              signedIn: {
                schema: SignedIn,
                type: "final",
                output: Schema.Struct({ userId: Schema.String })
              }
            }
          },
          sync: {
            schema: Sync,
            initial: "idle",
            states: {
              idle: SyncIdle,
              syncing: {
                schema: Syncing,
                type: "final",
                output: Schema.Struct({ requestId: Schema.String })
              }
            }
          }
        }
      }
    })
    const machine = Machine.make({
      states: States.states,
      events: [SignIn],
      initial: () =>
        States.initial.up(
          new Up({ id: "up-1" }),
          (up) =>
            up
              .auth(new Auth({ userId: "user-1" }), (auth) => auth.signedOut(new SignedOut({})))
              .sync(new Sync({ enabled: true }), (sync) => sync.idle(new SyncIdle({})))
        )
    })

    machine.handle({
      up: {
        output: ({ outputs }) => {
          expect(outputs.auth.userId).type.toBe<string>()
          expect(outputs.sync.requestId).type.toBe<string>()
          return {
            userId: outputs.auth.userId,
            requestId: outputs.sync.requestId
          }
        },
        onDone: ({ output }) => {
          expect(output.userId).type.toBe<string>()
          expect(output.requestId).type.toBe<string>()
        },
        states: {
          auth: {
            states: {
              signedIn: {
                type: "final",
                output: ({ state }) => ({ userId: state.userId })
              }
            }
          },
          sync: {
            states: {
              syncing: {
                type: "final",
                output: ({ state }) => ({ requestId: state.requestId })
              }
            }
          }
        }
      }
    })
  })

  it("rejects parallel output callbacks that do not match declared output schemas", () => {
    const States = Machine.defineStates({
      up: {
        schema: Up,
        type: "parallel",
        output: Schema.Struct({
          userId: Schema.String
        }),
        states: {
          auth: {
            schema: Auth,
            initial: "signedOut",
            states: {
              signedOut: SignedOut,
              signedIn: {
                schema: SignedIn,
                type: "final",
                output: Schema.Struct({ userId: Schema.String })
              }
            }
          }
        }
      }
    })
    const machine = Machine.make({
      states: States.states,
      events: [SignIn],
      initial: () =>
        States.initial.up(
          new Up({ id: "up-1" }),
          (up) => up.auth(new Auth({ userId: "user-1" }), (auth) => auth.signedOut(new SignedOut({})))
        )
    })

    expect(machine.handle).type.not.toBeCallableWith({
      up: {
        output: () => ({
          requestId: "request-1"
        }),
        states: {
          auth: {
            states: {
              signedIn: {
                type: "final",
                output: ({ state }: { readonly state: SignedIn }) => ({ userId: state.userId })
              }
            }
          }
        }
      }
    })
  })

  it("initial builder constructs typed initial snapshots", () => {
    const snapshot = UpStates.initial.up(
      new Up({ id: "up-1" }),
      (up) =>
        up
          .auth(
            new Auth({ userId: "guest" }),
            (auth) => auth.signedOut(new SignedOut({}))
          )
          .sync(
            new Sync({ enabled: true }),
            (sync) => sync.idle(new SyncIdle({}))
          )
    )

    expect(snapshot).type.toBeAssignableTo<
      Machine.Machine.SnapshotByIdentifier<typeof UpStates.states, "up">
    >()
    expect(snapshot.path).type.toBe<"up">()
    expect(snapshot.value).type.toBe<Up>()
    expect(snapshot.states.auth.value).type.toBe<Auth>()
    expect(snapshot.states.auth.state.path).type.toBe<"up.auth.signedOut">()
    expect(snapshot.states.sync.value).type.toBe<Sync>()
    expect(snapshot.states.sync.state.path).type.toBe<"up.sync.idle">()
  })

  it("initial builder rejects incomplete parallel callbacks", () => {
    expect(UpStates.initial.up).type.not.toBeCallableWith(
      new Up({ id: "up-1" }),
      (up: ChildBuilder<typeof UpStates.initial.up>) =>
        up.auth(
          new Auth({ userId: "guest" }),
          (auth) => auth.signedOut(new SignedOut({}))
        )
    )
  })

  it("initial builder exposes only the declared compound initial child", () => {
    const up = null as unknown as ChildBuilder<typeof UpStates.initial.up>
    const auth = null as unknown as ChildBuilder<typeof up.auth>

    expect(auth.signedOut).type.toBeCallableWith(new SignedOut({}))
    expect(auth).type.not.toHaveProperty("signedIn")
  })

  it("initial builder checks values at parent and leaf nodes", () => {
    const up = null as unknown as ChildBuilder<typeof UpStates.initial.up>
    const sync = null as unknown as ChildBuilder<typeof up.sync>

    expect(UpStates.initial.down).type.not.toBeCallableWith(new Up({ id: "up-1" }))
    expect(UpStates.initial.up).type.not.toBeCallableWith(
      new Auth({ userId: "guest" }),
      (up: ChildBuilder<typeof UpStates.initial.up>) =>
        up
          .auth(
            new Auth({ userId: "guest" }),
            (auth) => auth.signedOut(new SignedOut({}))
          )
          .sync(
            new Sync({ enabled: true }),
            (sync) => sync.idle(new SyncIdle({}))
          )
    )
    expect(up.auth).type.not.toBeCallableWith(
      new Up({ id: "up-1" }),
      (auth: ChildBuilder<typeof up.auth>) => auth.signedOut(new SignedOut({}))
    )
    expect(sync.idle).type.not.toBeCallableWith(new Syncing({ requestId: "sync-1" }))
  })

  it("initial builder removes parallel region methods after they are called", () => {
    const up = null as unknown as ChildBuilder<typeof UpStates.initial.up>
    const afterAuth = up.auth(
      new Auth({ userId: "guest" }),
      (auth) => auth.signedOut(new SignedOut({}))
    )
    const complete = afterAuth.sync(
      new Sync({ enabled: true }),
      (sync) => sync.idle(new SyncIdle({}))
    )

    expect(afterAuth).type.not.toHaveProperty("auth")
    expect(afterAuth).type.toHaveProperty("sync")
    expect(complete).type.not.toHaveProperty("sync")
    expect(complete).type.not.toHaveProperty("done")
  })

  it("target.full constructs typed full snapshots", () => {
    const context = null as unknown as SignInContext
    const snapshot = context.target.full.up(
      new Up({ id: "up-1" }),
      (up) =>
        up
          .auth(
            new Auth({ userId: "guest" }),
            (auth) => auth.signedIn(new SignedIn({ userId: "user-1" }))
          )
          .sync(
            new Sync({ enabled: true }),
            (sync) => sync.syncing(new Syncing({ requestId: "sync-1" }))
          )
    )

    expect(snapshot).type.toBeAssignableTo<
      Machine.Machine.SnapshotByIdentifier<typeof UpStates.states, "up">
    >()
    expect(snapshot.path).type.toBe<"up">()
    expect(snapshot.states.auth.state.path).type.toBe<"up.auth.signedOut" | "up.auth.signedIn">()
    expect(snapshot.states.sync.state.path).type.toBe<"up.sync.idle" | "up.sync.syncing">()
  })

  it("target.full requires every parallel region", () => {
    const context = null as unknown as SignInContext

    expect(context.target.full.up).type.not.toBeCallableWith(
      new Up({ id: "up-1" }),
      (up: ChildBuilder<typeof context.target.full.up>) =>
        up.auth(
          new Auth({ userId: "guest" }),
          (auth) => auth.signedIn(new SignedIn({ userId: "user-1" }))
        )
    )
  })

  it("target.full exposes every compound child", () => {
    const context = null as unknown as SignInContext
    const up = null as unknown as ChildBuilder<typeof context.target.full.up>
    const auth = null as unknown as ChildBuilder<typeof up.auth>

    expect(auth.signedOut).type.toBeCallableWith(new SignedOut({}))
    expect(auth.signedIn).type.toBeCallableWith(new SignedIn({ userId: "user-1" }))
  })

  it("target.local constructs typed local leaf targets", () => {
    const context = null as unknown as SignedOutContext
    const target = context.target.local.signedIn(new SignedIn({ userId: "user-1" }))

    expect(target).type.toBeAssignableTo<
      Machine.Machine.Target<typeof UpStates.states, "up.auth.signedIn">
    >()
    expect(target.path).type.toBe<"up.auth.signedIn">()
    expect(target.value).type.toBe<SignedIn>()
  })

  it("target.local exposes the source compound children when the source is compound", () => {
    const context = null as unknown as AuthContext

    expect(context.target.local.signedOut).type.toBeCallableWith(new SignedOut({}))
    expect(context.target.local.signedIn).type.toBeCallableWith(new SignedIn({ userId: "user-1" }))
  })

  it("target.local.with checks the local compound value", () => {
    const context = null as unknown as SignedOutContext
    const target = context.target.local.with(
      new Auth({ userId: "user-1" }),
      (auth) => auth.signedIn(new SignedIn({ userId: "user-1" }))
    )

    expect(target.path).type.toBe<"up.auth.signedIn">()
    expect(context.target.local.with).type.not.toBeCallableWith(
      new Up({ id: "up-1" }),
      (auth: ChildBuilder<typeof context.target.local.with>) => auth.signedIn(new SignedIn({ userId: "user-1" }))
    )
  })

  it("target.local rejects unrelated children and wrong values", () => {
    const context = null as unknown as SignedOutContext

    expect(context.target.local).type.not.toHaveProperty("sync")
    expect(context.target.local).type.not.toHaveProperty("down")
    expect(context.target.local).type.not.toHaveProperty("idle")
    expect(context.target.local.signedIn).type.not.toBeCallableWith(new SignedOut({}))
  })

  it("target.local exposes no methods outside a compound scope", () => {
    const context = null as unknown as SignInContext

    expect(context.target.local).type.not.toHaveProperty("up")
    expect(context.target.local).type.not.toHaveProperty("down")
    expect(context.target.local).type.not.toHaveProperty("with")
  })

  it("target.branch exposes only the source root", () => {
    const context = null as unknown as SignedOutContext
    const downContext = null as unknown as SignInContext

    expect(context.target.branch).type.toHaveProperty("up")
    expect(context.target.branch).type.not.toHaveProperty("down")
    expect(downContext.target.branch).type.toHaveProperty("down")
    expect(downContext.target.branch).type.not.toHaveProperty("up")
  })

  it("target.branch constructs typed partial branch targets", () => {
    const context = null as unknown as SignedOutContext
    const target = context.target.branch.up.sync(
      new Sync({ enabled: true }),
      (sync) => sync.syncing(new Syncing({ requestId: "sync-1" }))
    )

    expect(target).type.toBeAssignableTo<
      Machine.Machine.Target<typeof UpStates.states, "up.sync.syncing">
    >()
    expect(target.path).type.toBe<"up.sync.syncing">()
    expect(target.value).type.toBe<Syncing>()
  })

  it("target.branch can replace ancestors before selecting a leaf", () => {
    const context = null as unknown as SignedOutContext
    const target = context.target.branch.up(
      new Up({ id: "up-2" }),
      (up) =>
        up.auth(
          new Auth({ userId: "user-1" }),
          (auth) => auth.signedIn(new SignedIn({ userId: "user-1" }))
        )
    )

    expect(target.path).type.toBe<"up.auth.signedIn">()
    expect(target.value).type.toBe<SignedIn>()
  })

  it("target.branch rejects non-leaf targets and wrong values", () => {
    const context = null as unknown as SignedOutContext

    expect(context.target.branch.up).type.not.toBeCallableWith(new Up({ id: "up-1" }))
    expect(context.target.branch.up.sync).type.not.toBeCallableWith(new Sync({ enabled: true }))
    expect(context.target.branch.up.sync).type.not.toBeCallableWith(
      new Auth({ userId: "user-1" }),
      (sync: ChildBuilder<typeof context.target.branch.up.sync>) => sync.syncing(new Syncing({ requestId: "sync-1" }))
    )
    expect(context.target.branch.up.auth.signedIn).type.not.toBeCallableWith(new SignedOut({}))
  })

  it("target is not callable", () => {
    const context = null as unknown as SignInContext

    expect<IsCallable<typeof context.target>>().type.toBe<false>()
  })

  it("rejects invalid compound initial keys", () => {
    expect(Machine.defineStates).type.not.toBeCallableWith({
      up: {
        schema: Up,
        initial: "missing",
        states: {
          signedOut: SignedOut
        }
      }
    })
  })

  it("rejects initial keys on parallel states", () => {
    expect(Machine.defineStates).type.not.toBeCallableWith({
      up: {
        schema: Up,
        type: "parallel",
        initial: "auth",
        states: {
          auth: Auth
        }
      }
    })
  })

  it("rejects invalid nested state definitions", () => {
    expect(Machine.defineStates).type.not.toBeCallableWith({
      up: {
        schema: Up,
        type: "parallel",
        states: {
          auth: {
            schema: Auth,
            initial: "missing",
            states: {
              signedOut: SignedOut
            }
          }
        }
      }
    })
  })

  it("rejects child states on final states", () => {
    expect(Machine.defineStates).type.not.toBeCallableWith({
      down: {
        schema: Down,
        type: "final",
        states: {
          child: SignedOut
        }
      }
    })
  })
})
