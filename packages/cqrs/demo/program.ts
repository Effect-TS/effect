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
import { InitError } from "../src/createIndex";
import { DbFactory } from "@matechs/orm";
import { ReadSideConfig } from "../src/config";

// simple program just append 2 new events to the log in the aggregate root todos-a
const program = withTransaction(
  pipe(
    todoRoot("a").persistEvent(of => of.TodoAdded({ id: 1, todo: "todo" })),
    T.chain(_ => todoRoot("a").persistEvent(of => of.TodoRemoved({ id: 1 })))
  )
);

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

// provide env like you would normally do with ORM
// keep in mind to include EventLog in your entities
export const main: T.Effect<
  DbConfig<typeof dbURI> & DbFactory & logger.Logger,
  TaskError | InitError,
  void
> = bracketPool(
  Do(T.effect)
    .do(domain.init()) // creates tables for event log and index
    .do(program) // runs the program
    .bindL("readInAggregateTodosOnlyTodoAdded", () =>
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
      // joins the long running fibers
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
