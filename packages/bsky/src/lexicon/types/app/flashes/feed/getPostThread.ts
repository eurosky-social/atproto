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
import type * as AppFlashesFeedDefs from './defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.flashes.feed.getPostThread'

export type QueryParams = {
  /** Reference (AT-URI) to post record. */
  uri: string
  /** How many levels of reply depth should be included in response. */
  depth: number
  /** How many levels of parent (and grandparent, etc) post to include. */
  parentHeight: number
}
export type InputSchema = undefined

export interface OutputSchema {
  thread:
    | $Typed<AppFlashesFeedDefs.ThreadViewPost>
    | $Typed<AppFlashesFeedDefs.NotFoundPost>
    | $Typed<AppFlashesFeedDefs.BlockedPost>
    | { $type: string }
  threadgate?: AppFlashesFeedDefs.ThreadgateView
}

export type HandlerInput = void

export interface HandlerSuccess {
  encoding: 'application/json'
  body: OutputSchema
  headers?: { [key: string]: string }
}

export interface HandlerError {
  status: number
  message?: string
  error?: 'NotFound'
}

export type HandlerOutput = HandlerError | HandlerSuccess
