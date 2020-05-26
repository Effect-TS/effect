import { esMetaURI } from "./read";
import * as O from "@matechs/core/Option";
import { metaURI } from "@matechs/cqrs";
export function adaptMeta(meta) {
    var _a;
    const event = O.fromNullable(meta[esMetaURI].raw.event);
    if (O.isNone(event)) {
        return O.none;
    }
    const metaS = O.fromNullable((_a = event.value.metadata) === null || _a === void 0 ? void 0 : _a.toString("utf-8"));
    if (O.isNone(metaS)) {
        return O.none;
    }
    try {
        const metaE = JSON.parse(metaS.value);
        return O.some({
            [metaURI]: {
                kind: event.value.eventType,
                id: event.value.eventId,
                createdAt: metaE.createdAt,
                aggregate: metaE.aggregate,
                root: metaE.root,
                sequence: BigInt(metaE.sequence)
            }
        });
    }
    catch (_b) {
        return O.none;
    }
}
