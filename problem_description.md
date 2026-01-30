Debugging concurrent programs is difficult without a stable snapshot of runtime fibers and their relationships. Add an API that walks from runtime fiber roots.

## Agent Instructions
Follow children / blockingOn only when enabled via include flags. maxDepth is 0-based (0 roots, 1 direct relations); default Infinity. If settle.iterations is set, resample status up to that many yields.

Determinism: sort node ids ascending; relationship arrays ascending; DOT nodes ascending; DOT edges by (sourceId, targetId). DOT node and edge lines must include an attribute list with at least one key=value.

## Test Assumptions
New export: Fiber.dumpGraph(roots, options). options keys: output "nodes"|"graph"|"dot"; include { children, blockingOn, roots, threadName }; maxDepth; settle { iterations }.
Numeric id for "nodes" and "dot": min(FiberId.ids(fiberId)) or -1.
"nodes": { nodes: Node[] }, Node.id:number; when included: children:number[], blockingOn:number[], isRoot:boolean, threadName:string.
"graph": Graph.Graph with same metadata, but node.id is a FiberId.
