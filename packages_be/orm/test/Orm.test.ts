import * as assert from "assert"

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
} from "typeorm"

import * as DB from "../src"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Pipe"
import * as F from "@matechs/core/Service"
import * as U from "@matechs/core/Utils"

@Entity()
export class DemoEntity {
  @PrimaryColumn()
  id: string
}

const testDbEnv: unique symbol = Symbol()

const {
  bracketPool,
  requireTx,
  withConnectionTask,
  withManagerTask,
  withNewRegion,
  withORMTransaction,
  withRepositoryTask,
  withTransaction
} = DB.dbT(testDbEnv)

describe("Orm", () => {
  it("should use db", async () => {
    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        manager: {} as EntityManager,
        close(): Promise<void> {
          return Promise.resolve()
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
                  return Promise.reject("not implemented")
                }
              } as Repository<Entity>
            }
          } as EntityManager)
        }
      } as Connection)

    const main = requireTx(
      withRepositoryTask(DemoEntity)((r) => () => r.findOne({ where: { id: "test" } }))
    )

    const program = bracketPool(withTransaction(main))

    const env: U.Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, T.pure({} as any))
    }

    const result = await T.runToPromiseExit(T.provide(env)(program))

    assert.deepStrictEqual(
      result,
      Ex.raise(new DB.TaskError(new Error("not implemented"), "withRepositoryTask"))
    )
  })

  it("should use withManager", async () => {
    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        manager: {} as EntityManager,
        close(): Promise<void> {
          return Promise.resolve()
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
                  return Promise.reject("not implemented")
                }
              } as Repository<Entity>
            }
          } as EntityManager)
        }
      } as Connection)

    const program = bracketPool(
      withTransaction(
        withManagerTask((m) => () =>
          m.getRepository(DemoEntity).findOne({ where: { id: "test" } })
        )
      )
    )

    const env: U.Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, T.pure({} as any))
    }

    const result = await T.runToPromiseExit(T.provide(env)(program))

    assert.deepStrictEqual(
      result,
      Ex.raise(new DB.TaskError(new Error("not implemented"), "withManagerTask"))
    )
  })

  it("should use withConnection", async () => {
    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        close(): Promise<void> {
          return Promise.resolve()
        },
        getRepository<Entity>(
          _: { new (): Entity } | Function | EntitySchema<Entity> | string
        ): Repository<Entity> {
          return {
            findOne(
              _?: string | number | Date | ObjectID,
              _2?: FindOneOptions<Entity>
            ): Promise<Entity | undefined> {
              return Promise.reject("not implemented")
            }
          } as Repository<Entity>
        }
      } as Connection)

    const program = bracketPool(
      withConnectionTask((c) => () =>
        c.getRepository(DemoEntity).findOne({ where: { id: "test" } })
      )
    )

    const env: U.Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, T.pure({} as any))
    }

    const result = await T.runToPromiseExit(T.provide(env)(program))

    assert.deepStrictEqual(
      result,
      Ex.raise(new DB.TaskError(new Error("not implemented"), "withConnectionTask"))
    )
  })

  it("should use transaction in higher order", async () => {
    const uri = Symbol()

    const spec = F.define({
      [uri]: {
        demo: F.fn<() => T.AsyncE<DB.TaskError, any>>()
      }
    })

    const {
      [uri]: { demo }
    } = F.access(spec)

    const provider = F.implement(spec)({
      [uri]: {
        demo: () => withManagerTask((r) => () => r.query(""))
      }
    })

    const program = pipe(withTransaction(demo()), provider, bracketPool)

    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        close(): Promise<void> {
          return Promise.resolve()
        },
        transaction<T>(
          runInTransaction: (entityManager: EntityManager) => Promise<T>
        ): Promise<T> {
          return runInTransaction({
            query(_query: string, _parameters?: any[] | undefined): Promise<any> {
              return Promise.resolve("ok")
            }
          } as EntityManager)
        }
      } as Connection)

    const env: U.Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, T.pure({} as any))
    }

    const res = await T.runToPromise(T.provide(env)(program))

    assert.deepStrictEqual(res, "ok")
  })

  it("should use ORM transaction in higer order", async () => {
    const uri = Symbol()

    const spec = F.define({
      [uri]: {
        demo: F.fn<() => T.AsyncE<DB.TaskError, any>>()
      }
    })

    const {
      [uri]: { demo }
    } = F.access(spec)

    const provider = F.implement(spec)({
      [uri]: {
        demo: () => withManagerTask((r) => () => r.query(""))
      }
    })

    const program = pipe(withORMTransaction(demo()), provider, bracketPool)

    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        close(): Promise<void> {
          return Promise.resolve()
        },
        createQueryRunner() {
          return {
            manager: {
              query(_query) {
                if (_query === "") {
                  return Promise.resolve("ok")
                }
                if (["BEGIN", "COMMIT"].indexOf(_query) !== -1) {
                  return Promise.resolve()
                } else {
                  return Promise.reject()
                }
              }
            } as EntityManager
          }
        }
      } as Connection)

    const env: U.Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, T.pure({} as any))
    }

    const res = await T.runToPromise(T.provide(env)(program))

    assert.deepStrictEqual(res, "ok")
  })

  it("should rollback ORM transaction in failure", async () => {
    const uri = Symbol()

    const spec = F.define({
      [uri]: {
        demo: F.fn<() => T.AsyncE<DB.TaskError, any>>()
      }
    })

    const {
      [uri]: { demo }
    } = F.access(spec)

    const provider = F.implement(spec)({
      [uri]: {
        demo: () => withManagerTask((r) => () => r.query(""))
      }
    })

    const program = pipe(withORMTransaction(demo()), provider, bracketPool)

    const queries: string[] = []

    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        close(): Promise<void> {
          return Promise.resolve()
        },
        createQueryRunner() {
          return {
            manager: {
              query(_query) {
                queries.push(_query)
                if (_query === "") {
                  return Promise.reject(new Error("ok"))
                }
                if (["BEGIN", "ROLLBACK"].indexOf(_query) !== -1) {
                  return Promise.resolve()
                } else {
                  return Promise.reject()
                }
              }
            } as EntityManager
          }
        }
      } as Connection)

    const env: U.Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, T.pure({} as any))
    }

    const res = await T.runToPromiseExit(T.provide(env)(program))

    // TODO: Double check why error is duplicated here
    assert.deepStrictEqual(
      res,
      Ex.combinedCause(Ex.raise(new DB.TaskError(new Error("ok"), "withManagerTask")))(
        Ex.raise(new DB.TaskError(new Error("ok"), "withManagerTask"))
      )
    )
    assert.deepStrictEqual(queries, ["BEGIN", "", "ROLLBACK"])
  })

  it("should jump in new region", async () => {
    const uri = Symbol()

    const spec = F.define({
      [uri]: {
        demo: F.fn<() => T.AsyncE<DB.TaskError, any>>()
      }
    })

    const {
      [uri]: { demo }
    } = F.access(spec)

    const provider = F.implement(spec)({
      [uri]: {
        demo: () =>
          pipe(
            withManagerTask((r) => () => r.query("")),
            withNewRegion
          )
      }
    })

    const program = pipe(withORMTransaction(demo()), provider, bracketPool)

    const mockFactory: typeof createConnection = () =>
      Promise.resolve({
        close(): Promise<void> {
          return Promise.resolve()
        },
        createQueryRunner() {
          return {
            manager: {
              query(query) {
                if (["BEGIN", "COMMIT"].indexOf(query) !== -1) {
                  return Promise.resolve()
                } else {
                  return Promise.reject()
                }
              }
            }
          }
        },
        manager: {
          query(_query) {
            return Promise.resolve("ok")
          }
        } as EntityManager
      } as Connection)

    const env: U.Env<typeof program> = {
      ...DB.mockFactory(mockFactory),
      ...DB.dbConfig(testDbEnv, T.pure({} as any))
    }

    const res = await T.runToPromise(T.provide(env)(program))

    assert.deepStrictEqual(res, "ok")
  })
})
