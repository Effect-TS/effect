import { Context, Duration, Effect, type Layer, Schema } from "effect"
import { ChatError, ChatInteraction, type ChatUi } from "effect/chat"
import { describe, expect, it } from "tstyche"

const EnvId = Schema.String.pipe(Schema.brand("EnvId"))
type EnvId = typeof EnvId.Type

class DeployQueue extends Context.Service<DeployQueue, {
  readonly offer: (item: unknown) => Effect.Effect<void>
}>()("DeployQueue") {}

const Deploy = Schema.Struct({ version: Schema.String })

const Approve = ChatInteraction.button("approve", { label: "Approve", value: Deploy })
const Refresh = ChatInteraction.button("refresh", { label: "Refresh" })
const PickEnv = ChatInteraction.select("pick-env", { value: EnvId })
const RejectReason = ChatInteraction.modal("reject-reason", {
  title: "Reject deploy",
  metadata: Deploy,
  fields: {
    intro: ChatInteraction.text("Tell the author why."),
    reason: ChatInteraction.textInput({ label: "Reason", multiline: true }),
    note: ChatInteraction.textInput({ label: "Note", optional: true }),
    severity: ChatInteraction.choice({
      label: "Severity",
      options: [{ label: "Low", value: "low" }, { label: "High", value: "high" }]
    }),
    env: ChatInteraction.selectInput({ label: "Environment", value: EnvId })
  }
})
const Feedback = ChatInteraction.modal("feedback", {
  title: "Feedback",
  fields: { body: ChatInteraction.textInput({ label: "Feedback" }) }
})

