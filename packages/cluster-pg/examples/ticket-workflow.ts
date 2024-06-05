import * as DurableExecutionJournalPostgres from "@effect/cluster-pg/DurableExecutionJournalPostgres"
import * as Activity from "@effect/cluster-workflow/Activity"
import * as Workflow from "@effect/cluster-workflow/Workflow"
import * as WorkflowEngine from "@effect/cluster-workflow/WorkflowEngine"
import * as Message from "@effect/cluster/Message"
import { runMain } from "@effect/platform-node/NodeRuntime"
import * as Schema from "@effect/schema/Schema"
import * as Pg from "@effect/sql-pg"
import { Duration } from "effect"
import * as Array from "effect/Array"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"

const reserveSeats = (numberOfSeats: number) =>
  Activity.make(
    "reserve-seats",
    Schema.Array(Schema.String),
    Schema.Never
  )(pipe(
    Effect.sync(() => Array.makeBy(numberOfSeats, (id) => "seat-" + id)),
    Effect.tap((seats) => Effect.logInfo("Reserving seats " + seats.join(", ") + "..."))
  ))

const releaseSeats = (seats: ReadonlyArray<string>) =>
  Activity.make(
    "release-seats",
    Schema.Void,
    Schema.Never
  )(pipe(
    Effect.logInfo("Releasing seats " + seats.join(", ") + "...")
  ))

const getAmountDue = (orderId: string) =>
  Activity.make("get-amount-due-" + orderId, Schema.Number, Schema.Never)(pipe(
    Effect.sync(() => Math.round(Math.random() * 100) / 100)
  ))

const processPayment = (billingId: string, amountDue: number) =>
  Activity.make("process-payment-" + billingId, Schema.Void, Schema.Never)(pipe(
    pipe(
      Effect.logDebug("Processed payment of " + amountDue + " to " + billingId + "..."),
      Effect.zipRight(Effect.never)
    )
  ))

const cancelOrder = (orderId: string) =>
  Activity.make("cancel-order-" + orderId, Schema.Void, Schema.Never)(pipe(
    Effect.logDebug("Canceling order " + orderId + "...")
  ))

const sendTickets = (email: string, ticketIds: ReadonlyArray<string>) =>
  Activity.make("send-tickets", Schema.Void, Schema.Never)(pipe(
    Effect.logDebug("Sending tickets " + ticketIds.join(", ") + " to " + email + "...")
  ))

class BookSeatRequest extends Message.TaggedMessage<BookSeatRequest>()(
  "BeginPaymentWorkflowRequest",
  Schema.Never,
  Schema.Void,
  {
    orderId: Schema.String,
    cardNumber: Schema.String,
    numberOfSeats: Schema.Number,
    email: Schema.String
  },
  (_) => _.orderId
) {
}

const bookSeatWorkflow = Workflow.make(
  BookSeatRequest,
  ({ cardNumber, email, numberOfSeats, orderId }) =>
    pipe(
      Effect.acquireUseRelease(
        // reserve the seat and get the ids
        reserveSeats(numberOfSeats),
        () =>
          pipe(
            // gets the amount due to pay and process the payment
            getAmountDue(orderId),
            Effect.flatMap((amount) => processPayment(cardNumber, amount))
          ),
        (seatsId, exit) =>
          Exit.match(exit, {
            // on success send tickets to the user
            onSuccess: () => sendTickets(email, seatsId),
            // on failure, release the seats so they can be booked again
            onFailure: () => releaseSeats(seatsId)
          })
      ),
      // users have 5 minutes to complete their purchase
      Workflow.timeout("booking-timeout", Duration.minutes(5)),
      Effect.catchTag("TimeoutException", () => cancelOrder(orderId))
    )
)

const main = pipe(
  WorkflowEngine.makeScoped(bookSeatWorkflow),
  Effect.flatMap((engine) =>
    engine.send(
      new BookSeatRequest({ orderId: "order-1", cardNumber: "my-card", numberOfSeats: 2, email: "my@email.com" })
    )
  ),
  Effect.provide(DurableExecutionJournalPostgres.makeDurableExecutionJournalPostgres("event_journal")),
  Effect.provide(Pg.client.layer({
    host: Config.succeed("127.0.0.1"),
    username: Config.succeed("postgres"),
    database: Config.succeed("cluster")
  })),
  Logger.withMinimumLogLevel(LogLevel.All),
  Effect.scoped
)

runMain(main)
