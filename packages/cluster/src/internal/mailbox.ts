import type * as Serializable from "@effect/schema/Serializable"
import type * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Queue from "effect/Queue"
import type { EntityAddress } from "../EntityAddress.js"
import type { Envelope } from "../Envelope.js"
import type { Mailbox } from "../Mailbox.js"
import type { MailboxStorage } from "../MailboxStorage.js"
import * as InternalMailboxStorage from "./mailboxStorage.js"
import * as InternalMessageState from "./messageState.js"

/** @internal */
export const make = <Msg extends Envelope.AnyMessage>(
  address: EntityAddress
): Effect.Effect<Mailbox<Msg>, never, MailboxStorage> =>
  Effect.gen(function*() {
    const storage = yield* InternalMailboxStorage.Tag
    const queue = yield* Queue.unbounded<Mailbox.Entry<Msg>>()

    function acknowledge(message: Msg): Effect.Effect<void> {
      return storage.updateMessage(address, message, InternalMessageState.acknowledged)
    }

    function complete(
      message: Msg,
      result: Exit.Exit<
        Serializable.WithResult.Success<Msg>,
        Serializable.WithResult.Failure<Msg>
      >
    ): Effect.Effect<void> {
      const state = InternalMessageState.processed(result)
      return storage.updateMessage(address, message, state)
    }

    function completeEffect<R>(
      message: Msg,
      effect: Effect.Effect<
        Serializable.WithResult.Success<Msg>,
        Serializable.WithResult.Failure<Msg>,
        R
      >
    ): Effect.Effect<void, never, R> {
      return Effect.matchEffect(effect, {
        onFailure: (error) => complete(message, Exit.fail(error)),
        onSuccess: (value) => complete(message, Exit.succeed(value))
      })
    }

    function succeed(
      message: Msg,
      value: Serializable.WithResult.Success<Msg>
    ): Effect.Effect<void> {
      return complete(message, Exit.succeed(value))
    }

    function fail(
      message: Msg,
      error: Serializable.WithResult.Failure<Msg>
    ): Effect.Effect<void> {
      return complete(message, Exit.fail(error))
    }

    function failCause(
      message: Msg,
      cause: Cause.Cause<Serializable.WithResult.Failure<Msg>>
    ): Effect.Effect<void> {
      return complete(message, Exit.failCause(cause))
    }

    return Object.assign(queue, {
      acknowledge,
      complete,
      completeEffect,
      succeed,
      fail,
      failCause
    })
  })
