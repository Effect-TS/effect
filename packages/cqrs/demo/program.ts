import { logger, console } from "@matechs/logger";
import {
  withTransaction,
  todoRoot,
  todosAggregate,
  dbURI,
  bracketPool,
  M,
  dbConfigLive
} from "./db";
import { pipe } from "fp-ts/lib/pipeable";
import { effect as T } from "@matechs/effect";
import { array } from "fp-ts/lib/Array";
import { Do } from "fp-ts-contrib/lib/Do";
import { TaskError, DbConfig, liveFactory } from "@matechs/orm";
import { InitError } from "../src/createIndex";
import { DbFactory } from "@matechs/orm";

// simple program just append 2 new events to the log in the aggregate root todos-a
const program = withTransaction(
  pipe(
    todoRoot("a").persistEvent(of => of.TodoAdded({ id: 1, todo: "todo" })),
    T.chain(_ => todoRoot("a").persistEvent(of => of.TodoRemoved({ id: 1 })))
  )
);

// ideal for dispatch to locations like event-store that support idempotent writes
// process all events, events are guaranteed to be delivered in strong order
// within the same partition (namely aggregate root)
// events of different root may appear out of order (especially in replay)
const readAll = pipe(
  todosAggregate.readAll(adt =>
    adt.match({
      TodoAdded: todoAdded => logger.info(JSON.stringify(todoAdded)),
      default: () => T.unit
    })
  ),
  M.withConfig({
    readDelay: T.pure(3000), // how long to wait after each poll
    readID: T.pure("read-todo-added"), // unique id for this read
    readLimit: T.pure(100) // how many events to fetch in each pool
  })
);

// ideal to process actions that need to happen on certain events
// process only filtered events, events are guaranteed to be delivered in strong order
// within the same partition (namely aggregate root)
// events of different root may appear out of order (especially in replay)
// note that because of filering the event sequence will have holes
const readOnly = pipe(
  todosAggregate.readOnly(["TodoRemoved"])(adt =>
    adt.match({
      TodoRemoved: todoRemoved => logger.info(JSON.stringify(todoRemoved))
    })
  ),
  M.withConfig({
    readDelay: T.pure(3000), // how long to wait after each poll
    readID: T.pure("read-todo-removed"), // unique id for this read
    readLimit: T.pure(100) // how many events to fetch in each pool
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
    .do(M.init) // creates tables for event log and index
    .do(program) // runs the program
    .bind("readAll", T.fork(readAll)) // fork fiber for readAll
    .bind("readOnly", T.fork(readOnly)) //fork fiber for readOnly
    .doL(s => array.sequence(T.parEffect)([s.readAll.join, s.readOnly.join])) // joins the two
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
