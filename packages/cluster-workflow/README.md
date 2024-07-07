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

Behind the scenes, a persistent log tracks all activities, which is why it's necessary to define schemas for both successful outcomes and potential errors associated with an Activity. You'll also need to provide the actual code, or "body", of the Activity, which can perform any operation you require.

**Key Aspects of an Activity**:

- **Functionality**: Work unit of a Workflow.
- **Identification**: Uniquely identified inside Workflow.
- **Schema Requirements**: Requires schemas for success and failure.
- **Interaction**: Capable of engaging with external systems through the execution of effects.
- **Idempotency**: Ensures that multiple executions of the same activity result in a single state change, maintaining state consistency and reliability.

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

## Idempotency in Workflow Activities

When a workflow engine initiates an Activity, which serves as the foundational unit of a workflow, it lacks visibility into the internal operations of that Activity. To illustrate the importance of idempotency, consider a scenario involving an HTTP payment API. Suppose the API triggers a payment request, the server processes it successfully, but the network fails right before the response is sent back. From the workflow's perspective, the request appears as if it never occurred.

This lack of confirmation may lead the workflow to retry the activity, potentially resulting in the same payment being processed multiple times.

### Understanding Idempotency

Idempotency ensures that performing the same operation multiple times results in a single change the first time, with no additional changes in subsequent attempts. For instance, consider an orders table with an auto-incrementing primary key where you perform an insert query. Repeating this insert is not idempotent as it creates multiple records. Conversely, deleting an entry by primary key is idempotent after its first execution since repeated deletions will not change the database further.

### Effect Cluster Workflow and Idempotency Keys

The Effect Cluster Workflow aids in maintaining idempotency through the use of idempotency keys. These keys are included in requests to help the server recognize and handle repeated requests by returning the original outcome without performing the action again. Effect Cluster supports this mechanism with a persistent ID that serves as an idempotency key, ensuring activities are executed once, even if they are called multiple times.

This functionality is crucial when activities may need to be retried due to errors or other issues. The deterministic nature of workflows with idempotent activities allows them to handle inconsistencies like network failures or timeouts without data corruption.

### Handling Infinite Retries and Errors

Should an activity face an issue leading to potential infinite retries, the idempotent nature of the activity allows developers to halt the workflow engine, correct the problem (for instance, a misconfigured API key), and restart. The workflow engine will then proceed using the revised activity definition, ensuring the workflow completes as intended.

Idempotency in workflows ensures that operations are robust, reliable, and maintain integrity, even under conditions of failure or repeated execution attempts. This stability is indispensable for maintaining consistent data states and reliable operation across distributed systems.

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

Our workflow operates as a coordinator of multiple Activities. To ensure the workflow executes reliably, it must adhere to certain constraints. All steps within the workflow should be encapsulated within an Activity, and the workflow itself must be deterministic.

### Determinism in Workflows:

Determinism within workflows ensures that regardless of the system's state, the output remains predictable and consistent. Any activities that incorporate non-deterministic elements such as time checks, file system reads, or database queries are influenced by the state of external systems. To maintain the integrity of the workflow, these elements must be encapsulated within a specifically defined `Activity`. This approach ensures that each part of the workflow can be controlled and predictable, contributing to the overall reliability of the system.

### Persistence in Workflows:

Workflows need reliable data persistence, especially for scenarios like a server restart where activities might need to resume based on the last known state. This is achieved through a durable log that records the successful results of activities, allowing them to be replayed or resumed as necessary. In Effect Cluster, the persistence layer is adaptable; for instance, you can use PostgreSQL for server-based applications or SQLite for local-first applications, and other suitable storage solutions for browser-based applications.

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

// Define the workflow that coordinates the activities
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

To run the workflow, start by initializing the workflow engine, which tracks and manages workflow instances. To initiate a workflow, use methods like `send` to await results, or `sendDiscard` if the outcome is not immediately needed. The choice of method depends on whether the result of the workflow needs to be tracked or not.

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
