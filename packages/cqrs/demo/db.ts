import { dbT, DbConfig, configEnv } from "@matechs/orm";
import * as CQ from "../src";
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

export const dbConfigLive: DbConfig<typeof dbURI> = {
  [configEnv]: {
    [dbURI]: {
      readConfig: Do(T.effect)
        .bind("type", T.pure("postgres"))
        .bind("name", T.pure("CONNECTION_NAME"))
        .bind("username", T.pure("DB_USER"))
        .bind("password", T.pure("DB_PASS"))
        .bind("database", T.pure("DB_NAME"))
        .bind("host", T.pure("DB_HOST"))
        .bind("port", T.pure(5432))
        .bind("synchronize", T.pure(true))
        .bindL("entities", () =>
          T.pure(
            // need to add CQ.EventLog to your entities
            // it has sync off and is created statically
            // via CQ.init
            [CQ.EventLog]
          )
        )
        //.bind("namingStrategy", T.pure(new SnakeNamingStrategy()))
        .return(s => s as ConnectionOptions)
    }
  }
};
