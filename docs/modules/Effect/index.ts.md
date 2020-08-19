---
title: Effect/index.ts
nav_order: 13
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [Async](#async)
  - [AsyncCancel](#asynccancel)
  - [AsyncE](#asynce)
  - [AsyncR](#asyncr)
  - [AsyncRE](#asyncre)
  - [CancelMain](#cancelmain)
  - [Canceler](#canceler)
  - [Cb](#cb)
  - [DefaultEnv](#defaultenv)
  - [Effect](#effect)
  - [EffectURI](#effecturi)
  - [ExecutionStrategy](#executionstrategy)
  - [InterruptStatusRestore](#interruptstatusrestore)
  - [Parallel](#parallel)
  - [ParallelN](#paralleln)
  - [Region](#region)
  - [RegionURI](#regionuri)
  - [Runtime](#runtime)
  - [Sequential](#sequential)
  - [Sync](#sync)
  - [SyncE](#synce)
  - [SyncR](#syncr)
  - [SyncRE](#syncre)
  - [absolve](#absolve)
  - [access](#access)
  - [accessM](#accessm)
  - [accessRegion](#accessregion)
  - [accessRegionM](#accessregionm)
  - [accessService](#accessservice)
  - [accessServiceF](#accessservicef)
  - [accessServiceIn](#accessservicein)
  - [accessServiceInM](#accessserviceinm)
  - [accessServiceM](#accessservicem)
  - [accessServices](#accessservices)
  - [accessServicesM](#accessservicesm)
  - [accessServicesT](#accessservicest)
  - [accessServicesTM](#accessservicestm)
  - [ap](#ap)
  - [ap\_](#ap_)
  - [as](#as)
  - [asSomeError](#assomeerror)
  - [asUnit](#asunit)
  - [as\_](#as_)
  - [bimap](#bimap)
  - [bind](#bind)
  - [bindAll](#bindall)
  - [bindAllPar](#bindallpar)
  - [bindAllParN](#bindallparn)
  - [bracket](#bracket)
  - [bracketExit](#bracketexit)
  - [bracketExit\_](#bracketexit_)
  - [bracketFiber](#bracketfiber)
  - [bracketFiber\_](#bracketfiber_)
  - [bracket\_](#bracket_)
  - [catchAll](#catchall)
  - [catchAllCause](#catchallcause)
  - [catchAllCause\_](#catchallcause_)
  - [catchAll\_](#catchall_)
  - [cause](#cause)
  - [causeAsError](#causeaserror)
  - [chain](#chain)
  - [chain\_](#chain_)
  - [checkDescriptor](#checkdescriptor)
  - [checkInterrupt](#checkinterrupt)
  - [collectAll](#collectall)
  - [collectAllPar](#collectallpar)
  - [collectAllParN](#collectallparn)
  - [collectAllUnit](#collectallunit)
  - [collectAllUnitPar](#collectallunitpar)
  - [collectAllUnitParN](#collectallunitparn)
  - [defaultEnv](#defaultenv)
  - [delay](#delay)
  - [delay\_](#delay_)
  - [die](#die)
  - [disconnect](#disconnect)
  - [done](#done)
  - [effectAsync](#effectasync)
  - [effectAsyncInterrupt](#effectasyncinterrupt)
  - [effectAsyncOption](#effectasyncoption)
  - [effectMaybeAsyncInterrupt](#effectmaybeasyncinterrupt)
  - [effectPartial](#effectpartial)
  - [effectTotal](#effecttotal)
  - [either](#either)
  - [ensuring](#ensuring)
  - [environment](#environment)
  - [errorFromCause](#errorfromcause)
  - [fail](#fail)
  - [fiberContext](#fibercontext)
  - [fiberId](#fiberid)
  - [first](#first)
  - [flatten](#flatten)
  - [fold](#fold)
  - [foldCause](#foldcause)
  - [foldCauseM](#foldcausem)
  - [foldCauseM\_](#foldcausem_)
  - [foldCause\_](#foldcause_)
  - [foldM](#foldm)
  - [foldM\_](#foldm_)
  - [fold\_](#fold_)
  - [foreach](#foreach)
  - [foreachExec](#foreachexec)
  - [foreachExec\_](#foreachexec_)
  - [foreachPar](#foreachpar)
  - [foreachParN](#foreachparn)
  - [foreachParN\_](#foreachparn_)
  - [foreachPar\_](#foreachpar_)
  - [foreachUnit](#foreachunit)
  - [foreachUnitPar](#foreachunitpar)
  - [foreachUnitParN](#foreachunitparn)
  - [foreachUnitParN\_](#foreachunitparn_)
  - [foreachUnitPar\_](#foreachunitpar_)
  - [foreachUnit\_](#foreachunit_)
  - [foreach\_](#foreach_)
  - [forever](#forever)
  - [fork](#fork)
  - [forkDaemon](#forkdaemon)
  - [forkIn](#forkin)
  - [forkScopeWith](#forkscopewith)
  - [fromEither](#fromeither)
  - [halt](#halt)
  - [ifM](#ifm)
  - [interrupt](#interrupt)
  - [interruptAs](#interruptas)
  - [interruptStatus](#interruptstatus)
  - [interruptStatus\_](#interruptstatus_)
  - [interruptible](#interruptible)
  - [let](#let)
  - [map](#map)
  - [mapError](#maperror)
  - [mapErrorCause](#maperrorcause)
  - [mapErrorCause\_](#maperrorcause_)
  - [mapError\_](#maperror_)
  - [map\_](#map_)
  - [merge](#merge)
  - [never](#never)
  - [of](#of)
  - [onError](#onerror)
  - [onExit](#onexit)
  - [onExit\_](#onexit_)
  - [onInterrupt](#oninterrupt)
  - [onInterruptExtended\_](#oninterruptextended_)
  - [onInterrupt\_](#oninterrupt_)
  - [optional](#optional)
  - [orDie](#ordie)
  - [orDieKeep](#ordiekeep)
  - [orDieWith](#ordiewith)
  - [orDieWith\_](#ordiewith_)
  - [orElseEither](#orelseeither)
  - [orElseEither\_](#orelseeither_)
  - [orElse\_](#orelse_)
  - [parallel](#parallel)
  - [parallelN](#paralleln)
  - [provide](#provide)
  - [provideAll](#provideall)
  - [provideAll\_](#provideall_)
  - [provideService](#provideservice)
  - [provideServiceM](#provideservicem)
  - [provideSome](#providesome)
  - [provideSomeLayer](#providesomelayer)
  - [provideSomeLayer\_](#providesomelayer_)
  - [provideSome\_](#providesome_)
  - [provide\_](#provide_)
  - [race](#race)
  - [raceEither](#raceeither)
  - [raceEither\_](#raceeither_)
  - [raceFirst](#racefirst)
  - [raceWith](#racewith)
  - [race\_](#race_)
  - [readRegion](#readregion)
  - [readService](#readservice)
  - [readServiceIn](#readservicein)
  - [region](#region)
  - [repeat](#repeat)
  - [repeatOrElseEither\_](#repeatorelseeither_)
  - [repeatOrElse\_](#repeatorelse_)
  - [repeat\_](#repeat_)
  - [replaceService](#replaceservice)
  - [replaceServiceM](#replaceservicem)
  - [replaceServiceM\_](#replaceservicem_)
  - [replaceService\_](#replaceservice_)
  - [result](#result)
  - [retry](#retry)
  - [retryOrElseEither\_](#retryorelseeither_)
  - [retryOrElse\_](#retryorelse_)
  - [retry\_](#retry_)
  - [runAsync](#runasync)
  - [runAsyncAsap](#runasyncasap)
  - [runAsyncCancel](#runasynccancel)
  - [runMain](#runmain)
  - [runPromise](#runpromise)
  - [runPromiseExit](#runpromiseexit)
  - [runSync](#runsync)
  - [runSyncExit](#runsyncexit)
  - [runtime](#runtime)
  - [sequenceS](#sequences)
  - [sequenceSPar](#sequencespar)
  - [sequenceSParN](#sequencesparn)
  - [sequenceT](#sequencet)
  - [sequenceTPar](#sequencetpar)
  - [sequenceTParN](#sequencetparn)
  - [sequential](#sequential)
  - [sleep](#sleep)
  - [succeed](#succeed)
  - [summarized](#summarized)
  - [summarized\_](#summarized_)
  - [suspend](#suspend)
  - [suspendPartial](#suspendpartial)
  - [tap](#tap)
  - [tapBoth](#tapboth)
  - [tapBoth\_](#tapboth_)
  - [tapCause](#tapcause)
  - [tapCause\_](#tapcause_)
  - [tapError](#taperror)
  - [tapError\_](#taperror_)
  - [tap\_](#tap_)
  - [timed](#timed)
  - [timedWith](#timedwith)
  - [timedWith\_](#timedwith_)
  - [toManaged](#tomanaged)
  - [toPromise](#topromise)
  - [transplant](#transplant)
  - [tryOrElse\_](#tryorelse_)
  - [uncause](#uncause)
  - [uninterruptible](#uninterruptible)
  - [uninterruptibleMask](#uninterruptiblemask)
  - [unit](#unit)
  - [useRegion](#useregion)
  - [validate](#validate)
  - [validateExec](#validateexec)
  - [validateExec\_](#validateexec_)
  - [validatePar](#validatepar)
  - [validateParN](#validateparn)
  - [validateParN\_](#validateparn_)
  - [validatePar\_](#validatepar_)
  - [validate\_](#validate_)
  - [whenM](#whenm)
  - [whenM\_](#whenm_)
  - [withRuntime](#withruntime)
  - [withRuntimeM](#withruntimem)
  - [yieldNow](#yieldnow)
  - [zip](#zip)
  - [zipFirst](#zipfirst)
  - [zipFirst\_](#zipfirst_)
  - [zipPar](#zippar)
  - [zipPar\_](#zippar_)
  - [zipSecond](#zipsecond)
  - [zipSecond\_](#zipsecond_)
  - [zipWith](#zipwith)
  - [zipWithPar](#zipwithpar)
  - [zipWithPar\_](#zipwithpar_)
  - [zipWith\_](#zipwith_)
  - [zip\_](#zip_)

---

# utils

## Async

**Signature**

```ts
export declare const Async: any
```

Added in v1.0.0

## AsyncCancel

**Signature**

```ts
export declare const AsyncCancel: any
```

Added in v1.0.0

## AsyncE

**Signature**

```ts
export declare const AsyncE: any
```

Added in v1.0.0

## AsyncR

**Signature**

```ts
export declare const AsyncR: any
```

Added in v1.0.0

## AsyncRE

**Signature**

```ts
export declare const AsyncRE: any
```

Added in v1.0.0

## CancelMain

**Signature**

```ts
export declare const CancelMain: any
```

Added in v1.0.0

## Canceler

**Signature**

```ts
export declare const Canceler: any
```

Added in v1.0.0

## Cb

**Signature**

```ts
export declare const Cb: any
```

Added in v1.0.0

## DefaultEnv

**Signature**

```ts
export declare const DefaultEnv: any
```

Added in v1.0.0

## Effect

**Signature**

```ts
export declare const Effect: any
```

Added in v1.0.0

## EffectURI

**Signature**

```ts
export declare const EffectURI: any
```

Added in v1.0.0

## ExecutionStrategy

**Signature**

```ts
export declare const ExecutionStrategy: any
```

Added in v1.0.0

## InterruptStatusRestore

**Signature**

```ts
export declare const InterruptStatusRestore: any
```

Added in v1.0.0

## Parallel

**Signature**

```ts
export declare const Parallel: any
```

Added in v1.0.0

## ParallelN

**Signature**

```ts
export declare const ParallelN: any
```

Added in v1.0.0

## Region

**Signature**

```ts
export declare const Region: any
```

Added in v1.0.0

## RegionURI

**Signature**

```ts
export declare const RegionURI: any
```

Added in v1.0.0

## Runtime

**Signature**

```ts
export declare const Runtime: any
```

Added in v1.0.0

## Sequential

**Signature**

```ts
export declare const Sequential: any
```

Added in v1.0.0

## Sync

**Signature**

```ts
export declare const Sync: any
```

Added in v1.0.0

## SyncE

**Signature**

```ts
export declare const SyncE: any
```

Added in v1.0.0

## SyncR

**Signature**

```ts
export declare const SyncR: any
```

Added in v1.0.0

## SyncRE

**Signature**

```ts
export declare const SyncRE: any
```

Added in v1.0.0

## absolve

**Signature**

```ts
export declare const absolve: any
```

Added in v1.0.0

## access

**Signature**

```ts
export declare const access: any
```

Added in v1.0.0

## accessM

**Signature**

```ts
export declare const accessM: any
```

Added in v1.0.0

## accessRegion

**Signature**

```ts
export declare const accessRegion: any
```

Added in v1.0.0

## accessRegionM

**Signature**

```ts
export declare const accessRegionM: any
```

Added in v1.0.0

## accessService

**Signature**

```ts
export declare const accessService: any
```

Added in v1.0.0

## accessServiceF

**Signature**

```ts
export declare const accessServiceF: any
```

Added in v1.0.0

## accessServiceIn

**Signature**

```ts
export declare const accessServiceIn: any
```

Added in v1.0.0

## accessServiceInM

**Signature**

```ts
export declare const accessServiceInM: any
```

Added in v1.0.0

## accessServiceM

**Signature**

```ts
export declare const accessServiceM: any
```

Added in v1.0.0

## accessServices

**Signature**

```ts
export declare const accessServices: any
```

Added in v1.0.0

## accessServicesM

**Signature**

```ts
export declare const accessServicesM: any
```

Added in v1.0.0

## accessServicesT

**Signature**

```ts
export declare const accessServicesT: any
```

Added in v1.0.0

## accessServicesTM

**Signature**

```ts
export declare const accessServicesTM: any
```

Added in v1.0.0

## ap

**Signature**

```ts
export declare const ap: any
```

Added in v1.0.0

## ap\_

**Signature**

```ts
export declare const ap_: any
```

Added in v1.0.0

## as

**Signature**

```ts
export declare const as: any
```

Added in v1.0.0

## asSomeError

**Signature**

```ts
export declare const asSomeError: any
```

Added in v1.0.0

## asUnit

**Signature**

```ts
export declare const asUnit: any
```

Added in v1.0.0

## as\_

**Signature**

```ts
export declare const as_: any
```

Added in v1.0.0

## bimap

**Signature**

```ts
export declare const bimap: any
```

Added in v1.0.0

## bind

**Signature**

```ts
export declare const bind: any
```

Added in v1.0.0

## bindAll

**Signature**

```ts
export declare const bindAll: any
```

Added in v1.0.0

## bindAllPar

**Signature**

```ts
export declare const bindAllPar: any
```

Added in v1.0.0

## bindAllParN

**Signature**

```ts
export declare const bindAllParN: any
```

Added in v1.0.0

## bracket

**Signature**

```ts
export declare const bracket: any
```

Added in v1.0.0

## bracketExit

**Signature**

```ts
export declare const bracketExit: any
```

Added in v1.0.0

## bracketExit\_

**Signature**

```ts
export declare const bracketExit_: any
```

Added in v1.0.0

## bracketFiber

**Signature**

```ts
export declare const bracketFiber: any
```

Added in v1.0.0

## bracketFiber\_

**Signature**

```ts
export declare const bracketFiber_: any
```

Added in v1.0.0

## bracket\_

**Signature**

```ts
export declare const bracket_: any
```

Added in v1.0.0

## catchAll

**Signature**

```ts
export declare const catchAll: any
```

Added in v1.0.0

## catchAllCause

**Signature**

```ts
export declare const catchAllCause: any
```

Added in v1.0.0

## catchAllCause\_

**Signature**

```ts
export declare const catchAllCause_: any
```

Added in v1.0.0

## catchAll\_

**Signature**

```ts
export declare const catchAll_: any
```

Added in v1.0.0

## cause

**Signature**

```ts
export declare const cause: any
```

Added in v1.0.0

## causeAsError

**Signature**

```ts
export declare const causeAsError: any
```

Added in v1.0.0

## chain

**Signature**

```ts
export declare const chain: any
```

Added in v1.0.0

## chain\_

**Signature**

```ts
export declare const chain_: any
```

Added in v1.0.0

## checkDescriptor

**Signature**

```ts
export declare const checkDescriptor: any
```

Added in v1.0.0

## checkInterrupt

**Signature**

```ts
export declare const checkInterrupt: any
```

Added in v1.0.0

## collectAll

**Signature**

```ts
export declare const collectAll: any
```

Added in v1.0.0

## collectAllPar

**Signature**

```ts
export declare const collectAllPar: any
```

Added in v1.0.0

## collectAllParN

**Signature**

```ts
export declare const collectAllParN: any
```

Added in v1.0.0

## collectAllUnit

**Signature**

```ts
export declare const collectAllUnit: any
```

Added in v1.0.0

## collectAllUnitPar

**Signature**

```ts
export declare const collectAllUnitPar: any
```

Added in v1.0.0

## collectAllUnitParN

**Signature**

```ts
export declare const collectAllUnitParN: any
```

Added in v1.0.0

## defaultEnv

**Signature**

```ts
export declare const defaultEnv: any
```

Added in v1.0.0

## delay

**Signature**

```ts
export declare const delay: any
```

Added in v1.0.0

## delay\_

**Signature**

```ts
export declare const delay_: any
```

Added in v1.0.0

## die

**Signature**

```ts
export declare const die: any
```

Added in v1.0.0

## disconnect

**Signature**

```ts
export declare const disconnect: any
```

Added in v1.0.0

## done

**Signature**

```ts
export declare const done: any
```

Added in v1.0.0

## effectAsync

**Signature**

```ts
export declare const effectAsync: any
```

Added in v1.0.0

## effectAsyncInterrupt

**Signature**

```ts
export declare const effectAsyncInterrupt: any
```

Added in v1.0.0

## effectAsyncOption

**Signature**

```ts
export declare const effectAsyncOption: any
```

Added in v1.0.0

## effectMaybeAsyncInterrupt

**Signature**

```ts
export declare const effectMaybeAsyncInterrupt: any
```

Added in v1.0.0

## effectPartial

**Signature**

```ts
export declare const effectPartial: any
```

Added in v1.0.0

## effectTotal

**Signature**

```ts
export declare const effectTotal: any
```

Added in v1.0.0

## either

**Signature**

```ts
export declare const either: any
```

Added in v1.0.0

## ensuring

**Signature**

```ts
export declare const ensuring: any
```

Added in v1.0.0

## environment

**Signature**

```ts
export declare const environment: any
```

Added in v1.0.0

## errorFromCause

**Signature**

```ts
export declare const errorFromCause: any
```

Added in v1.0.0

## fail

**Signature**

```ts
export declare const fail: any
```

Added in v1.0.0

## fiberContext

**Signature**

```ts
export declare const fiberContext: any
```

Added in v1.0.0

## fiberId

**Signature**

```ts
export declare const fiberId: any
```

Added in v1.0.0

## first

**Signature**

```ts
export declare const first: any
```

Added in v1.0.0

## flatten

**Signature**

```ts
export declare const flatten: any
```

Added in v1.0.0

## fold

**Signature**

```ts
export declare const fold: any
```

Added in v1.0.0

## foldCause

**Signature**

```ts
export declare const foldCause: any
```

Added in v1.0.0

## foldCauseM

**Signature**

```ts
export declare const foldCauseM: any
```

Added in v1.0.0

## foldCauseM\_

**Signature**

```ts
export declare const foldCauseM_: any
```

Added in v1.0.0

## foldCause\_

**Signature**

```ts
export declare const foldCause_: any
```

Added in v1.0.0

## foldM

**Signature**

```ts
export declare const foldM: any
```

Added in v1.0.0

## foldM\_

**Signature**

```ts
export declare const foldM_: any
```

Added in v1.0.0

## fold\_

**Signature**

```ts
export declare const fold_: any
```

Added in v1.0.0

## foreach

**Signature**

```ts
export declare const foreach: any
```

Added in v1.0.0

## foreachExec

**Signature**

```ts
export declare const foreachExec: any
```

Added in v1.0.0

## foreachExec\_

**Signature**

```ts
export declare const foreachExec_: any
```

Added in v1.0.0

## foreachPar

**Signature**

```ts
export declare const foreachPar: any
```

Added in v1.0.0

## foreachParN

**Signature**

```ts
export declare const foreachParN: any
```

Added in v1.0.0

## foreachParN\_

**Signature**

```ts
export declare const foreachParN_: any
```

Added in v1.0.0

## foreachPar\_

**Signature**

```ts
export declare const foreachPar_: any
```

Added in v1.0.0

## foreachUnit

**Signature**

```ts
export declare const foreachUnit: any
```

Added in v1.0.0

## foreachUnitPar

**Signature**

```ts
export declare const foreachUnitPar: any
```

Added in v1.0.0

## foreachUnitParN

**Signature**

```ts
export declare const foreachUnitParN: any
```

Added in v1.0.0

## foreachUnitParN\_

**Signature**

```ts
export declare const foreachUnitParN_: any
```

Added in v1.0.0

## foreachUnitPar\_

**Signature**

```ts
export declare const foreachUnitPar_: any
```

Added in v1.0.0

## foreachUnit\_

**Signature**

```ts
export declare const foreachUnit_: any
```

Added in v1.0.0

## foreach\_

**Signature**

```ts
export declare const foreach_: any
```

Added in v1.0.0

## forever

**Signature**

```ts
export declare const forever: any
```

Added in v1.0.0

## fork

**Signature**

```ts
export declare const fork: any
```

Added in v1.0.0

## forkDaemon

**Signature**

```ts
export declare const forkDaemon: any
```

Added in v1.0.0

## forkIn

**Signature**

```ts
export declare const forkIn: any
```

Added in v1.0.0

## forkScopeWith

**Signature**

```ts
export declare const forkScopeWith: any
```

Added in v1.0.0

## fromEither

**Signature**

```ts
export declare const fromEither: any
```

Added in v1.0.0

## halt

**Signature**

```ts
export declare const halt: any
```

Added in v1.0.0

## ifM

**Signature**

```ts
export declare const ifM: any
```

Added in v1.0.0

## interrupt

**Signature**

```ts
export declare const interrupt: any
```

Added in v1.0.0

## interruptAs

**Signature**

```ts
export declare const interruptAs: any
```

Added in v1.0.0

## interruptStatus

**Signature**

```ts
export declare const interruptStatus: any
```

Added in v1.0.0

## interruptStatus\_

**Signature**

```ts
export declare const interruptStatus_: any
```

Added in v1.0.0

## interruptible

**Signature**

```ts
export declare const interruptible: any
```

Added in v1.0.0

## let

**Signature**

```ts
export declare const let: any
```

Added in v1.0.0

## map

**Signature**

```ts
export declare const map: any
```

Added in v1.0.0

## mapError

**Signature**

```ts
export declare const mapError: any
```

Added in v1.0.0

## mapErrorCause

**Signature**

```ts
export declare const mapErrorCause: any
```

Added in v1.0.0

## mapErrorCause\_

**Signature**

```ts
export declare const mapErrorCause_: any
```

Added in v1.0.0

## mapError\_

**Signature**

```ts
export declare const mapError_: any
```

Added in v1.0.0

## map\_

**Signature**

```ts
export declare const map_: any
```

Added in v1.0.0

## merge

**Signature**

```ts
export declare const merge: any
```

Added in v1.0.0

## never

**Signature**

```ts
export declare const never: any
```

Added in v1.0.0

## of

**Signature**

```ts
export declare const of: any
```

Added in v1.0.0

## onError

**Signature**

```ts
export declare const onError: any
```

Added in v1.0.0

## onExit

**Signature**

```ts
export declare const onExit: any
```

Added in v1.0.0

## onExit\_

**Signature**

```ts
export declare const onExit_: any
```

Added in v1.0.0

## onInterrupt

**Signature**

```ts
export declare const onInterrupt: any
```

Added in v1.0.0

## onInterruptExtended\_

**Signature**

```ts
export declare const onInterruptExtended_: any
```

Added in v1.0.0

## onInterrupt\_

**Signature**

```ts
export declare const onInterrupt_: any
```

Added in v1.0.0

## optional

**Signature**

```ts
export declare const optional: any
```

Added in v1.0.0

## orDie

**Signature**

```ts
export declare const orDie: any
```

Added in v1.0.0

## orDieKeep

**Signature**

```ts
export declare const orDieKeep: any
```

Added in v1.0.0

## orDieWith

**Signature**

```ts
export declare const orDieWith: any
```

Added in v1.0.0

## orDieWith\_

**Signature**

```ts
export declare const orDieWith_: any
```

Added in v1.0.0

## orElseEither

**Signature**

```ts
export declare const orElseEither: any
```

Added in v1.0.0

## orElseEither\_

**Signature**

```ts
export declare const orElseEither_: any
```

Added in v1.0.0

## orElse\_

**Signature**

```ts
export declare const orElse_: any
```

Added in v1.0.0

## parallel

**Signature**

```ts
export declare const parallel: any
```

Added in v1.0.0

## parallelN

**Signature**

```ts
export declare const parallelN: any
```

Added in v1.0.0

## provide

**Signature**

```ts
export declare const provide: any
```

Added in v1.0.0

## provideAll

**Signature**

```ts
export declare const provideAll: any
```

Added in v1.0.0

## provideAll\_

**Signature**

```ts
export declare const provideAll_: any
```

Added in v1.0.0

## provideService

**Signature**

```ts
export declare const provideService: any
```

Added in v1.0.0

## provideServiceM

**Signature**

```ts
export declare const provideServiceM: any
```

Added in v1.0.0

## provideSome

**Signature**

```ts
export declare const provideSome: any
```

Added in v1.0.0

## provideSomeLayer

**Signature**

```ts
export declare const provideSomeLayer: any
```

Added in v1.0.0

## provideSomeLayer\_

**Signature**

```ts
export declare const provideSomeLayer_: any
```

Added in v1.0.0

## provideSome\_

**Signature**

```ts
export declare const provideSome_: any
```

Added in v1.0.0

## provide\_

**Signature**

```ts
export declare const provide_: any
```

Added in v1.0.0

## race

**Signature**

```ts
export declare const race: any
```

Added in v1.0.0

## raceEither

**Signature**

```ts
export declare const raceEither: any
```

Added in v1.0.0

## raceEither\_

**Signature**

```ts
export declare const raceEither_: any
```

Added in v1.0.0

## raceFirst

**Signature**

```ts
export declare const raceFirst: any
```

Added in v1.0.0

## raceWith

**Signature**

```ts
export declare const raceWith: any
```

Added in v1.0.0

## race\_

**Signature**

```ts
export declare const race_: any
```

Added in v1.0.0

## readRegion

**Signature**

```ts
export declare const readRegion: any
```

Added in v1.0.0

## readService

**Signature**

```ts
export declare const readService: any
```

Added in v1.0.0

## readServiceIn

**Signature**

```ts
export declare const readServiceIn: any
```

Added in v1.0.0

## region

**Signature**

```ts
export declare const region: any
```

Added in v1.0.0

## repeat

**Signature**

```ts
export declare const repeat: any
```

Added in v1.0.0

## repeatOrElseEither\_

**Signature**

```ts
export declare const repeatOrElseEither_: any
```

Added in v1.0.0

## repeatOrElse\_

**Signature**

```ts
export declare const repeatOrElse_: any
```

Added in v1.0.0

## repeat\_

**Signature**

```ts
export declare const repeat_: any
```

Added in v1.0.0

## replaceService

**Signature**

```ts
export declare const replaceService: any
```

Added in v1.0.0

## replaceServiceM

**Signature**

```ts
export declare const replaceServiceM: any
```

Added in v1.0.0

## replaceServiceM\_

**Signature**

```ts
export declare const replaceServiceM_: any
```

Added in v1.0.0

## replaceService\_

**Signature**

```ts
export declare const replaceService_: any
```

Added in v1.0.0

## result

**Signature**

```ts
export declare const result: any
```

Added in v1.0.0

## retry

**Signature**

```ts
export declare const retry: any
```

Added in v1.0.0

## retryOrElseEither\_

**Signature**

```ts
export declare const retryOrElseEither_: any
```

Added in v1.0.0

## retryOrElse\_

**Signature**

```ts
export declare const retryOrElse_: any
```

Added in v1.0.0

## retry\_

**Signature**

```ts
export declare const retry_: any
```

Added in v1.0.0

## runAsync

**Signature**

```ts
export declare const runAsync: any
```

Added in v1.0.0

## runAsyncAsap

**Signature**

```ts
export declare const runAsyncAsap: any
```

Added in v1.0.0

## runAsyncCancel

**Signature**

```ts
export declare const runAsyncCancel: any
```

Added in v1.0.0

## runMain

**Signature**

```ts
export declare const runMain: any
```

Added in v1.0.0

## runPromise

**Signature**

```ts
export declare const runPromise: any
```

Added in v1.0.0

## runPromiseExit

**Signature**

```ts
export declare const runPromiseExit: any
```

Added in v1.0.0

## runSync

**Signature**

```ts
export declare const runSync: any
```

Added in v1.0.0

## runSyncExit

**Signature**

```ts
export declare const runSyncExit: any
```

Added in v1.0.0

## runtime

**Signature**

```ts
export declare const runtime: any
```

Added in v1.0.0

## sequenceS

**Signature**

```ts
export declare const sequenceS: any
```

Added in v1.0.0

## sequenceSPar

**Signature**

```ts
export declare const sequenceSPar: any
```

Added in v1.0.0

## sequenceSParN

**Signature**

```ts
export declare const sequenceSParN: any
```

Added in v1.0.0

## sequenceT

**Signature**

```ts
export declare const sequenceT: any
```

Added in v1.0.0

## sequenceTPar

**Signature**

```ts
export declare const sequenceTPar: any
```

Added in v1.0.0

## sequenceTParN

**Signature**

```ts
export declare const sequenceTParN: any
```

Added in v1.0.0

## sequential

**Signature**

```ts
export declare const sequential: any
```

Added in v1.0.0

## sleep

**Signature**

```ts
export declare const sleep: any
```

Added in v1.0.0

## succeed

**Signature**

```ts
export declare const succeed: any
```

Added in v1.0.0

## summarized

**Signature**

```ts
export declare const summarized: any
```

Added in v1.0.0

## summarized\_

**Signature**

```ts
export declare const summarized_: any
```

Added in v1.0.0

## suspend

**Signature**

```ts
export declare const suspend: any
```

Added in v1.0.0

## suspendPartial

**Signature**

```ts
export declare const suspendPartial: any
```

Added in v1.0.0

## tap

**Signature**

```ts
export declare const tap: any
```

Added in v1.0.0

## tapBoth

**Signature**

```ts
export declare const tapBoth: any
```

Added in v1.0.0

## tapBoth\_

**Signature**

```ts
export declare const tapBoth_: any
```

Added in v1.0.0

## tapCause

**Signature**

```ts
export declare const tapCause: any
```

Added in v1.0.0

## tapCause\_

**Signature**

```ts
export declare const tapCause_: any
```

Added in v1.0.0

## tapError

**Signature**

```ts
export declare const tapError: any
```

Added in v1.0.0

## tapError\_

**Signature**

```ts
export declare const tapError_: any
```

Added in v1.0.0

## tap\_

**Signature**

```ts
export declare const tap_: any
```

Added in v1.0.0

## timed

**Signature**

```ts
export declare const timed: any
```

Added in v1.0.0

## timedWith

**Signature**

```ts
export declare const timedWith: any
```

Added in v1.0.0

## timedWith\_

**Signature**

```ts
export declare const timedWith_: any
```

Added in v1.0.0

## toManaged

**Signature**

```ts
export declare const toManaged: any
```

Added in v1.0.0

## toPromise

**Signature**

```ts
export declare const toPromise: any
```

Added in v1.0.0

## transplant

**Signature**

```ts
export declare const transplant: any
```

Added in v1.0.0

## tryOrElse\_

**Signature**

```ts
export declare const tryOrElse_: any
```

Added in v1.0.0

## uncause

**Signature**

```ts
export declare const uncause: any
```

Added in v1.0.0

## uninterruptible

**Signature**

```ts
export declare const uninterruptible: any
```

Added in v1.0.0

## uninterruptibleMask

**Signature**

```ts
export declare const uninterruptibleMask: any
```

Added in v1.0.0

## unit

**Signature**

```ts
export declare const unit: any
```

Added in v1.0.0

## useRegion

**Signature**

```ts
export declare const useRegion: any
```

Added in v1.0.0

## validate

**Signature**

```ts
export declare const validate: any
```

Added in v1.0.0

## validateExec

**Signature**

```ts
export declare const validateExec: any
```

Added in v1.0.0

## validateExec\_

**Signature**

```ts
export declare const validateExec_: any
```

Added in v1.0.0

## validatePar

**Signature**

```ts
export declare const validatePar: any
```

Added in v1.0.0

## validateParN

**Signature**

```ts
export declare const validateParN: any
```

Added in v1.0.0

## validateParN\_

**Signature**

```ts
export declare const validateParN_: any
```

Added in v1.0.0

## validatePar\_

**Signature**

```ts
export declare const validatePar_: any
```

Added in v1.0.0

## validate\_

**Signature**

```ts
export declare const validate_: any
```

Added in v1.0.0

## whenM

**Signature**

```ts
export declare const whenM: any
```

Added in v1.0.0

## whenM\_

**Signature**

```ts
export declare const whenM_: any
```

Added in v1.0.0

## withRuntime

**Signature**

```ts
export declare const withRuntime: any
```

Added in v1.0.0

## withRuntimeM

**Signature**

```ts
export declare const withRuntimeM: any
```

Added in v1.0.0

## yieldNow

**Signature**

```ts
export declare const yieldNow: any
```

Added in v1.0.0

## zip

**Signature**

```ts
export declare const zip: any
```

Added in v1.0.0

## zipFirst

**Signature**

```ts
export declare const zipFirst: any
```

Added in v1.0.0

## zipFirst\_

**Signature**

```ts
export declare const zipFirst_: any
```

Added in v1.0.0

## zipPar

**Signature**

```ts
export declare const zipPar: any
```

Added in v1.0.0

## zipPar\_

**Signature**

```ts
export declare const zipPar_: any
```

Added in v1.0.0

## zipSecond

**Signature**

```ts
export declare const zipSecond: any
```

Added in v1.0.0

## zipSecond\_

**Signature**

```ts
export declare const zipSecond_: any
```

Added in v1.0.0

## zipWith

**Signature**

```ts
export declare const zipWith: any
```

Added in v1.0.0

## zipWithPar

**Signature**

```ts
export declare const zipWithPar: any
```

Added in v1.0.0

## zipWithPar\_

**Signature**

```ts
export declare const zipWithPar_: any
```

Added in v1.0.0

## zipWith\_

**Signature**

```ts
export declare const zipWith_: any
```

Added in v1.0.0

## zip\_

**Signature**

```ts
export declare const zip_: any
```

Added in v1.0.0
