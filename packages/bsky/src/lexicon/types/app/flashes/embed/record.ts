/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util'
import type * as ComAtprotoRepoStrongRef from '../../../com/atproto/repo/strongRef.js'
import type * as AppFlashesFeedDefs from '../feed/defs.js'
import type * as AppFlashesGraphDefs from '../graph/defs.js'
import type * as AppFlashesLabelerDefs from '../labeler/defs.js'
import type * as AppFlashesActorDefs from '../actor/defs.js'
import type * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs.js'
import type * as AppFlashesEmbedImages from './images.js'
import type * as AppFlashesEmbedVideo from './video.js'
import type * as AppFlashesEmbedExternal from './external.js'
import type * as AppFlashesEmbedRecordWithMedia from './recordWithMedia.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.flashes.embed.record'

export interface Main {
  $type?: 'app.flashes.embed.record'
  record: ComAtprotoRepoStrongRef.Main
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}

export interface View {
  $type?: 'app.flashes.embed.record#view'
  record:
    | $Typed<ViewRecord>
    | $Typed<ViewNotFound>
    | $Typed<ViewBlocked>
    | $Typed<ViewDetached>
    | $Typed<AppFlashesFeedDefs.GeneratorView>
    | $Typed<AppFlashesGraphDefs.ListView>
    | $Typed<AppFlashesLabelerDefs.LabelerView>
    | $Typed<AppFlashesGraphDefs.StarterPackViewBasic>
    | { $type: string }
}

const hashView = 'view'

export function isView<V>(v: V) {
  return is$typed(v, id, hashView)
}

export function validateView<V>(v: V) {
  return validate<View & V>(v, id, hashView)
}

export interface ViewRecord {
  $type?: 'app.flashes.embed.record#viewRecord'
  uri: string
  cid: string
  author: AppFlashesActorDefs.ProfileViewBasic
  /** The record data itself. */
  value: { [_ in string]: unknown }
  labels?: ComAtprotoLabelDefs.Label[]
  replyCount?: number
  repostCount?: number
  likeCount?: number
  quoteCount?: number
  embeds?: (
    | $Typed<AppFlashesEmbedImages.View>
    | $Typed<AppFlashesEmbedVideo.View>
    | $Typed<AppFlashesEmbedExternal.View>
    | $Typed<View>
    | $Typed<AppFlashesEmbedRecordWithMedia.View>
    | { $type: string }
  )[]
  indexedAt: string
}

const hashViewRecord = 'viewRecord'

export function isViewRecord<V>(v: V) {
  return is$typed(v, id, hashViewRecord)
}

export function validateViewRecord<V>(v: V) {
  return validate<ViewRecord & V>(v, id, hashViewRecord)
}

export interface ViewNotFound {
  $type?: 'app.flashes.embed.record#viewNotFound'
  uri: string
  notFound: true
}

const hashViewNotFound = 'viewNotFound'

export function isViewNotFound<V>(v: V) {
  return is$typed(v, id, hashViewNotFound)
}

export function validateViewNotFound<V>(v: V) {
  return validate<ViewNotFound & V>(v, id, hashViewNotFound)
}

export interface ViewBlocked {
  $type?: 'app.flashes.embed.record#viewBlocked'
  uri: string
  blocked: true
  author: AppFlashesFeedDefs.BlockedAuthor
}

const hashViewBlocked = 'viewBlocked'

export function isViewBlocked<V>(v: V) {
  return is$typed(v, id, hashViewBlocked)
}

export function validateViewBlocked<V>(v: V) {
  return validate<ViewBlocked & V>(v, id, hashViewBlocked)
}

export interface ViewDetached {
  $type?: 'app.flashes.embed.record#viewDetached'
  uri: string
  detached: true
}

const hashViewDetached = 'viewDetached'

export function isViewDetached<V>(v: V) {
  return is$typed(v, id, hashViewDetached)
}

export function validateViewDetached<V>(v: V) {
  return validate<ViewDetached & V>(v, id, hashViewDetached)
}
