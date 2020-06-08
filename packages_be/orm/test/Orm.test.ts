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
import { pipe } from "@matechs/core/Function"
import * as F from "@matechs/core/Service"

@Entity()
export class DemoEntity {
  @PrimaryColumn()
  id: string
}

const testDbEnv: unique symbol = Symbol()

const {
  Pool,
  requireTx,
  withConnectionTask,
  withManagerTask,
  withRepositoryTask,
  withTransaction
} = DB.dbT(testDbEnv)

const FakeConfig = DB.Config(testDbEnv)(T.pure({} as any))

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

    const program = Pool.with(DB.mockFactory(mockFactory))
      .with(FakeConfig)
      .use(withTransaction(main))

    const result = await T.runToPromiseExit(program)

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

    const program = Pool.with(DB.mockFactory(mockFactory))
      .with(FakeConfig)
      .use(
        withTransaction(
          withManagerTask((m) => () =>
            m.getRepository(DemoEntity).findOne({ where: { id: "test" } })
          )
        )
      )

    const result = await T.runToPromiseExit(program)

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

    const program = Pool.with(DB.mockFactory(mockFactory))
      .with(FakeConfig)
      .use(
        withConnectionTask((c) => () =>
          c.getRepository(DemoEntity).findOne({ where: { id: "test" } })
        )
      )

    const result = await T.runToPromiseExit(program)

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

    const provider = F.layer(spec)({
      [uri]: {
        demo: () => withManagerTask((r) => () => r.query(""))
      }
    })

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

    const factory = DB.mockFactory(mockFactory)

    const program = pipe(
      withTransaction(demo()),
      provider.with(Pool).with(factory).with(FakeConfig).use
    )

    const res = await T.runToPromise(program)

    assert.deepStrictEqual(res, "ok")
  })
})
