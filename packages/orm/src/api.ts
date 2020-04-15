import * as OR from "./orm";
import { effect as T } from "@matechs/effect";
import { ObjectType, DeepPartial, SaveOptions, FindOneOptions } from "typeorm";
import { pipe } from "fp-ts/lib/pipeable";
import * as OP from "fp-ts/lib/Option";

export type Target<O> = ObjectType<O>;

export const DatabaseURI = "@matechs/orm/DatabaseURI";

export interface Database<DbURI extends symbol | string> {
  [DatabaseURI]: {
    [k in DbURI]: {
      repository<O>(_: Target<O>): Repository<O>;
    };
  };
}

export interface Repository<O> {
  save<T extends DeepPartial<O>>(
    entity: T,
    options?: SaveOptions | undefined
  ): T.TaskErr<OR.TaskError, O>;
  findOne(options?: FindOneOptions<O> | undefined): T.TaskErr<OR.TaskError, OP.Option<O>>;
}

const repository_ = <DbURI extends symbol | string>(DbURI: DbURI) => <O>(Target: Target<O>) => ({
  save: <T extends DeepPartial<O>>(entity: T, options?: SaveOptions) =>
    T.accessM((_: Database<DbURI>) =>
      _[DatabaseURI][DbURI].repository(Target).save(entity, options)
    ),
  findOne: (options: FindOneOptions<O>) =>
    T.accessM((_: Database<DbURI>) => _[DatabaseURI][DbURI].repository(Target).findOne(options))
});

export const database = <DbURI extends symbol | string>(DbURI: DbURI) => {
  const repository = repository_(DbURI);
  const orm = OR.dbT(DbURI);

  const provideApi = <R, E, A>(
    eff: T.Effect<R & Database<DbURI>, E, A>
  ): T.Effect<R & OR.ORM<DbURI>, E, A> => {
    const provideDb = T.provideM(
      T.access(
        (r: OR.ORM<DbURI>): Database<DbURI> => ({
          [DatabaseURI]:
            {
              ...r[DatabaseURI],
              [DbURI]:
                {
                  repository: (Target) => ({
                    save: (entity, options) =>
                      pipe(
                        orm.withRepositoryTask(Target)((_) => () => _.save(entity, options)),
                        T.provide(r, true)
                      ),
                    findOne: (options) =>
                      pipe(
                        orm.withRepositoryTask(Target)((_) => () => _.findOne(options)),
                        T.map(OP.fromNullable),
                        T.provide(r, true)
                      )
                  })
                } as Database<DbURI>[typeof DatabaseURI][DbURI]
            } as Database<DbURI>[typeof DatabaseURI]
        })
      )
    );

    return pipe(eff, provideDb);
  };

  const {
    bracketPool,
    requireTx,
    withConnection,
    withConnectionTask,
    withManager,
    withManagerTask,
    withNewRegion,
    withORMTransaction,
    withRepository,
    withRepositoryTask,
    withTransaction
  } = orm;

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
    withORMTransaction,
    withRepository,
    withRepositoryTask,
    withTransaction
  };
};

export const mockDatabase = <O>(M: {
  repository?: (_: ObjectType<O>) => Partial<Repository<O>>;
}) => ({
  repository: (_: ObjectType<O>) =>
    ({
      save: () => T.unit,
      findOne: () => T.unit,
      ...M.repository?.(_)
    } as any)
});
