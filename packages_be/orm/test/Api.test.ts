import * as assert from "assert"

import { deepEqual } from "fast-equals"
import { Entity, PrimaryColumn, Connection, EntityManager, Repository } from "typeorm"

import * as ORM from "../src"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"
import * as U from "@matechs/core/Utils"

@Entity()
export class DemoEntity {
  @PrimaryColumn()
  id: string
}

const DbURI: unique symbol = Symbol()

const DB = ORM.database(DbURI)

describe("Api", () => {
  it("should use mock repository", async () => {
    const main = DB.repository(DemoEntity).save({ id: "ok" })

    const env: U.Env<typeof main> = {
      [ORM.DatabaseURI]: {
        [DbURI]: ORM.mockDatabase({
          repository: () => ({
            save: (o) =>
              deepEqual(o, { id: "ok" }) ? T.pure(o as any) : T.raiseAbort("error")
          })
        })
      }
    }

    const result = await T.runToPromiseExit(T.provide(env)(main))

    assert.deepStrictEqual(result, Ex.done({ id: "ok" }))
  })

  it("should use mock repository findOne", async () => {
    const main = DB.repository(DemoEntity).findOne({
      where: {
        id: "ok"
      }
    })

    const env: U.Env<typeof main> = {
      [ORM.DatabaseURI]: {
        [DbURI]: ORM.mockDatabase({
          repository: () => ({
            findOne: (o) =>
              deepEqual(o, { where: { id: "ok" } })
                ? T.pure(O.some({ id: "ok" } as any))
                : T.raiseAbort("error")
          })
        })
      }
    }

    const result = await T.runToPromiseExit(T.provide(env)(main))

    assert.deepStrictEqual(result, Ex.done(O.some({ id: "ok" })))
  })

  it("should use concrete repository", async () => {
    const program = DB.repository(DemoEntity).save({ id: "ok" })
    const main = pipe(
      program,
      DB.provideApi,
      DB.bracketPool,
      T.provide(
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
                      : Promise.reject("error")
                } as Repository<Entity>
              }
            } as EntityManager,
            close: () => Promise.resolve()
          } as Connection)
        )
      ),
      T.provide(ORM.dbConfig(DbURI, T.pure({} as any)))
    )
    const result = await T.runToPromiseExit(main)

    assert.deepStrictEqual(result, Ex.done({ id: "ok" }))
  })

  it("should use concrete repository findOne", async () => {
    const program = DB.repository(DemoEntity).findOne({
      where: {
        id: "ok"
      }
    })
    const main = pipe(
      program,
      DB.provideApi,
      DB.bracketPool,
      T.provide(
        ORM.mockFactory(() =>
          Promise.resolve({
            manager: {
              getRepository<Entity>(
                _: string | Function | (new () => Entity)
              ): Repository<Entity> {
                return {
                  findOne: (o: any) =>
                    deepEqual(o, { where: { id: "ok" } })
                      ? Promise.resolve({ id: "ok" } as any)
                      : Promise.reject("error")
                } as Repository<Entity>
              }
            } as EntityManager,
            close: () => Promise.resolve()
          } as Connection)
        )
      ),
      T.provide(ORM.dbConfig(DbURI, T.pure({} as any)))
    )
    const result = await T.runToPromiseExit(main)

    assert.deepStrictEqual(result, Ex.done(O.some({ id: "ok" })))
  })

  it("should use concrete repository in tx", async () => {
    const program = DB.repository(DemoEntity).save({ id: "ok" })
    const main = pipe(
      program,
      DB.withTransaction,
      DB.provideApi,
      DB.bracketPool,
      T.provide(
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
                        : Promise.reject("error")
                  } as Repository<Entity>
                }
              } as EntityManager),
            close: () => Promise.resolve()
          } as Connection)
        )
      ),
      T.provide(ORM.dbConfig(DbURI, T.pure({} as any)))
    )
    const result = await T.runToPromiseExit(main)

    assert.deepStrictEqual(result, Ex.done({ id: "ok" }))
  })
})
