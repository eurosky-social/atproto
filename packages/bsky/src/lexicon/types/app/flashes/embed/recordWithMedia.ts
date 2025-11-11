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
import type * as AppFlashesEmbedRecord from './record.js'
import type * as AppFlashesEmbedImages from './images.js'
import type * as AppFlashesEmbedVideo from './video.js'
import type * as AppFlashesEmbedExternal from './external.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.flashes.embed.recordWithMedia'

export interface Main {
  $type?: 'app.flashes.embed.recordWithMedia'
  record: AppFlashesEmbedRecord.Main
  media:
    | $Typed<AppFlashesEmbedImages.Main>
    | $Typed<AppFlashesEmbedVideo.Main>
    | $Typed<AppFlashesEmbedExternal.Main>
    | { $type: string }
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}

export interface View {
  $type?: 'app.flashes.embed.recordWithMedia#view'
  record: AppFlashesEmbedRecord.View
  media:
    | $Typed<AppFlashesEmbedImages.View>
    | $Typed<AppFlashesEmbedVideo.View>
    | $Typed<AppFlashesEmbedExternal.View>
    | { $type: string }
}

const hashView = 'view'

export function isView<V>(v: V) {
  return is$typed(v, id, hashView)
}

export function validateView<V>(v: V) {
  return validate<View & V>(v, id, hashView)
}