describe("ChatInteraction", () => {
  it("of takes the value its schema asks for", () => {
    expect(Approve.of({ version: "v1" })).type.toBe<ChatUi.Button>()
    expect(Approve.of).type.not.toBeCallableWith()
    expect(Approve.of).type.not.toBeCallableWith({ version: 1 })
    expect(Refresh.of).type.not.toBeCallableWith({ version: "v1" })
    expect(PickEnv.of).type.not.toBeCallableWith({ options: [{ label: "Prod", value: "prod" }] })
  })

  it("open needs the metadata and the selectInput options", () => {
    expect(RejectReason.open).type.not.toBeCallableWith()
    expect(RejectReason.open).type.not.toBeCallableWith({ metadata: { version: "v1" } })
    expect(Feedback.open()).type.toBe<ChatInteraction.OpenModal>()
  })

  it("types each handler from its definition", () => {
    const Group = ChatInteraction.group(Approve, Refresh, PickEnv, RejectReason, Feedback)
    const layer = Group.toLayer(Effect.gen(function*() {
      const queue = yield* DeployQueue
      return {
        approve: (click) => {
          expect(click.value).type.toBe<{ readonly version: string }>()
          return queue.offer(click.value).pipe(Effect.as(ChatInteraction.ack))
        },
        refresh: (click) => {
          expect(click.value).type.toBe<undefined>()
          return Effect.succeed(Feedback.open())
        },
        "pick-env": (selected) => {
          expect(selected.value).type.toBe<EnvId>()
          return Effect.succeed(ChatInteraction.ack)
        },
        "reject-reason": (submit) => {
          expect(submit.values).type.toBe<{
            readonly reason: string
            readonly note: string | undefined
            readonly severity: "low" | "high"
            readonly env: EnvId
          }>()
          expect(submit.metadata).type.toBe<{ readonly version: string }>()
          return Effect.succeed(ChatInteraction.errors({ reason: "Say a bit more." }))
        },
        feedback: (submit) => {
          expect(submit.metadata).type.toBe<undefined>()
          return Effect.succeed(ChatInteraction.close)
        }
      }
    }))
    expect(layer).type.toBe<Layer.Layer<never, never, DeployQueue | ChatInteraction.Registry>>()
  })

  it("refuses a missing handler, a wrong reply and an error for an unknown field", () => {
    const Small = ChatInteraction.group(Approve, RejectReason)
    expect(Small.toLayer).type.not.toBeCallableWith({ approve: () => Effect.succeed(ChatInteraction.ack) })
    expect(Small.toLayer).type.not.toBeCallableWith({
      approve: () => Effect.succeed(ChatInteraction.close),
      "reject-reason": () => Effect.succeed(ChatInteraction.close)
    })
    expect(Small.toLayer).type.not.toBeCallableWith({
      approve: () => Effect.succeed(ChatInteraction.ack),
      "reject-reason": () => Effect.succeed(Feedback.open())
    })
    expect(Small.toLayer).type.not.toBeCallableWith({
      approve: () => Effect.succeed(ChatInteraction.ack),
      "reject-reason": () => Effect.succeed(ChatInteraction.errors({ intro: "A text has no error." }))
    })
  })

  it("types a command's handler, which must answer with a message, a modal or a deferral", () => {
    const Ship = ChatInteraction.command("ship", {
      description: "Ship a version",
      argument: { name: "version", description: "The version", required: true }
    })
    const Summarize = ChatInteraction.command("summarize", { description: "Summarize this thread" })
    const Group = ChatInteraction.group(Ship, Summarize, Approve, Feedback)
    const valid = {
      ship: (command: ChatInteraction.CommandInvoked) => {
        expect(command.text).type.toBe<string>()
        return Effect.succeed(ChatInteraction.respond({ markdown: "Ship " + command.text + "?" }))
      },
      summarize: (command: ChatInteraction.CommandInvoked) => Effect.succeed(ChatInteraction.defer(command)),
      approve: () => Effect.succeed(Feedback.open()),
      feedback: (submit: ChatInteraction.Submit<undefined, { readonly body: string }>) => {
        expect(submit.messageId).type.toBe<string | undefined>()
        return Effect.succeed(ChatInteraction.close)
      }
    }
    expect(Group.toLayer(valid)).type.toBe<Layer.Layer<never, never, ChatInteraction.Registry>>()
    expect(Group.toLayer).type.not.toBeCallableWith({ ...valid, ship: () => Effect.succeed(ChatInteraction.ack) })
    expect(Group.toLayer).type.not.toBeCallableWith({ ...valid, ship: () => Effect.fail("boom") })
    expect(Group.toLayer).type.not.toBeCallableWith({
      ...valid,
      approve: () => Effect.succeed(ChatInteraction.respond({ markdown: "A click cannot answer with a message." }))
    })
    expect(Group.toLayer).type.not.toBeCallableWith({
      ...valid,
      feedback: () => Effect.succeed(ChatInteraction.respond({ markdown: "Nor can a submit." }))
    })
    const { summarize: _, ...missing } = valid
    expect(Group.toLayer).type.not.toBeCallableWith(missing)
    expect(ChatInteraction.Handler.of).type.not.toBeCallableWith({
      click: () => Effect.succeed(ChatInteraction.ack),
      submit: () => Effect.succeed(ChatInteraction.close),
      refused: () => Effect.void
    })
  })

  it("handle gives the reply of the event's kind, or Late", () => {
    const click = ChatInteraction.handle(
      {} as ChatInteraction.ButtonClicked,
      Duration.seconds(2)
    )
    expect(click).type.toBe<
      Effect.Effect<ChatInteraction.ClickReply | ChatInteraction.Late, never, ChatInteraction.Handler>
    >()
    const submit = ChatInteraction.handle({} as ChatInteraction.ModalSubmitted, Duration.seconds(2))
    expect(submit).type.toBe<
      Effect.Effect<ChatInteraction.SubmitReply | ChatInteraction.Late, never, ChatInteraction.Handler>
    >()
    const command = ChatInteraction.handle({} as ChatInteraction.CommandInvoked, Duration.seconds(2))
    expect(command).type.toBe<
      Effect.Effect<ChatInteraction.CommandReply | ChatInteraction.Late, never, ChatInteraction.Handler>
    >()
  })

  it("keeps the error details literal", () => {
    expect(ChatError.interactionExpired).type.toBe<"interaction_expired">()
  })
})
