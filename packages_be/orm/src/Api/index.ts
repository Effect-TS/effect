import { ObjectType, DeepPartial, SaveOptions, FindOneOptions } from "typeorm"

import * as ORM from "../ORM"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"

export type Target<O> = ObjectType<O>

export const DatabaseURI = "@matechs/orm/DatabaseURI"

export interface Database<DbURI extends symbol | string> {
  [DatabaseURI]: {
    [k in DbURI]: {
      repository<O>(_: Target<O>): Repository<O>
    }
  }
}

export interface Repository<O> {
  save<T extends DeepPartial<O>>(
    entity: T,
    options?: SaveOptions | undefined
  ): T.AsyncE<ORM.TaskError, O>
  findOne(options?: FindOneOptions<O> | undefined): T.AsyncE<ORM.TaskError, O.Option<O>>
}

const repository_ = <DbURI extends symbol | string>(DbURI: DbURI) => <O>(
  Target: Target<O>
) => ({
  save: <T extends DeepPartial<O>>(entity: T, options?: SaveOptions) =>
    T.accessM((_: Database<DbURI>) =>
      _[DatabaseURI][DbURI].repository(Target).save(entity, options)
    ),
  findOne: (options: FindOneOptions<O>) =>
    T.accessM((_: Database<DbURI>) =>
      _[DatabaseURI][DbURI].repository(Target).findOne(options)
    )
})

export const database = <DbURI extends symbol | string>(DbURI: DbURI) => {
  const repository = repository_(DbURI)
  const orm = ORM.dbT(DbURI)

  const provideApi = <S, R, E, A>(
    eff: T.Effect<S, R & Database<DbURI>, E, A>
  ): T.Effect<S, R & ORM.ORM<DbURI>, E, A> => {
    const provideDb = T.provideM(
      T.access(
        (r: ORM.ORM<DbURI>): Database<DbURI> => ({
          [DatabaseURI]: {
            ...r[DatabaseURI],
            [DbURI]: {
              repository: (Target) => ({
                save: (entity, options) =>
                  pipe(
                    orm.withRepositoryTask(Target)((_) => () =>
                      _.save(entity, options)
                    ),
                    T.provide(r, "inverted")
                  ),
                findOne: (options) =>
                  pipe(
                    orm.withRepositoryTask(Target)((_) => () => _.findOne(options)),
                    T.map(O.fromNullable),
                    T.provide(r, "inverted")
                  )
              })
            } as Database<DbURI>[typeof DatabaseURI][DbURI]
          } as Database<DbURI>[typeof DatabaseURI]
        })
      )
    )

    return pipe(eff, provideDb)
  }

  const {
    bracketPool,
    requireTx,
    withConnection,
    withConnectionTask,
    withManager,
    withManagerTask,
    withNewRegion,
    withRepository,
    withRepositoryTask,
    withTransaction
  } = orm

  return {
    repository,
    provideApi,
    bracketPool,
    requireTx,
    withConnection,
    withConnectionTask,
    withManager,
    withManagerTask,
    withNewRegion,
    withRepository,
    withRepositoryTask,
    withTransaction
  }
}

export const mockDatabase = <O>(M: {
  repository?: (_: ObjectType<O>) => Partial<Repository<O>>
}) => ({
  repository: (_: ObjectType<O>) =>
    ({
      save: () => T.unit,
      findOne: () => T.unit,
      ...M.repository?.(_)
    } as any)
})
