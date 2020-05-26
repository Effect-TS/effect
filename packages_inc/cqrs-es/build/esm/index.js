import { sendEvent, eventStoreTcpConnection } from "./client";
import { adaptMeta } from "./meta";
import { ormOffsetStore } from "./offset";
import { readEvents } from "./read";
import * as T from "@matechs/core/Effect";
import * as M from "@matechs/core/Managed";
import * as O from "@matechs/core/Option";
import { pipe } from "@matechs/core/Pipe";
const aggregateRead = (agg) => (config) => M.use(eventStoreTcpConnection, (connection) => agg.readAll(config)((_) => T.traverseArray(sendEvent(connection))));
export const aggregate = (agg) => ({
    dispatcher: aggregateRead(agg),
    read: (readId) => (process) => readEvents(readId)(`$ce-${agg.aggregate}`)(T.liftEither((x) => agg.adt.type.decode(x)))((a) => pipe(adaptMeta(a), (meta) => O.isSome(meta)
        ? process(Object.assign(Object.assign({}, a), meta.value))
        : T.raiseAbort(new Error("cannot decode metadata"))))(ormOffsetStore(agg.db))((x) => agg.db.withORMTransaction(x))
});
export { eventStoreURI } from "./client";
export { offsetStore, readEvents } from "./read";
export { TableOffset, ormOffsetStore } from "./offset";
