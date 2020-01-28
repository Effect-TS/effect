## CQRS

Provides a utility framework on top of `@matechs/orm` to do CQRS with DDD.

This utility doesn't per se enforce an event sourcing model that we find too restrictive for most of the scenarios it instead take a less intrusive approach by providing you the primitives needed to store, orgnize and query events efficiently so you can use it where you see fit.

This library depends on [morphic-ts](https://github.com/sledorze/morphic-ts) for ADT management, check it out first!

## Usage

### Definition of the domain of events

```ts
import { summon, tagged } from "morphic-ts/lib/batteries/summoner-no-union";

export const TodoAdded = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("TodoAdded"),
      id: F.number(),
      todo: F.string()
    },
    "TodoAdded"
  )
);

export const TodoRemoved = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("TodoRemoved"),
      id: F.number()
    },
    "TodoRemoved"
  )
);

// define all events in your domain
export const DomainEvent = tagged("type")({ TodoAdded, TodoRemoved });
```

### Derivation of utilities

```ts
import { dbT, DbConfig, configEnv } from "@matechs/orm";
import * as CQ from "@matechs/cqrs";
import { DomainEvent } from "./events";
import { Do } from "fp-ts-contrib/lib/Do";
import { ConnectionOptions } from "typeorm";
import { effect as T } from "@matechs/effect";

// configure ORM db
export const dbURI: unique symbol = Symbol();

// get ORM utils for db
export const { bracketPool, withTransaction } = dbT(dbURI);

// get CQRS utils for db and event domain
export const domain = CQ.cqrs(DomainEvent, dbURI);

// define the todo aggregate by identifiying specific domain events
export const todosAggregate = domain.aggregate("todos", [
  "TodoAdded",
  "TodoRemoved"
]);

// construct a utility to instanciate the aggregate root with a specific id
export const todoRoot = (id: string) => todosAggregate.root(`todo-${id}`);

// provide a configuration for your database connection
export const dbConfigLive: DbConfig<typeof dbURI> = {
  [configEnv]: {
    [dbURI]: {
      readConfig: T.pure({
        // ORM CONFIG for PostgreSQL
        entities: [CQ.EventLog, ...YOUR_OTHER_ENTITIES]
      })
    }
  }
};
```

### Usage in your transactions

When you persist an even a lock is taken against the aggregate root to guarantee that each event gets constantly increasing sequence number

```ts
const program = withTransaction(
  pipe(
    // compose normally with rest of your logic
    todoRoot("a").persistEvent(of => [
      of.TodoAdded({ id: 1, todo: "todo" }),
      of.TodoAdded({ id: 2, todo: "todo-2" })
    ]),
    T.chain(([_event0, _event1]) =>
      todoRoot("a").persistEvent(of => of.TodoRemoved({ id: 1 }))
    )
  )
);
```

### Define your read projectors

```ts
import { logger, console } from "@matechs/logger";
import {
  withTransaction,
  todoRoot,
  todosAggregate,
  dbURI,
  bracketPool,
  domain,
  dbConfigLive
} from "./db";
import { pipe } from "fp-ts/lib/pipeable";
import { effect as T } from "@matechs/effect";
import { array } from "fp-ts/lib/Array";
import { Do } from "fp-ts-contrib/lib/Do";
import { TaskError, DbConfig, liveFactory } from "@matechs/orm";
import { InitError } from "@matechs/cqrs/lib/createIndex";
import { DbFactory } from "@matechs/orm";
import { ReadSideConfig } from "@matechs/cqrs/lib/config";

const defaultConfig = (id: string): ReadSideConfig => ({
  delay: 3000, // how long to wait after each poll
  id, // unique id for this read
  limit: 100 // how many events to fetch in each pool
});

// ideal for dispatch to locations like event-store that support idempotent writes
// process all events, events are guaranteed to be delivered in strong order
// within the same partition (namely aggregate root)
// events of different root may appear out of order (especially in replay)
const readInAggregateTodosOnlyTodoAdded = todosAggregate.readAll(
  defaultConfig("read-todo-added")
)(({ match }) =>
  match({
    TodoAdded: todoAdded => logger.info(JSON.stringify(todoAdded)),
    default: () => T.unit
  })
);

// ideal to process actions that need to happen on certain events
// process only filtered events, events are guaranteed to be delivered in strong order
// within the same partition (namely aggregate root)
// events of different root may appear out of order (especially in replay)
// note that because of filering the event sequence will have holes
const readInAggregateTodosOnlyTodoRemoved = todosAggregate.readOnly(
  defaultConfig("read-todo-removed")
)(["TodoRemoved"])(({ match }) =>
  match({
    TodoRemoved: todoRemoved => logger.info(JSON.stringify(todoRemoved))
  })
);

// ideal for operations that care about all the events in the db
// process all events, events are guaranteed to be delivered in strong order
// within the same partition (namely aggregate root)
// events of different root may appear out of order (especially in replay)
const readAllDomainTodoAdded = domain.readAll(
  defaultConfig("read-todo-added-all-domain")
)(({ match }) =>
  match({
    TodoAdded: todoAdded => logger.info(JSON.stringify(todoAdded)),
    default: () => T.unit
  })
);

// ideal to process actions that need to happen on certain events across different aggregates
// process only filtered events, events are guaranteed to be delivered in strong order
// within the same partition (namely aggregate root)
// events of different root may appear out of order (especially in replay)
// note that because of filering the event sequence will have holes
// NB: don't rely on order cross aggregate!!!
const readAllDomainOnlyTodoRemoved = domain.readOnly(
  defaultConfig("read-todo-removed-all-domain")
)(["TodoRemoved"])(({ match }) =>
  match({
    TodoRemoved: todoRemoved => logger.info(JSON.stringify(todoRemoved))
  })
);
```

### Wire up in your main flow

Note that you may run any component in its own entry, compose as you see fit for scalability.

```ts
// provide env like you would normally do with ORM
// keep in mind to include EventLog in your entities
export const main: T.Effect<
  DbConfig<typeof dbURI> & DbFactory & logger.Logger,
  TaskError | InitError,
  void
> = bracketPool(
  Do(T.effect)
    .do(domain.init()) // creates tables for event_log and event_log_idx
    .do(program) // runs the program
    .bindL("readInAggregateTodosOnlyTodoAdded", () =>
      // NB: when runs each read creates (if not exists) a specialized index for query
      //     and offset tracking
      // fork fiber for readInAggregateTodosOnlyTodoAdded
      T.fork(readInAggregateTodosOnlyTodoAdded)
    )
    .bindL("readInAggregateTodosOnlyTodoRemoved", () =>
      //fork fiber for readInAggregateTodosOnlyTodoRemoved
      T.fork(readInAggregateTodosOnlyTodoRemoved)
    )
    .bindL("readAllDomainTodoAdded", () =>
      //fork fiber for readAllDomainTodoAdded
      T.fork(readAllDomainTodoAdded)
    )
    .bindL("readAllDomainOnlyTodoRemoved", () =>
      //fork fiber for readAllDomainOnlyTodoRemoved
      T.fork(readAllDomainOnlyTodoRemoved)
    )
    .doL(s =>
      // join the long running fibers
      array.sequence(T.parEffect)([
        s.readInAggregateTodosOnlyTodoAdded.join,
        s.readInAggregateTodosOnlyTodoRemoved.join,
        s.readAllDomainTodoAdded.join,
        s.readAllDomainOnlyTodoRemoved.join
      ])
    )
    .return(() => {
      //
    })
);

export const liveMain = pipe(
  main,
  T.provideAll({
    ...dbConfigLive,
    ...liveFactory,
    ...console.consoleLogger()
  })
);

// in a separate file (side effect)
T.run(liveMain, exit => {
  // the program shall not exit as reads should be polling
  console.error(exit);
});
```

### Example

Check the [demo](https://github.com/mikearnaldi/matechs-effect/tree/master/packages/cqrs/demo) folder.

### Future Development

Evaluate if to include a utility to do event sourcing by specifying the event handlers at the aggregate level to be executed in the same transaction that persist the event.
Note that this patter is already "supported" by folding the output of persistEvent with the aggregate exposed adt.
