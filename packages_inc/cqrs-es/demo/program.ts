import * as ES from "../src"

import { provideApp } from "./app"
import {
  withTransaction,
  todoRoot,
  todosAggregate,
  bracketPool,
  domain,
  dbConfigLive,
  todosES
} from "./db"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as CQ from "@matechs/cqrs"
import { console } from "@matechs/logger"
import { liveFactory } from "@matechs/orm"

const program = withTransaction(
  pipe(
    todoRoot("a").persistEvent((of) => [
      of.TodoAdded({ id: 1, todo: "todo" }),
      of.TodoAdded({ id: 2, todo: "todo-2" })
    ]),
    T.chain(([_event0, _event1]) =>
      todoRoot("a").persistEvent((of) => of.TodoRemoved({ id: 1 }))
    )
  )
)

const defaultConfig = (id: string): CQ.ReadSideConfig => ({
  delay: 3000,
  id,
  limit: 100
})

// streams all events from eventstore in the $ce-todos stream
// keep track of latest offset transactionally in postgres
// table ES.TableOffsets (created automatically through sync)
const processTodos = todosES.read("read_todos_from_es")(
  todosAggregate.adt.matchEffect({
    TodoAdded: () => T.unit,
    TodoRemoved: () => T.unit
  })
)

// note the above is equivalent to the following
export const processTodosGeneric = ES.readEvents("read_todos_from_es")("$ce-todos")(
  // this will be used to decode raw events
  T.liftEither((x) => todosAggregate.adt.type.decode(x))
)(
  todosAggregate.adt.matchEffect({
    TodoAdded: () => T.unit,
    TodoRemoved: () => T.unit
  })
)(
  // you can implement you own
  ES.ormOffsetStore(todosAggregate.db)
)(
  // provides environment and bracket over process step
  // this will wrap process + set offset on a single event
  (processEff) => todosAggregate.db.withTransaction(processEff)
)

export const main = bracketPool(
  T.Do()
    .do(domain.init())
    .do(
      T.parSequenceT(
        // main program
        program,
        // diapatcher
        todosES.dispatcher(defaultConfig("todos_es")),
        // processor
        processTodos
      )
    )
    .return(() => {
      //
    })
)

export const liveMain = pipe(
  main,
  provideApp,
  T.provide<ES.EventStoreConfig>({
    [ES.eventStoreURI]: {
      settings: {},
      endPointOrGossipSeed: "discover://eventstore.discovery.url"
    }
  }),
  console.provideConsoleLogger,
  console.provideConsoleLoggerConfig(),
  T.provide(dbConfigLive),
  T.provide(liveFactory)
)
