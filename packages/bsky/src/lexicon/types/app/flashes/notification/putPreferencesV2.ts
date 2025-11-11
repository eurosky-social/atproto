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
import type * as AppFlashesNotificationDefs from './defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.flashes.notification.putPreferencesV2'

export type QueryParams = {}

export interface InputSchema {
  chat?: AppFlashesNotificationDefs.ChatPreference
  follow?: AppFlashesNotificationDefs.FilterablePreference
  like?: AppFlashesNotificationDefs.FilterablePreference
  likeViaRepost?: AppFlashesNotificationDefs.FilterablePreference
  mention?: AppFlashesNotificationDefs.FilterablePreference
  quote?: AppFlashesNotificationDefs.FilterablePreference
  reply?: AppFlashesNotificationDefs.FilterablePreference
  repost?: AppFlashesNotificationDefs.FilterablePreference
  repostViaRepost?: AppFlashesNotificationDefs.FilterablePreference
  starterpackJoined?: AppFlashesNotificationDefs.Preference
  subscribedPost?: AppFlashesNotificationDefs.Preference
  unverified?: AppFlashesNotificationDefs.Preference
  verified?: AppFlashesNotificationDefs.Preference
}

export interface OutputSchema {
  preferences: AppFlashesNotificationDefs.Preferences
}

export interface HandlerInput {
  encoding: 'application/json'
  body: InputSchema
}

export interface HandlerSuccess {
  encoding: 'application/json'
  body: OutputSchema
  headers?: { [key: string]: string }
}

export interface HandlerError {
  status: number
  message?: string
}

export type HandlerOutput = HandlerError | HandlerSuccess
