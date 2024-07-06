# Overview

## @effect/cluster

`@effect/cluster` provides sharding and location transparency, enabling the definition of an actor model with types of entities and a messaging contract for each entity. You can then define the behavior for each type of activity. What `@effect/cluster` does is handle the spawning of instances of known entity types, manages their messaging, and potentially returns results.

The aspect of location transparency allows multiple processes to manage entities and send messages to entities without knowing which process hosts them. Additionally, the system distributes how entities are spread across various processes in the cluster to evenly distribute the workload.

This architecture facilitates a robust actor model where the cluster handles the distribution of entities. Developers can interact with these entities using their IDs without needing to know their hosting locations, while the system manages the backend processes, including the rebalancing of loads if a process fails or new processes are initiated.

The sharding component ensures that an entity is always executed on no more than one machine at a time.

## @effect/cluster-workflow

`@effect/cluster-workflow` is designed to define and manage long-running and persistent workflows. It focuses on implementing durable execution through the use of sagas and a persistent event journal. Should a workflow need to be resumed, its execution state is reconstructed using an event-sourced approach from the journal data.
For more detailed information, you can visit the [README](https://github.com/Effect-TS/effect/tree/main/packages/cluster-workflow).

How do `@effect/cluster` and `@effect/cluster-workflow` are connected? When there are multiple workflows involving various systems or processes, it becomes challenging to manage them with a single process. The clustering component ensures that each workflow is executed consistently and exclusively once.

# Reference Docs

https://effect-ts.github.io/cluster
