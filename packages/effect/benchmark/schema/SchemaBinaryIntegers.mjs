// Exploratory payload-only comparison; not an end-to-end SchemaBinary benchmark.
// Run with: node packages/effect/benchmark/schema/SchemaBinaryIntegers.mjs
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"
import { Bench } from "tinybench"

const source = readFileSync(new URL("../../src/encoding/SchemaBinary.ts", import.meta.url), "utf8")
// Reuse the current implementation verbatim (apart from TypeScript stripping).
const method = (className, name) => {
  const start = source.indexOf(`  ${name}(`, source.indexOf(`class ${className} {`))
  const end = source.indexOf("\n  }", start) + 4
  assert(start >= 0 && end > start)
  return source.slice(start, end).replace(/: (?:bigint|number)/g, "")
}
const constants = `const BIGINT_ZERO=0n, BIGINT_ONE=1n, BIGINT_TWO=2n, BIGINT_SEVEN=7n, BIGINT_VARINT_MASK=127n, EXACT_MAGNITUDE_MAX=4503599627370495, NUMBER_VARINT_MAX_BYTES=7;
function invalid() { throw new Error("truncated payload") }
function decodeSignMagnitude(code) { const magnitude=Math.floor(code/2); return code%2===1 ? -magnitude : magnitude }`
const Writer = new Function(`${constants}; return class {
  constructor() { this.buf=new Uint8Array(8192); this.view=new DataView(this.buf.buffer); this.start=0; this.len=0 }
  ensure(n) { if (this.len+n>this.buf.length) throw new Error("overflow") }
  ${["byte", "uvarint", "uvarintBig", "zigzag", "numberVarint", "i32le", "u32le", "i64"].map(n => method("Writer", n)).join("\n")}
}`)()
const Reader = new Function(`${constants}; return class {
  constructor(buf) { this.buf=buf; this.view=new DataView(buf.buffer,buf.byteOffset,buf.byteLength); this.end=buf.length; this.pos=0 }
  ${["byte", "uvarintBig", "zigzag", "numberVarint", "i32le", "u32le", "i64"].map(n => method("Reader", n)).join("\n")}
}`)()
Writer.prototype.u64 = function(n) { this.ensure(8); this.view.setBigUint64(this.len,n,true); this.len+=8 }
Reader.prototype.u64 = function() { if(this.pos+8>this.end) throw new Error("truncated"); const n=this.view.getBigUint64(this.pos,true); this.pos+=8; return n }

let seed = 0x12345678
const random = () => seed = (Math.imul(seed,1664525)+1013904223)>>>0
const count=256
const make = (f) => Array.from({length:count},(_,i)=>f(i))
const cases = [
  ["int32 small", "numberVarint", "i32le", make(i=>(i%64)*(i%2?-1:1))],
  ["uint32 small", "numberVarint", "u32le", make(i=>i%64)],
  ["int32 full", "numberVarint", "i32le", make(()=>random()|0)],
  ["uint32 full", "numberVarint", "u32le", make(()=>random())],
  ["int64 small", "zigzag", "i64", make(i=>BigInt((i%64)*(i%2?-1:1)))],
  ["uint64 small", "zigzag", "u64", make(i=>BigInt(i%64))],
  ["int64 full", "zigzag", "i64", make(()=>BigInt.asIntN(64,(BigInt(random())<<32n)|BigInt(random())))],
  ["uint64 full", "zigzag", "u64", make(()=>(BigInt(random())<<32n)|BigInt(random()))]
]
// Check edges as well as every measured value before timing. DataView itself
// wraps out-of-range values: validation of proposed schemas is NOT measured.
const edges = { i32le:[-2147483648,-1,0,2147483647],u32le:[0,4294967295],i64:[-(1n<<63n),-1n,0n,(1n<<63n)-1n],u64:[0n,(1n<<64n)-1n] }
for (const [name,baseline,fixed,values] of cases) {
  for (const encoding of [baseline,fixed]) {
    const w=new Writer()
    const check=[...edges[fixed],...values]
    for(const value of check) w[encoding](value)
    const r=new Reader(w.buf.subarray(0,w.len))
    for(const value of check) assert.equal(r[encoding](),value,`${name} / ${encoding}`)
    assert.equal(r.pos,w.len)
  }
}
console.log("Round trips passed. 256 values/batch; three alternating-order rounds; 100ms warmup + 200ms/task/round.")
console.log("Reused buffers; no schema validation, allocation, framing, field dispatch, or row-run overhead. Size is payload only.")
const results=[]
let sink
for(const [name,baseline,fixed,values] of cases) {
  const sides=[baseline,fixed].map(encoding=>{
    const w=new Writer()
    for(const value of values) w[encoding](value)
    const bytes=w.len
    const r=new Reader(w.buf.slice(0,w.len))
    return {bytes, encode:()=>{w.len=0;for(const value of values)w[encoding](value);sink=w.len},decode:()=>{r.pos=0;for(let i=0;i<count;i++)sink=r[encoding]()}}
  })
  const measurements={}
  for(let round=0;round<3;round++){
    const bench=new Bench({time:200,warmupTime:100})
    for(const side of (round%2?[1,0]:[0,1])) for(const op of ["encode","decode"]) bench.add(`${side}-${op}`,sides[side][op])
    await bench.run()
    for(const task of bench.tasks) (measurements[task.name]??=[]).push(task.result.latency.mean*1e6/count)
  }
  const median = xs=>[...xs].sort((a,b)=>a-b)[1]
  const row={case:name,"var bytes/value":sides[0].bytes/count,"fixed bytes/value":sides[1].bytes/count}
  for(const op of ["encode","decode"]) {
    const a=measurements[`0-${op}`],b=measurements[`1-${op}`]
    row[`${op} var ns`]=+median(a).toFixed(1)
    row[`${op} fixed ns`]=+median(b).toFixed(1)
    row[`${op} speedup`]=`${(median(a)/median(b)).toFixed(2)}x`
    row[`${op} paired range`]=a.map((n,i)=>(n/b[i]).toFixed(2)).join(" / ")
  }
  results.push(row)
}
console.table(results)
console.log(JSON.stringify(results,null,2), "sink", String(sink))
