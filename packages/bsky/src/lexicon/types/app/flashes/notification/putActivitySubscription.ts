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
const id = 'app.flashes.notification.putActivitySubscription'

export type QueryParams = {}

export interface InputSchema {
  subject: string
  activitySubscription: AppFlashesNotificationDefs.ActivitySubscription
}

export interface OutputSchema {
  subject: string
  activitySubscription?: AppFlashesNotificationDefs.ActivitySubscription
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
