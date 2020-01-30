import { effect as T, freeEnv as F } from "@matechs/effect";
import { raise } from "@matechs/effect/lib/original/exit";
import { Env } from "@matechs/effect/lib/utils/types";
import * as assert from "assert";
import {
  Connection,
  createConnection,
  Entity,
  EntityManager,
  EntitySchema,
  FindOneOptions,
  ObjectID,
  PrimaryColumn,
  Repository
} from "typeorm";
import * as DB from "../src";
import { pipe } from "fp-ts/lib/pipeable";

@Entity()
export class DemoEntity {
  @PrimaryColumn()
  id: string;
}

const testDbEnv: unique symbol = Symbol();

const {
  withTransaction,
  withRepositoryTask,
  bracketPool,
  withConnectionTask,
  withManagerTask,
  withORMTransaction
} = DB.dbT(testDbEnv);

describe("Orm", () => {
  it("should use db", async () => {
    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        manager: {} as EntityManager,
        close(): Promise<void> {
          return Promise.resolve();
        },
        transaction<T>(
          runInTransaction: (entityManager: EntityManager) => Promise<T>
        ): Promise<T> {
          return runInTransaction({
            getRepository<Entity>(
              _: { new (): Entity } | Function | EntitySchema<Entity> | string
            ): Repository<Entity> {
              return {
                findOne(
                  _?: string | number | Date | ObjectID,
                  _2?: FindOneOptions<Entity>
                ): Promise<Entity | undefined> {
                  return Promise.reject("not implemented");
                }
              } as Repository<Entity>;
            }
          } as EntityManager);
        }
      } as Connection);

    const program = bracketPool(
      withTransaction(
        withRepositoryTask(DemoEntity)(r => () =>
          r.findOne({ where: { id: "test" } })
        )
      )
    );

    const env: Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, T.pure({} as any))
    };

    const result = await T.runToPromiseExit(T.provideAll(env)(program));

    assert.deepEqual(
      result,
      raise(
        new DB.TaskError(new Error("not implemented"), "withRepositoryTask")
      )
    );
  });

  it("should use withManager", async () => {
    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        manager: {} as EntityManager,
        close(): Promise<void> {
          return Promise.resolve();
        },
        transaction<T>(
          runInTransaction: (entityManager: EntityManager) => Promise<T>
        ): Promise<T> {
          return runInTransaction({
            getRepository<Entity>(
              _: { new (): Entity } | Function | EntitySchema<Entity> | string
            ): Repository<Entity> {
              return {
                findOne(
                  _?: string | number | Date | ObjectID,
                  _2?: FindOneOptions<Entity>
                ): Promise<Entity | undefined> {
                  return Promise.reject("not implemented");
                }
              } as Repository<Entity>;
            }
          } as EntityManager);
        }
      } as Connection);

    const program = bracketPool(
      withTransaction(
        withManagerTask(m => () =>
          m.getRepository(DemoEntity).findOne({ where: { id: "test" } })
        )
      )
    );

    const env: Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, T.pure({} as any))
    };

    const result = await T.runToPromiseExit(T.provideAll(env)(program));

    assert.deepEqual(
      result,
      raise(new DB.TaskError(new Error("not implemented"), "withManagerTask"))
    );
  });

  it("should use withConnection", async () => {
    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        close(): Promise<void> {
          return Promise.resolve();
        },
        getRepository<Entity>(
          _: { new (): Entity } | Function | EntitySchema<Entity> | string
        ): Repository<Entity> {
          return {
            findOne(
              _?: string | number | Date | ObjectID,
              _2?: FindOneOptions<Entity>
            ): Promise<Entity | undefined> {
              return Promise.reject("not implemented");
            }
          } as Repository<Entity>;
        }
      } as Connection);

    const program = bracketPool(
      withConnectionTask(c => () =>
        c.getRepository(DemoEntity).findOne({ where: { id: "test" } })
      )
    );

    const env: Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, T.pure({} as any))
    };

    const result = await T.runToPromiseExit(T.provideAll(env)(program));

    assert.deepEqual(
      result,
      raise(
        new DB.TaskError(new Error("not implemented"), "withConnectionTask")
      )
    );
  });

  it("should use transaction in higer order", async () => {
    const uri = Symbol();

    const spec = F.define({
      [uri]: {
        demo: F.fn<() => T.IO<DB.TaskError, any>>()
      }
    });

    const {
      [uri]: { demo }
    } = F.access(spec);

    const provider = F.implement(spec)({
      [uri]: {
        demo: () => withManagerTask(r => () => r.query(""))
      }
    });

    const program = pipe(withTransaction(demo()), provider, bracketPool);

    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        close(): Promise<void> {
          return Promise.resolve();
        },
        transaction<T>(
          runInTransaction: (entityManager: EntityManager) => Promise<T>
        ): Promise<T> {
          return runInTransaction({
            query(
              _query: string,
              _parameters?: any[] | undefined
            ): Promise<any> {
              return Promise.resolve("ok");
            }
          } as EntityManager);
        }
      } as Connection);

    const env: Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, T.pure({} as any))
    };

    const res = await T.runToPromise(T.provideAll(env)(program));

    assert.deepEqual(res, "ok");
  });

  it("should use ORM transaction in higer order", async () => {
    const uri = Symbol();

    const spec = F.define({
      [uri]: {
        demo: F.fn<() => T.IO<DB.TaskError, any>>()
      }
    });

    const {
      [uri]: { demo }
    } = F.access(spec);

    const provider = F.implement(spec)({
      [uri]: {
        demo: () => withManagerTask(r => () => r.query(""))
      }
    });

    const program = pipe(withORMTransaction(demo()), provider, bracketPool);

    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        close(): Promise<void> {
          return Promise.resolve();
        },
        createQueryRunner() {
          return {
            manager: {
              query(_query) {
                return Promise.resolve("ok");
              }
            } as EntityManager,
            query(query) {
              if (["BEGIN", "COMMIT"].indexOf(query) !== -1) {
                return Promise.resolve();
              } else {
                return Promise.reject();
              }
            }
          };
        }
      } as Connection);

    const env: Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, T.pure({} as any))
    };

    const res = await T.runToPromise(T.provideAll(env)(program));

    assert.deepEqual(res, "ok");
  });

  it("should rollback ORM transaction in failure", async () => {
    const uri = Symbol();

    const spec = F.define({
      [uri]: {
        demo: F.fn<() => T.IO<DB.TaskError, any>>()
      }
    });

    const {
      [uri]: { demo }
    } = F.access(spec);

    const provider = F.implement(spec)({
      [uri]: {
        demo: () => withManagerTask(r => () => r.query(""))
      }
    });

    const program = pipe(withORMTransaction(demo()), provider, bracketPool);

    const queries: string[] = [];

    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        close(): Promise<void> {
          return Promise.resolve();
        },
        createQueryRunner() {
          return {
            manager: {
              query(_query) {
                return Promise.reject(new Error("ok"));
              }
            } as EntityManager,
            query(query) {
              queries.push(query);
              if (["BEGIN", "ROLLBACK"].indexOf(query) !== -1) {
                return Promise.resolve();
              } else {
                return Promise.reject();
              }
            }
          };
        }
      } as Connection);

    const env: Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, T.pure({} as any))
    };

    const res = await T.runToPromiseExit(T.provideAll(env)(program));

    assert.deepEqual(
      res,
      raise(new DB.TaskError(new Error("ok"), "withManagerTask"))
    );
    assert.deepEqual(queries, ["BEGIN", "ROLLBACK"]);
  });
});
