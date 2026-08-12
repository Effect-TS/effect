/*
 * This file incorporates declarations from kubernetes-types 1.30.0,
 * generated from the Kubernetes OpenAPI definitions.
 *
 * Source: https://github.com/silverlyra/kubernetes-types/tree/a46eb94629404af98a6758cd843b31816237d7d0
 * Modified: only the transitive closure of `Pod` is included, flattened from
 * core/v1, meta/v1 and api/resource; doc comments removed.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface AWSElasticBlockStoreVolumeSource {
  fsType?: string
  partition?: number
  readOnly?: boolean
  volumeID: string
}

export interface Affinity {
  nodeAffinity?: NodeAffinity
  podAffinity?: PodAffinity
  podAntiAffinity?: PodAntiAffinity
}

export interface AppArmorProfile {
  localhostProfile?: string
  type: string
}

export interface AzureDiskVolumeSource {
  cachingMode?: string
  diskName: string
  diskURI: string
  fsType?: string
  kind?: string
  readOnly?: boolean
}

export interface AzureFileVolumeSource {
  readOnly?: boolean
  secretName: string
  shareName: string
}

export interface CSIVolumeSource {
  driver: string
  fsType?: string
  nodePublishSecretRef?: LocalObjectReference
  readOnly?: boolean
  volumeAttributes?: {
    [name: string]: string
  }
}

export interface Capabilities {
  add?: Array<string>
  drop?: Array<string>
}

export interface CephFSVolumeSource {
  monitors: Array<string>
  path?: string
  readOnly?: boolean
  secretFile?: string
  secretRef?: LocalObjectReference
  user?: string
}

export interface CinderVolumeSource {
  fsType?: string
  readOnly?: boolean
  secretRef?: LocalObjectReference
  volumeID: string
}

export interface ClaimSource {
  resourceClaimName?: string
  resourceClaimTemplateName?: string
}

export interface ClusterTrustBundleProjection {
  labelSelector?: LabelSelector
  name?: string
  optional?: boolean
  path: string
  signerName?: string
}

export interface ConfigMapEnvSource {
  name?: string
  optional?: boolean
}

export interface ConfigMapKeySelector {
  key: string
  name?: string
  optional?: boolean
}

export interface ConfigMapProjection {
  items?: Array<KeyToPath>
  name?: string
  optional?: boolean
}

export interface ConfigMapVolumeSource {
  defaultMode?: number
  items?: Array<KeyToPath>
  name?: string
  optional?: boolean
}

export interface Container {
  args?: Array<string>
  command?: Array<string>
  env?: Array<EnvVar>
  envFrom?: Array<EnvFromSource>
  image?: string
  imagePullPolicy?: string
  lifecycle?: Lifecycle
  livenessProbe?: Probe
  name: string
  ports?: Array<ContainerPort>
  readinessProbe?: Probe
  resizePolicy?: Array<ContainerResizePolicy>
  resources?: ResourceRequirements
  restartPolicy?: string
  securityContext?: SecurityContext
  startupProbe?: Probe
  stdin?: boolean
  stdinOnce?: boolean
  terminationMessagePath?: string
  terminationMessagePolicy?: string
  tty?: boolean
  volumeDevices?: Array<VolumeDevice>
  volumeMounts?: Array<VolumeMount>
  workingDir?: string
}

export interface ContainerPort {
  containerPort: number
  hostIP?: string
  hostPort?: number
  name?: string
  protocol?: string
}

export interface ContainerResizePolicy {
  resourceName: string
  restartPolicy: string
}

export interface ContainerState {
  running?: ContainerStateRunning
  terminated?: ContainerStateTerminated
  waiting?: ContainerStateWaiting
}

export interface ContainerStateRunning {
  startedAt?: Time
}

export interface ContainerStateTerminated {
  containerID?: string
  exitCode: number
  finishedAt?: Time
  message?: string
  reason?: string
  signal?: number
  startedAt?: Time
}

export interface ContainerStateWaiting {
  message?: string
  reason?: string
}

export interface ContainerStatus {
  allocatedResources?: {
    [name: string]: Quantity
  }
  containerID?: string
  image: string
  imageID: string
  lastState?: ContainerState
  name: string
  ready: boolean
  resources?: ResourceRequirements
  restartCount: number
  started?: boolean
  state?: ContainerState
  volumeMounts?: Array<VolumeMountStatus>
}

export interface DownwardAPIProjection {
  items?: Array<DownwardAPIVolumeFile>
}

export interface DownwardAPIVolumeFile {
  fieldRef?: ObjectFieldSelector
  mode?: number
  path: string
  resourceFieldRef?: ResourceFieldSelector
}

export interface DownwardAPIVolumeSource {
  defaultMode?: number
  items?: Array<DownwardAPIVolumeFile>
}

export interface EmptyDirVolumeSource {
  medium?: string
  sizeLimit?: Quantity
}

export interface EnvFromSource {
  configMapRef?: ConfigMapEnvSource
  prefix?: string
  secretRef?: SecretEnvSource
}

export interface EnvVar {
  name: string
  value?: string
  valueFrom?: EnvVarSource
}

export interface EnvVarSource {
  configMapKeyRef?: ConfigMapKeySelector
  fieldRef?: ObjectFieldSelector
  resourceFieldRef?: ResourceFieldSelector
  secretKeyRef?: SecretKeySelector
}

export interface EphemeralContainer {
  args?: Array<string>
  command?: Array<string>
  env?: Array<EnvVar>
  envFrom?: Array<EnvFromSource>
  image?: string
  imagePullPolicy?: string
  lifecycle?: Lifecycle
  livenessProbe?: Probe
  name: string
  ports?: Array<ContainerPort>
  readinessProbe?: Probe
  resizePolicy?: Array<ContainerResizePolicy>
  resources?: ResourceRequirements
  restartPolicy?: string
  securityContext?: SecurityContext
  startupProbe?: Probe
  stdin?: boolean
  stdinOnce?: boolean
  targetContainerName?: string
  terminationMessagePath?: string
  terminationMessagePolicy?: string
  tty?: boolean
  volumeDevices?: Array<VolumeDevice>
  volumeMounts?: Array<VolumeMount>
  workingDir?: string
}

export interface EphemeralVolumeSource {
  volumeClaimTemplate?: PersistentVolumeClaimTemplate
}

export interface ExecAction {
  command?: Array<string>
}

export interface FCVolumeSource {
  fsType?: string
  lun?: number
  readOnly?: boolean
  targetWWNs?: Array<string>
  wwids?: Array<string>
}

export interface FlexVolumeSource {
  driver: string
  fsType?: string
  options?: {
    [name: string]: string
  }
  readOnly?: boolean
  secretRef?: LocalObjectReference
}

export interface FlockerVolumeSource {
  datasetName?: string
  datasetUUID?: string
}

export interface GCEPersistentDiskVolumeSource {
  fsType?: string
  partition?: number
  pdName: string
  readOnly?: boolean
}

export interface GRPCAction {
  port: number
  service?: string
}

export interface GitRepoVolumeSource {
  directory?: string
  repository: string
  revision?: string
}

export interface GlusterfsVolumeSource {
  endpoints: string
  path: string
  readOnly?: boolean
}

export interface HTTPGetAction {
  host?: string
  httpHeaders?: Array<HTTPHeader>
  path?: string
  port: number | string
  scheme?: string
}

export interface HTTPHeader {
  name: string
  value: string
}

export interface HostAlias {
  hostnames?: Array<string>
  ip?: string
}

export interface HostIP {
  ip?: string
}

export interface HostPathVolumeSource {
  path: string
  type?: string
}

export interface ISCSIVolumeSource {
  chapAuthDiscovery?: boolean
  chapAuthSession?: boolean
  fsType?: string
  initiatorName?: string
  iqn: string
  iscsiInterface?: string
  lun: number
  portals?: Array<string>
  readOnly?: boolean
  secretRef?: LocalObjectReference
  targetPortal: string
}

export interface KeyToPath {
  key: string
  mode?: number
  path: string
}

export interface Lifecycle {
  postStart?: LifecycleHandler
  preStop?: LifecycleHandler
}

export interface LifecycleHandler {
  exec?: ExecAction
  httpGet?: HTTPGetAction
  sleep?: SleepAction
  tcpSocket?: TCPSocketAction
}

export interface LocalObjectReference {
  name?: string
}

export interface NFSVolumeSource {
  path: string
  readOnly?: boolean
  server: string
}

export interface NodeAffinity {
  preferredDuringSchedulingIgnoredDuringExecution?: Array<PreferredSchedulingTerm>
  requiredDuringSchedulingIgnoredDuringExecution?: NodeSelector
}

export interface NodeSelector {
  nodeSelectorTerms: Array<NodeSelectorTerm>
}

export interface NodeSelectorRequirement {
  key: string
  operator: string
  values?: Array<string>
}

export interface NodeSelectorTerm {
  matchExpressions?: Array<NodeSelectorRequirement>
  matchFields?: Array<NodeSelectorRequirement>
}

export interface ObjectFieldSelector {
  apiVersion?: string
  fieldPath: string
}

export interface PersistentVolumeClaimSpec {
  accessModes?: Array<string>
  dataSource?: TypedLocalObjectReference
  dataSourceRef?: TypedObjectReference
  resources?: VolumeResourceRequirements
  selector?: LabelSelector
  storageClassName?: string
  volumeAttributesClassName?: string
  volumeMode?: string
  volumeName?: string
}

export interface PersistentVolumeClaimTemplate {
  metadata?: ObjectMeta
  spec: PersistentVolumeClaimSpec
}

export interface PersistentVolumeClaimVolumeSource {
  claimName: string
  readOnly?: boolean
}

export interface PhotonPersistentDiskVolumeSource {
  fsType?: string
  pdID: string
}

export interface Pod {
  apiVersion?: "v1"
  kind?: "Pod"
  metadata?: ObjectMeta
  spec?: PodSpec
  readonly status?: PodStatus
}

export interface PodAffinity {
  preferredDuringSchedulingIgnoredDuringExecution?: Array<WeightedPodAffinityTerm>
  requiredDuringSchedulingIgnoredDuringExecution?: Array<PodAffinityTerm>
}

export interface PodAffinityTerm {
  labelSelector?: LabelSelector
  matchLabelKeys?: Array<string>
  mismatchLabelKeys?: Array<string>
  namespaceSelector?: LabelSelector
  namespaces?: Array<string>
  topologyKey: string
}

export interface PodAntiAffinity {
  preferredDuringSchedulingIgnoredDuringExecution?: Array<WeightedPodAffinityTerm>
  requiredDuringSchedulingIgnoredDuringExecution?: Array<PodAffinityTerm>
}

export interface PodCondition {
  lastProbeTime?: Time
  lastTransitionTime?: Time
  message?: string
  reason?: string
  status: string
  type: string
}

export interface PodDNSConfig {
  nameservers?: Array<string>
  options?: Array<PodDNSConfigOption>
  searches?: Array<string>
}

export interface PodDNSConfigOption {
  name?: string
  value?: string
}

export interface PodIP {
  ip?: string
}

export interface PodOS {
  name: string
}

export interface PodReadinessGate {
  conditionType: string
}

export interface PodResourceClaim {
  name: string
  source?: ClaimSource
}

export interface PodResourceClaimStatus {
  name: string
  resourceClaimName?: string
}

export interface PodSchedulingGate {
  name: string
}

export interface PodSecurityContext {
  appArmorProfile?: AppArmorProfile
  fsGroup?: number
  fsGroupChangePolicy?: string
  runAsGroup?: number
  runAsNonRoot?: boolean
  runAsUser?: number
  seLinuxOptions?: SELinuxOptions
  seccompProfile?: SeccompProfile
  supplementalGroups?: Array<number>
  sysctls?: Array<Sysctl>
  windowsOptions?: WindowsSecurityContextOptions
}

export interface PodSpec {
  activeDeadlineSeconds?: number
  affinity?: Affinity
  automountServiceAccountToken?: boolean
  containers: Array<Container>
  dnsConfig?: PodDNSConfig
  dnsPolicy?: string
  enableServiceLinks?: boolean
  ephemeralContainers?: Array<EphemeralContainer>
  hostAliases?: Array<HostAlias>
  hostIPC?: boolean
  hostNetwork?: boolean
  hostPID?: boolean
  hostUsers?: boolean
  hostname?: string
  imagePullSecrets?: Array<LocalObjectReference>
  initContainers?: Array<Container>
  nodeName?: string
  nodeSelector?: {
    [name: string]: string
  }
  os?: PodOS
  overhead?: {
    [name: string]: Quantity
  }
  preemptionPolicy?: string
  priority?: number
  priorityClassName?: string
  readinessGates?: Array<PodReadinessGate>
  resourceClaims?: Array<PodResourceClaim>
  restartPolicy?: string
  runtimeClassName?: string
  schedulerName?: string
  schedulingGates?: Array<PodSchedulingGate>
  securityContext?: PodSecurityContext
  serviceAccount?: string
  serviceAccountName?: string
  setHostnameAsFQDN?: boolean
  shareProcessNamespace?: boolean
  subdomain?: string
  terminationGracePeriodSeconds?: number
  tolerations?: Array<Toleration>
  topologySpreadConstraints?: Array<TopologySpreadConstraint>
  volumes?: Array<Volume>
}

export interface PodStatus {
  conditions?: Array<PodCondition>
  containerStatuses?: Array<ContainerStatus>
  ephemeralContainerStatuses?: Array<ContainerStatus>
  hostIP?: string
  hostIPs?: Array<HostIP>
  initContainerStatuses?: Array<ContainerStatus>
  message?: string
  nominatedNodeName?: string
  phase?: string
  podIP?: string
  podIPs?: Array<PodIP>
  qosClass?: string
  reason?: string
  resize?: string
  resourceClaimStatuses?: Array<PodResourceClaimStatus>
  startTime?: Time
}

export interface PortworxVolumeSource {
  fsType?: string
  readOnly?: boolean
  volumeID: string
}

export interface PreferredSchedulingTerm {
  preference: NodeSelectorTerm
  weight: number
}

export interface Probe {
  exec?: ExecAction
  failureThreshold?: number
  grpc?: GRPCAction
  httpGet?: HTTPGetAction
  initialDelaySeconds?: number
  periodSeconds?: number
  successThreshold?: number
  tcpSocket?: TCPSocketAction
  terminationGracePeriodSeconds?: number
  timeoutSeconds?: number
}

export interface ProjectedVolumeSource {
  defaultMode?: number
  sources?: Array<VolumeProjection>
}

export interface QuobyteVolumeSource {
  group?: string
  readOnly?: boolean
  registry: string
  tenant?: string
  user?: string
  volume: string
}

export interface RBDVolumeSource {
  fsType?: string
  image: string
  keyring?: string
  monitors: Array<string>
  pool?: string
  readOnly?: boolean
  secretRef?: LocalObjectReference
  user?: string
}

export interface ResourceClaim {
  name: string
}

export interface ResourceFieldSelector {
  containerName?: string
  divisor?: Quantity
  resource: string
}

export interface ResourceRequirements {
  claims?: Array<ResourceClaim>
  limits?: {
    [name: string]: Quantity
  }
  requests?: {
    [name: string]: Quantity
  }
}

export interface SELinuxOptions {
  level?: string
  role?: string
  type?: string
  user?: string
}

export interface ScaleIOVolumeSource {
  fsType?: string
  gateway: string
  protectionDomain?: string
  readOnly?: boolean
  secretRef: LocalObjectReference
  sslEnabled?: boolean
  storageMode?: string
  storagePool?: string
  system: string
  volumeName?: string
}

export interface SeccompProfile {
  localhostProfile?: string
  type: string
}

export interface SecretEnvSource {
  name?: string
  optional?: boolean
}

export interface SecretKeySelector {
  key: string
  name?: string
  optional?: boolean
}

export interface SecretProjection {
  items?: Array<KeyToPath>
  name?: string
  optional?: boolean
}

export interface SecretVolumeSource {
  defaultMode?: number
  items?: Array<KeyToPath>
  optional?: boolean
  secretName?: string
}

export interface SecurityContext {
  allowPrivilegeEscalation?: boolean
  appArmorProfile?: AppArmorProfile
  capabilities?: Capabilities
  privileged?: boolean
  procMount?: string
  readOnlyRootFilesystem?: boolean
  runAsGroup?: number
  runAsNonRoot?: boolean
  runAsUser?: number
  seLinuxOptions?: SELinuxOptions
  seccompProfile?: SeccompProfile
  windowsOptions?: WindowsSecurityContextOptions
}

export interface ServiceAccountTokenProjection {
  audience?: string
  expirationSeconds?: number
  path: string
}

export interface SleepAction {
  seconds: number
}

export interface StorageOSVolumeSource {
  fsType?: string
  readOnly?: boolean
  secretRef?: LocalObjectReference
  volumeName?: string
  volumeNamespace?: string
}

export interface Sysctl {
  name: string
  value: string
}

export interface TCPSocketAction {
  host?: string
  port: number | string
}

export interface Toleration {
  effect?: string
  key?: string
  operator?: string
  tolerationSeconds?: number
  value?: string
}

export interface TopologySpreadConstraint {
  labelSelector?: LabelSelector
  matchLabelKeys?: Array<string>
  maxSkew: number
  minDomains?: number
  nodeAffinityPolicy?: string
  nodeTaintsPolicy?: string
  topologyKey: string
  whenUnsatisfiable: string
}

export interface TypedLocalObjectReference {
  apiGroup?: string
  kind: string
  name: string
}

export interface TypedObjectReference {
  apiGroup?: string
  kind: string
  name: string
  namespace?: string
}

export interface Volume {
  awsElasticBlockStore?: AWSElasticBlockStoreVolumeSource
  azureDisk?: AzureDiskVolumeSource
  azureFile?: AzureFileVolumeSource
  cephfs?: CephFSVolumeSource
  cinder?: CinderVolumeSource
  configMap?: ConfigMapVolumeSource
  csi?: CSIVolumeSource
  downwardAPI?: DownwardAPIVolumeSource
  emptyDir?: EmptyDirVolumeSource
  ephemeral?: EphemeralVolumeSource
  fc?: FCVolumeSource
  flexVolume?: FlexVolumeSource
  flocker?: FlockerVolumeSource
  gcePersistentDisk?: GCEPersistentDiskVolumeSource
  gitRepo?: GitRepoVolumeSource
  glusterfs?: GlusterfsVolumeSource
  hostPath?: HostPathVolumeSource
  iscsi?: ISCSIVolumeSource
  name: string
  nfs?: NFSVolumeSource
  persistentVolumeClaim?: PersistentVolumeClaimVolumeSource
  photonPersistentDisk?: PhotonPersistentDiskVolumeSource
  portworxVolume?: PortworxVolumeSource
  projected?: ProjectedVolumeSource
  quobyte?: QuobyteVolumeSource
  rbd?: RBDVolumeSource
  scaleIO?: ScaleIOVolumeSource
  secret?: SecretVolumeSource
  storageos?: StorageOSVolumeSource
  vsphereVolume?: VsphereVirtualDiskVolumeSource
}

export interface VolumeDevice {
  devicePath: string
  name: string
}

export interface VolumeMount {
  mountPath: string
  mountPropagation?: string
  name: string
  readOnly?: boolean
  recursiveReadOnly?: string
  subPath?: string
  subPathExpr?: string
}

export interface VolumeMountStatus {
  mountPath: string
  name: string
  readOnly?: boolean
  recursiveReadOnly?: string
}

export interface VolumeProjection {
  clusterTrustBundle?: ClusterTrustBundleProjection
  configMap?: ConfigMapProjection
  downwardAPI?: DownwardAPIProjection
  secret?: SecretProjection
  serviceAccountToken?: ServiceAccountTokenProjection
}

export interface VolumeResourceRequirements {
  limits?: {
    [name: string]: Quantity
  }
  requests?: {
    [name: string]: Quantity
  }
}

export interface VsphereVirtualDiskVolumeSource {
  fsType?: string
  storagePolicyID?: string
  storagePolicyName?: string
  volumePath: string
}

export interface WeightedPodAffinityTerm {
  podAffinityTerm: PodAffinityTerm
  weight: number
}

export interface WindowsSecurityContextOptions {
  gmsaCredentialSpec?: string
  gmsaCredentialSpecName?: string
  hostProcess?: boolean
  runAsUserName?: string
}

export interface FieldsV1 {
}

export interface LabelSelector {
  matchExpressions?: Array<LabelSelectorRequirement>
  matchLabels?: {
    [name: string]: string
  }
}

export interface LabelSelectorRequirement {
  key: string
  operator: string
  values?: Array<string>
}

export interface ManagedFieldsEntry {
  apiVersion?: string
  fieldsType?: string
  fieldsV1?: FieldsV1
  manager?: string
  operation?: string
  subresource?: string
  time?: Time
}

export interface ObjectMeta {
  annotations?: {
    [name: string]: string
  }
  readonly creationTimestamp?: Time
  readonly deletionGracePeriodSeconds?: number
  readonly deletionTimestamp?: Time
  finalizers?: Array<string>
  generateName?: string
  readonly generation?: number
  labels?: {
    [name: string]: string
  }
  managedFields?: Array<ManagedFieldsEntry>
  name?: string
  namespace?: string
  ownerReferences?: Array<OwnerReference>
  readonly resourceVersion?: string
  selfLink?: string
  readonly uid?: string
}

export interface OwnerReference {
  apiVersion: string
  blockOwnerDeletion?: boolean
  controller?: boolean
  kind: string
  name: string
  uid: string
}

export type Time = string

export type Quantity = string
