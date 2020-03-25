import { effect as T } from "@matechs/effect";
import { done } from "@matechs/effect/lib/original/exit";
import { Env } from "@matechs/effect/lib/utils/types";
import * as assert from "assert";
import { deepEqual } from "fast-equals";
import {
  Entity,
  PrimaryColumn,
  Connection,
  EntityManager,
  Repository,
} from "typeorm";
import * as ORM from "../src";
import { pipe } from "fp-ts/lib/pipeable";

@Entity()
export class DemoEntity {
  @PrimaryColumn()
  id: string;
}

const testDbEnv: unique symbol = Symbol();

const DB = ORM.database(testDbEnv);

describe("Api", () => {
  it("should use mock repository", async () => {
    const main = DB.repository(DemoEntity).save({ id: "ok" });

    const env: Env<typeof main> = {
      [ORM.DatabaseURI]: {
        [testDbEnv]: {
          repository: () => ({
            save: (o) =>
              deepEqual(o, { id: "ok" })
                ? T.pure(o as any)
                : T.raiseAbort("error"),
          }),
        },
      },
    };

    const result = await T.runToPromiseExit(T.provideAll(env)(main));

    assert.deepEqual(result, done({ id: "ok" }));
  });

  it("should use concrete repository", async () => {
    const program = DB.repository(DemoEntity).save({ id: "ok" });
    const main = pipe(
      program,
      DB.provide,
      DB.orm.bracketPool,
      T.provideS(
        ORM.mockFactory(() =>
          Promise.resolve({
            manager: {
              getRepository<Entity>(
                _: string | Function | (new () => Entity)
              ): Repository<Entity> {
                return {
                  save: (o: any) =>
                    deepEqual(o, { id: "ok" })
                      ? Promise.resolve(o)
                      : Promise.reject("error"),
                } as Repository<Entity>;
              },
            } as EntityManager,
            close: () => Promise.resolve(),
          } as Connection)
        )
      ),
      T.provideS(ORM.dbConfig(testDbEnv, T.pure({} as any)))
    );
    const result = await T.runToPromiseExit(main);

    assert.deepEqual(result, done({ id: "ok" }));
  });

  it("should use concrete repository in tx", async () => {
    const program = DB.repository(DemoEntity).save({ id: "ok" });
    const main = pipe(
      program,
      DB.orm.withTransaction,
      DB.provide,
      DB.orm.bracketPool,
      T.provideS(
        ORM.mockFactory(() =>
          Promise.resolve({
            transaction: <T>(f: (_: EntityManager) => Promise<T>) =>
              f({
                getRepository<Entity>(
                  _: string | Function | (new () => Entity)
                ): Repository<Entity> {
                  return {
                    save: (o: any) =>
                      deepEqual(o, { id: "ok" })
                        ? Promise.resolve(o)
                        : Promise.reject("error"),
                  } as Repository<Entity>;
                },
              } as EntityManager),
            close: () => Promise.resolve(),
          } as Connection)
        )
      ),
      T.provideS(ORM.dbConfig(testDbEnv, T.pure({} as any)))
    );
    const result = await T.runToPromiseExit(main);

    assert.deepEqual(result, done({ id: "ok" }));
  });
});
