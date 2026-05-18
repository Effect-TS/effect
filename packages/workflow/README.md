# @effect/workflow

Build and run durable workflows in TypeScript with Effect.

## Example

```typescript
import { ClusterWorkflowEngine } from "@effect/cluster"
import { NodeClusterSocket, NodeRuntime } from "@effect/platform-node"
import { PgClient } from "@effect/sql-pg"
import {
  Activity,
  DurableClock,
  DurableDeferred,
  Workflow
} from "@effect/workflow"
import { Effect, Layer, Redacted, Schema } from "effect"

// Define a custom error for the SendEmail activity
class SendEmailError extends Schema.TaggedError<SendEmailError>(
  "SendEmailError"
)("SendEmailError", {
  message: Schema.String
}) {}

// Define a workflow using the `Workflow.make` api.
const EmailWorkflow = Workflow.make({
  // Every workflow needs a unique name
  name: "EmailWorkflow",
  // Add a success schema. You can omit this to use the default value `Schema.Void`
  success: Schema.Void,
  // Add an error schema. You can omit this to use the default value `Schema.Never`
  error: SendEmailError,
  // Define the payload for the workflow
  payload: {
    id: Schema.String,
    to: Schema.String
  },
  // Define the idempotency key for the workflow. This is used to ensure that
  // the workflow is not duplicated if it is retried.
  idempotencyKey: ({ id }) => id
})

// Once you have defined the workflow, you can create a layer for by providing
// the implementation.
const EmailWorkflowLayer = EmailWorkflow.toLayer(
  Effect.fn(function* (payload, executionId) {
    // An `Activity` represents an unit of work in the workflow.
    // They will only ever be executed once, unless you use `Activity.retry`.
    yield* Activity.make({
      name: "SendEmail",
      error: SendEmailError,
      execute: Effect.gen(function* () {
        // You can access the current attempt number of the activity.
        const attempt = yield* Activity.CurrentAttempt

        yield* Effect.annotateLogs(Effect.log(`Sending email`), {
          id: payload.id,
          executionId,
          attempt
        })

        if (attempt !== 5) {
          return yield* new SendEmailError({
            message: `Failed to send email for ${payload.id} on attempt ${attempt}`
          })
        }
      })
    }).pipe(
      Activity.retry({ times: 5 }),
      EmailWorkflow.withCompensation(
        Effect.fn(function* (value, cause) {
          // This is a compensation finalizer that will be executed if the workflow
          // fails.
          //
          // You can use the success `value` of the wrapped effect, as well as the
          // Cause of the workflow failure.
          yield* Effect.log(`Compensating activity SendEmail`)
        })
      )
    )

    // Use the `DurableClock` to sleep for a specified duration.
    // The workflow will pause execution for the specified duration.
    //
    // You can sleep for as long as you want - when the workflow pauses it
    // consumes no resources.
    yield* Effect.log("Sleeping for 10 seconds")
    yield* DurableClock.sleep({
      name: "Some sleep",
      duration: "10 seconds"
    })
    yield* Effect.log("Woke up")

    // You can use `DurableDeferred` to create a signal that can be awaited later.
    const EmailTrigger = DurableDeferred.make("EmailTrigger")

    // You can use the `DurableDeferred.token` api to acquire the token that can
    // later be used with `DurableDeferred.done / succeed / fail`
    const token = yield* DurableDeferred.token(EmailTrigger)

    // You then use the token to send a result to the deferred.
    //
    // This doesn't need to be done inside the workflow, it just needs access to
    // the `WorkflowEngine` service.
    yield* DurableDeferred.succeed(EmailTrigger, {
      token,
      value: void 0
    }).pipe(
      Effect.delay("1 second"), // Simulate some delay before completing the deferred
      Effect.forkDaemon
    )

    // Finally, you can await the deferred to get the result.
    //
    // It will pause the workflow until the deferred is completed.
    yield* DurableDeferred.await(EmailTrigger)
  })
)

// To integrate with @effect/cluster, you can use the
// `ClusterWorkflowEngine.layer` Layer, and provide it with your cluster Runner
// layer.
const WorkflowEngineLayer = ClusterWorkflowEngine.layer.pipe(
  Layer.provideMerge(NodeClusterSocket.layer()),
  Layer.provideMerge(
    PgClient.layer({
      database: "effect_cluster",
      username: "cluster",
      password: Redacted.make("cluster")
    })
  )
)

const EnvLayer = Layer.mergeAll(
  EmailWorkflowLayer
  // You can add any other cluster entities or workflow layers here
).pipe(Layer.provideMerge(WorkflowEngineLayer))

// Finally, you can execute a workflow using the `.execute` method.
EmailWorkflow.execute({ id: "123", to: "hello@timsmart.co" }).pipe(
  Effect.provide(EnvLayer),
  NodeRuntime.runMain
)
```
