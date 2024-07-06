# Overview

In modern software development, handling operations across distributed systems reliably is a critical challenge. Durable workflows ensure that if a process is interrupted (due to server failures, network issues, etc.), it can resume without losing track of its state or duplicating effects.

## @effect/cluster

`@effect/cluster` provides sharding and location transparency, enabling the definition of an actor model with types of entities and a messaging contract for each entity. You can then define the behavior for each type of activity. What `@effect/cluster` does is handle the spawning of instances of known entity types, manages their messaging, and potentially returns results.

The aspect of location transparency allows multiple processes to manage entities and send messages to entities without knowing which process hosts them. Additionally, the system distributes how entities are spread across various processes in the cluster to evenly distribute the workload.

This architecture facilitates a robust actor model where the cluster handles the distribution of entities. Developers can interact with these entities using their IDs without needing to know their hosting locations, while the system manages the backend processes, including the rebalancing of loads if a process fails or new processes are initiated.

The sharding component ensures that an entity is always executed on no more than one machine at a time.

For more detailed information, you can visit the [README](https://github.com/Effect-TS/effect/tree/main/packages/cluster).

## @effect/cluster-workflow

`@effect/cluster-workflow` is designed to define and manage long-running and persistent workflows. It focuses on implementing durable execution through the use of sagas and a persistent event journal. Should a workflow need to be resumed, its execution state is reconstructed using an event-sourced approach from the journal data.

How do `@effect/cluster` and `@effect/cluster-workflow` are connected? When there are multiple workflows involving various systems or processes, it becomes challenging to manage them with a single process. The clustering component ensures that each workflow is executed consistently and exclusively once.

It is possible to use `@effect/cluster-workflow` independently of `@effect/cluster`. This approach works well for workflows that are developed to execute simultaneously across multiple machines while producing consistent results, or in environments where no additional machines are involved, such as applications running in a browser.

## What is a "Saga"?

One concept integral to the design of Durable Workflows in the Effect Cluster is the saga. This idea originates from an old academic paper where researchers addressed a computational challenge somewhat different yet related to what we face today. Historically, certain computations would monopolize database transactions for extended periods. This would prevent smaller transactions from executing, as the database was locked by the lengthy process.

The solution devised was quite straightforward. Instead of allowing one large transaction to dominate, the process was divided into several smaller transactions. These transactions were coordinated using messaging or signaling methods. This approach ensured the entire operation could either complete successfully or not proceed at all, similar to traditional transactions but without locking the database for an extended time.

Applying this to our context, even without traditional database transactions, we treat interactions with external systems—such as API calls or email sending—as individual transactions within a saga.

The challenge then becomes managing continuity especially if a system failure occurs or a restart is needed. To address this, we implement a durable log within the Effect Cluster Workflow. This log tracks every step and attempt within the workflow, preserving the state across disruptions and enabling the workflow to resume seamlessly from where it left off after a restart.

Let's explore how we can effectively implement this using the Effect Cluster Workflow tools.

## Defining an Activity

An Activity is a core component within a workflow. It serves a versatile role, enabling you to interact with databases, make HTTP requests, or write to the file system, among other actions. Each Activity must be distinctly identified by a unique string within the workflow's execution process.

Behind the scenes, a persistent log tracks all activities, which is why it's necessary to define schemas for both successful outcomes and potential errors associated with an Activity. You'll also need to provide the actual code, or "body," of the Activity, which can perform any operation you require.

**Key Aspects of an Activity**:

- **Functionality**: Work unit of a Workflow.
- **Identification**: Uniquely identified inside Workflow.
- **Schema Requirements**: Requires schemas for success and failure.
- **Interaction**: Capable of engaging with external systems through the execution of effects.

**Example of Defining an Activity**

```ts
import { Activity } from "@effect/cluster-workflow"
import { Schema } from "@effect/schema"
import { Effect } from "effect"

const getTotalAmountActivity = (orderId: string) =>
  Activity.make(
    // Identifier for the Activity
    `get-amount-due-${orderId}`,
    // Schema for successful execution
    Schema.Number,
    // Schema for handling failures
    Schema.String
  )(
    // Execution logic
    Effect.gen(function* () {
      yield* Effect.log(`getTotalAmountActivity(${orderId})`)
      return 100
    })
  )
```

With the concept of an Activity clearly defined, we can now proceed to construct a complete workflow.

## Defining a Message

Before you can begin crafting a workflow, it is necessary to define a message that initiates the execution of the workflow. This message not only triggers the workflow but also specifies the expected outcomes through success and failure schemas. Additionally, a message can carry a payload containing data that will be utilized within the workflow. This payload essentially acts as the argument set for your workflow function.

**Key Aspects of a Message**:

- **Initiation**: A workflow is activated by issuing a `Message`.
- **Schema Requirements**: Includes schemas for managing both successful and failed outcomes.
- **Payload**: Carries essential data that supports the workflow execution.

**Example: Defining a Message for a Payment Process**

```ts
import { Message } from "@effect/cluster"
import { Schema } from "@effect/schema"

class ProcessPaymentMessage extends Message.TaggedMessage<ProcessPaymentMessage>()(
  `ProcessPaymentMessage`,
  // Schema for failure
  Schema.String,
  // Schema for success
  Schema.Number,
  // Schema for payload
  {
    orderId: Schema.String,
    cardNumber: Schema.String,
    email: Schema.String,
    deliveryAddress: Schema.String
  },
  // Unique id identifying the request
  (_) => _.orderId
) {}
```

## Defining a workflow

- Coordinator of activities
- Durable execution
- Requires deterministic code

```ts
import { Message } from "@effect/cluster"
import { Activity, Workflow } from "@effect/cluster-workflow"
import { Schema } from "@effect/schema"
import { Effect } from "effect"

// ---------------------------------------------
// message
// ---------------------------------------------

class ProcessPaymentMessage extends Message.TaggedMessage<ProcessPaymentMessage>()(
  `ProcessPaymentMessage`,
  Schema.String,
  Schema.Number,
  {
    orderId: Schema.String,
    cardNumber: Schema.String,
    email: Schema.String,
    deliveryAddress: Schema.String
  },
  (_) => _.orderId
) {}

// ---------------------------------------------
// activities
// ---------------------------------------------

const getTotalAmountActivity = (orderId: string) =>
  Activity.make(
    `get-amount-due-${orderId}`,
    Schema.Number,
    Schema.String
  )(
    Effect.gen(function* () {
      yield* Effect.log(`getTotalAmountActivity(${orderId})`)
      return 100
    })
  )

const chargeCreditCardActivity = (cardNumber: string, totalAmount: number) =>
  Activity.make(
    `charge-credit-card-${cardNumber}`,
    Schema.Void,
    Schema.String
  )(
    Effect.gen(function* () {
      yield* Effect.log(
        `chargeCreditCardActivity(${cardNumber}, ${totalAmount})`
      )
    })
  )

const createShippingTrackingCodeActivity = (deliveryAddress: string) =>
  Activity.make(
    `create-shipping-tracking-code-${deliveryAddress}`,
    Schema.Number,
    Schema.String
  )(
    Effect.gen(function* () {
      yield* Effect.log(
        `createShippingTrackingCodeActivity(${deliveryAddress})`
      )
      return 1
    })
  )

// ---------------------------------------------
// workflow
// ---------------------------------------------

const processPaymentWorkflow = Workflow.make(ProcessPaymentMessage, (message) =>
  Effect.gen(function* () {
    const totalAmount = yield* getTotalAmountActivity(message.orderId)
    yield* chargeCreditCardActivity(message.cardNumber, totalAmount)
    const trackingCode = yield* createShippingTrackingCodeActivity(
      message.deliveryAddress
    )
    return trackingCode
  })
)
```

## Running a Workflow

```ts
import { Message } from "@effect/cluster"
import {
  Activity,
  DurableExecutionJournalInMemory,
  Workflow,
  WorkflowEngine
} from "@effect/cluster-workflow"
import { Schema } from "@effect/schema"
import { Effect } from "effect"

// ---------------------------------------------
// message
// ---------------------------------------------

class ProcessPaymentMessage extends Message.TaggedMessage<ProcessPaymentMessage>()(
  `ProcessPaymentMessage`,
  Schema.String,
  Schema.Number,
  {
    orderId: Schema.String,
    cardNumber: Schema.String,
    email: Schema.String,
    deliveryAddress: Schema.String
  },
  (_) => _.orderId
) {}

// ---------------------------------------------
// activities
// ---------------------------------------------

const getTotalAmountActivity = (orderId: string) =>
  Activity.make(
    `get-amount-due-${orderId}`,
    Schema.Number,
    Schema.String
  )(
    Effect.gen(function* () {
      yield* Effect.log(`getTotalAmountActivity(${orderId})`)
      return 100
    })
  )

const chargeCreditCardActivity = (cardNumber: string, totalAmount: number) =>
  Activity.make(
    `charge-credit-card-${cardNumber}`,
    Schema.Void,
    Schema.String
  )(
    Effect.gen(function* () {
      yield* Effect.log(
        `chargeCreditCardActivity(${cardNumber}, ${totalAmount})`
      )
    })
  )

const createShippingTrackingCodeActivity = (deliveryAddress: string) =>
  Activity.make(
    `create-shipping-tracking-code-${deliveryAddress}`,
    Schema.Number,
    Schema.String
  )(
    Effect.gen(function* () {
      yield* Effect.log(
        `createShippingTrackingCodeActivity(${deliveryAddress})`
      )
      return 1
    })
  )

// ---------------------------------------------
// workflow
// ---------------------------------------------

const processPaymentWorkflow = Workflow.make(ProcessPaymentMessage, (message) =>
  Effect.gen(function* () {
    const totalAmount = yield* getTotalAmountActivity(message.orderId)
    yield* chargeCreditCardActivity(message.cardNumber, totalAmount)
    const trackingCode = yield* createShippingTrackingCodeActivity(
      message.deliveryAddress
    )
    return trackingCode
  })
)

// ---------------------------------------------
// running
// ---------------------------------------------

const program = Effect.gen(function* () {
  const engine = yield* WorkflowEngine.makeScoped(processPaymentWorkflow)
  const trackingCode = yield* engine.send(
    new ProcessPaymentMessage({
      orderId: "order-1",
      cardNumber: "my-card",
      deliveryAddress: "My address",
      email: "my@email.com"
    })
  )
  return trackingCode
})

Effect.runPromise(
  program.pipe(
    Effect.provide(DurableExecutionJournalInMemory.activityJournalInMemory),
    Effect.scoped
  )
)
```
