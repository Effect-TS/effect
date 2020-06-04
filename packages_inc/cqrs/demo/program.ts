import { ReadSideConfig } from "../src/config"

import { provideApp } from "./app"
import {
  withTransaction,
  todoRoot,
  todosAggregate,
  bracketPool,
  domain,
  dbConfigLive
} from "./db"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import { logger, console } from "@matechs/logger"
import { liveFactory } from "@matechs/orm"

// simple program just append 3 new events to the log in the aggregate root todos-a
const program = withTransaction(
  pipe(
    // compose normally with rest of your logic
    todoRoot("a").persistEvent((of) => [
      of.TodoAdded({ id: 1, todo: "todo" }),
      of.TodoAdded({ id: 2, todo: "todo-2" })
    ]),
    T.chain(([_event0, _event1]) =>
      todoRoot("a").persistEvent((of) => of.TodoRemoved({ id: 1 }))
    )
  )
)

const defaultConfig = (id: string): ReadSideConfig => ({
  delay: 3000, // how long to wait after each poll
  id, // unique id for this read
  limit: 100 // how many events to fetch in each pool
})

// ideal for dispatch to locations like event-store that support idempotent writes
// process all events, events are guaranteed to be delivered in strong order
// within the same partition (namely aggregate root)
// events of different root may appear out of order
const readInAggregateTodosOnlyTodoAdded = todosAggregate.readAll(
  defaultConfig("read-todo-added")
)((match) =>
  T.traverseArray(
    match({
      TodoAdded: (todoAdded) => logger.info(JSON.stringify(todoAdded)),
      default: () => T.unit
    })
  )
)

// ideal to process actions that need to happen on certain events
// process only filtered events, events are guaranteed to be delivered in strong order
// within the same partition (namely aggregate root)
// events of different root may appear out of order
// note that because of filering the event sequence will have holes
const readInAggregateTodosOnlyTodoRemoved = todosAggregate.readOnly(
  defaultConfig("read-todo-removed")
)(["TodoRemoved"])((match) =>
  T.traverseArray(
    match({
      TodoRemoved: (todoRemoved) => logger.info(JSON.stringify(todoRemoved))
    })
  )
)

// ideal for operations that care about all the events in the db
// process all events, events are guaranteed to be delivered in strong order
// within the same partition (namely aggregate root)
// events of different root may appear out of order (especially in replay)
const readAllDomainTodoAdded = domain.readAll(
  defaultConfig("read-todo-added-all-domain")
)((match) =>
  T.traverseArray(
    match({
      TodoAdded: (todoAdded) => logger.info(JSON.stringify(todoAdded)),
      default: () => T.unit
    })
  )
)

// ideal to process actions that need to happen on certain events across different aggregates
// process only filtered events, events are guaranteed to be delivered in strong order
// within the same partition (namely aggregate root)
// events of different root may appear out of order (especially in replay)
// note that because of filering the event sequence will have holes
// NB: don't rely on order cross aggregate!!!
const readAllDomainOnlyTodoRemoved = domain.readOnly(
  defaultConfig("read-todo-removed-all-domain")
)(["TodoRemoved"])((match) =>
  T.traverseArray(
    match({
      TodoRemoved: (todoRemoved) => logger.info(JSON.stringify(todoRemoved))
    })
  )
)

// provide env like you would normally do with ORM
// keep in mind to include EventLog in your entities
export const main = bracketPool(
  T.Do()
    .do(domain.init()) // creates tables for event log and index
    .do(
      // run all programs
      T.parSequenceT(
        program,
        readInAggregateTodosOnlyTodoAdded,
        readInAggregateTodosOnlyTodoRemoved,
        readAllDomainTodoAdded,
        readAllDomainOnlyTodoRemoved
      )
    )
    .return(() => {
      //
    })
)

export const liveMain = pipe(
  main,
  provideApp,
  console.provideConsoleLogger,
  console.provideConsoleLoggerConfig(),
  T.provide(dbConfigLive),
  T.provide(liveFactory)
)
