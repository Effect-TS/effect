import { console } from "@matechs/logger";
import {
  withTransaction,
  todoRoot,
  todosAggregate,
  bracketPool,
  domain,
  dbConfigLive
} from "./db";
import { pipe } from "fp-ts/lib/pipeable";
import { effect as T } from "@matechs/effect";
import { Do } from "fp-ts-contrib/lib/Do";
import { liveFactory } from "@matechs/orm";
import * as CQ from "@matechs/cqrs";
import { provideApp } from "./app";
import { eventStore, eventStoreURI, EventStoreConfig } from "../src";
import { sequenceT } from "fp-ts/lib/Apply";

// simple program just append 3 new events to the log in the aggregate root todos-a
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

const defaultConfig = (id: string): CQ.ReadSideConfig => ({
  delay: 3000, // how long to wait after each poll
  id, // unique id for this read
  limit: 100 // how many events to fetch in each pool
});

const todosES = eventStore(todosAggregate);

// provide env like you would normally do with ORM
// keep in mind to include EventLog in your entities
export const main = bracketPool(
  Do(T.effect)
    .do(domain.init()) // creates tables for event log and index
    .do(program) // runs the program
    .bindL("dispatcher", () =>
      T.fork(todosES.dispatcher(defaultConfig("todos_es")))
    )
    .doL(s =>
      // joins the long running fibers
      sequenceT(T.parEffect)(s.dispatcher.join)
    )
    .return(() => {
      //
    })
);

export const liveMain = pipe(
  main,
  provideApp,
  T.provideS<EventStoreConfig>({
    [eventStoreURI]: {
      settings: {},
      endPointOrGossipSeed: "discover://eventstore.discovery.url"
    }
  }),
  T.provideAll({
    ...dbConfigLive,
    ...liveFactory,
    ...console.consoleLogger()
  })
);
