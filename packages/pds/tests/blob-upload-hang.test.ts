import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { BlobStore } from '@atproto/repo'
import { BlobTransactor } from '../src/actor-store/blob/transactor.js'
import { ActorDb } from '../src/actor-store/db/index.js'
import { BackgroundQueue } from '../src/background.js'

// `uploadBlobAndGetMetadata()` fans the upload body into four `cloneStream()`
// clones consumed under a single `Promise.all`:
//
//   putTemp · streamSize · sha256Stream · mimeTypeFromStream
//
// `cloneStream(s)` is `s.pipe(new PassThrough())`, so every clone registers its
// own 'data' listener on one shared source. Whenever a `dest.write()` returns
// false, that dest is added to the source's `awaitDrainWriters` and the source
// pauses until *every* writer in that set has drained. One stuck entry starves
// all four consumers.
//
// `mimeTypeFromStream` only peeks at the first ~4100 bytes, then used to call
// `blobStream.destroy()`. Node guards against destroying a writer the source is
// waiting on -- `pipe()`'s cleanup() re-fires `ondrain()` -- but that guard is
// conditional on `dest._writableState.needDrain`. So it misses this case:
//
//   1. the clone drains legitimately  -> needDrain=false, source running
//   2. file-type finishes and destroys the clone
//   3. before the resulting 'close' triggers unpipe(), the source writes one
//      more chunk to all four pipes; the destroyed clone errors instead of
//      buffering, so its write returns false but never sets needDrain
//   4. cleanup() runs, the guard sees needDrain=false and does nothing
//
// The destroyed clone is now stranded in `awaitDrainWriters` forever, the
// source never resumes, `Promise.all` never settles, and `uploadBlob` hangs
// with no timeout and no error.
//
// Step 1 is what makes it timing-dependent: the hang needs the clone to have
// *just* drained. A 64 KiB write against the 64 KiB default highWaterMark
// produces exactly that, and Node's HTTP layer hands up socket reads of up to
// 64 KiB. Smaller or much larger chunks leave the clone still backed up
// (needDrain=true), the guard fires, and the upload completes.

// Must stay comfortably below TEST_TIMEOUT, otherwise the runner's own timeout
// fires first and you get a bare "Exceeded timeout of Nms" instead of the
// diagnostic below. TEST_TIMEOUT is passed explicitly per-test so this holds
// regardless of which jest config the invocation picks up.
const HANG_TIMEOUT = 2_000
const TEST_TIMEOUT = 30_000
const CHUNK_SIZE = 64 * 1024 // matches Node's max HTTP socket read

const assetsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../dev-env/assets',
)
// A real JPEG: `file-type` must actually sniff a type for the peek path to run.
const jpg = fs.readFileSync(path.join(assetsDir, 'key-portrait-large.jpg'))

/** A body that pushes `chunkSize` at a time, as a fast HTTP client would. */
function makeBody(bytes: Buffer, chunkSize: number): Readable {
  let offset = 0
  return new Readable({
    read() {
      if (offset >= bytes.length) return void this.push(null)
      const end = Math.min(offset + chunkSize, bytes.length)
      this.push(bytes.subarray(offset, end))
      offset = end
    },
  })
}

/** `uploadBlobAndGetMetadata` only ever touches `blobstore.putTemp`. */
function makeTransactor(): BlobTransactor {
  const blobstore = {
    putTemp: async (bytes: Uint8Array | Readable) => {
      if (bytes instanceof Readable) {
        for await (const _chunk of bytes) {
          // drain, as a real blobstore would
        }
      }
      return 'temp-key'
    },
  } as unknown as BlobStore

  return new BlobTransactor({} as ActorDb, blobstore, {} as BackgroundQueue)
}

/**
 * Explains *why* the upload stalled, so a failure is actionable rather than a
 * bare timeout. Reads the source's internal readable state at hang time.
 */
function describeStall(source: Readable, totalBytes: number): string {
  const state = source['_readableState']
  const awaitDrain =
    state?.awaitDrainWriters?.size ?? (state?.awaitDrainWriters ? 1 : 0)
  return [
    `upload did not settle within ${HANG_TIMEOUT}ms`,
    ``,
    `  source flowing     : ${state?.flowing}`,
    `  source paused      : ${source.isPaused()}`,
    `  awaitDrainWriters  : ${awaitDrain}`,
    `  pipes remaining    : ${state?.pipes?.length}`,
    `  body size          : ${totalBytes} bytes`,
    ``,
    awaitDrain > 0 && state?.flowing === false
      ? `  => the source is paused awaiting a 'drain' from a clone that is no\n` +
        `     longer piped (see 'pipes remaining' above) -- it was destroyed\n` +
        `     rather than drained, so that 'drain' will never arrive.\n` +
        `     See transactor.ts uploadBlobAndGetMetadata / mimeTypeFromStream.`
      : `  => stalled for some other reason; inspect the consumers.`,
  ].join('\n')
}

describe('blob upload fan-out', () => {
  // CHUNK_SIZE matches the default highWaterMark, which reliably lands the
  // clone in the "just drained" state that trips the cleanup() guard.
  const cases: [string, Buffer][] = [
    ['a single ~256 KiB image', jpg],
    ['a ~1 MiB image', Buffer.concat(Array(4).fill(jpg))],
    ['a ~5 MiB image', Buffer.concat(Array(20).fill(jpg))],
  ]

  for (const [label, bytes] of cases) {
    it(
      `completes uploadBlobAndGetMetadata for ${label}`,
      async () => {
        const transactor = makeTransactor()
        const body = makeBody(bytes, CHUNK_SIZE)

        const hang = Symbol('hang')
        let timer: NodeJS.Timeout
        const result = await Promise.race([
          transactor.uploadBlobAndGetMetadata('image/jpeg', body),
          new Promise<typeof hang>((resolve) => {
            timer = setTimeout(() => resolve(hang), HANG_TIMEOUT)
          }),
        ]).finally(() => clearTimeout(timer!))

        if (result === hang) {
          throw new Error(describeStall(body, bytes.length))
        }

        expect(result.size).toBe(bytes.length)
        expect(result.mimeType).toBe('image/jpeg')
        expect(result.tempKey).toBe('temp-key')
      },
      TEST_TIMEOUT,
    )
  }

  it(
    'completes when the body arrives in small chunks (control)',
    async () => {
      // Sub-highWaterMark chunks leave the clone still backed up when the peek
      // ends, so cleanup()'s guard fires and this path never stalls -- it
      // stalled neither before the fix nor after. Kept to catch a "fix" that
      // makes the fan-out slow or lossy instead.
      const transactor = makeTransactor()
      const body = makeBody(jpg, 16 * 1024)

      const metadata = await transactor.uploadBlobAndGetMetadata(
        'image/jpeg',
        body,
      )

      expect(metadata.size).toBe(jpg.length)
      expect(metadata.mimeType).toBe('image/jpeg')
    },
    TEST_TIMEOUT,
  )
})
