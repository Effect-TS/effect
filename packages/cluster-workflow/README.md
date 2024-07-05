# Background: The Need for Durable Workflows

In modern software development, handling operations across distributed systems reliably is a critical challenge. Durable workflows ensure that if a process is interrupted (due to server failures, network issues, etc.), it can resume without losing track of its state or duplicating effects.

- **`cluster-workflow`** is designed to define and manage long-running and persistent workflows.
- **`cluster`** incorporates sharding to ensure that workflows are executed once in a scalable manner, providing orchestration to guarantee that only one instance runs at any given time.

# Overview of Effect Cluster

Effect Cluster is a framework that facilitates the management of distributed workflows. It leverages the concept of "sagas" to handle long-running processes that involve multiple steps and interactions with external systems.

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

export const getTotalAmountActivity = (id: string) =>
  Activity.make(
    // Identifier for the Activity
    `get-amount-due-${id}`,

    // Schema for successful execution
    Schema.Number,

    // Schema for handling failures
    Schema.Struct({
      message: Schema.String
    })
  )(
    // Execution logic
    Effect.tryPromise({
      try: () => fetch(`/get-total-amount/${id}`).then((res) => res.json()),
      catch: () => ({ message: "Fetch error" })
    })
  )
```

With the concept of an Activity clearly defined, we can now proceed to construct a complete workflow.

## Defining a Request

Before you can begin crafting a workflow, it is necessary to define a request that initiates the execution of the workflow. This request not only triggers the workflow but also specifies the expected outcomes through success and failure schemas. Additionally, a request can carry a payload containing data that will be utilized within the workflow. This payload essentially acts as the argument set for your workflow function.

**Key Aspects of a Request**:

- **Initiation**: A workflow is activated by issuing a `Request`.
- **Schema Requirements**: Includes schemas for managing both successful and failed outcomes.
- **Payload**: Carries essential data that supports the workflow execution.

**Example: Defining a Request for a Payment Process**

```ts
import { Schema } from "@effect/schema"

class ProcessPaymentRequest extends Schema.TaggedRequest<ProcessPaymentRequest>()(
  // Unique tag identifying the request
  `ProcessPaymentRequest`,

  // Schema for failure
  Schema.String,

  // Schema for success
  Schema.Boolean,

  // Schema for payload
  {
    orderId: Schema.String,
    cardNumber: Schema.String,
    email: Schema.String,
    deliveryAddress: Schema.String
  }
) {}
```

## Defining a workflow
