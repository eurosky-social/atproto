import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AtpAgent } from '@atproto/api'
import { type SeedClient, TestNetworkNoAppView } from '@atproto/dev-env'
import {
  compileHandleBlocklist,
  parseHandleBlocklist,
} from '../src/handle/blocklist.js'

describe('handle blocklist', () => {
  describe('parsing and matching', () => {
    const isBlocked = compileHandleBlocklist(
      parseHandleBlocklist(
        [
          '# comment',
          '',
          '  anal  ',
          'Big Cock',
          '2 girls 1 cup',
          '*nazi*',
          'musk*',
          '**hitler',
        ].join('\n'),
      ),
    )

    it('matches exact entries on the whole label only', () => {
      expect(isBlocked('anal')).toBe(true)
      expect(isBlocked('analyst')).toBe(false)
      expect(isBlocked('banal')).toBe(false)
    })

    it('ignores case and separators', () => {
      expect(isBlocked('bigcock')).toBe(true)
      expect(isBlocked('big-cock')).toBe(true)
      expect(isBlocked('2girls1cup')).toBe(true)
      expect(isBlocked('2-girls-1-cup')).toBe(true)
    })

    it('matches wildcard entries', () => {
      expect(isBlocked('nazi')).toBe(true)
      expect(isBlocked('i-love-nazis')).toBe(true)
      expect(isBlocked('muskfan')).toBe(true)
      expect(isBlocked('elonmusk')).toBe(false)
      expect(isBlocked('adolfhitler')).toBe(true)
      expect(isBlocked('hitlerfan')).toBe(false)
    })

    it('matches nothing when empty', () => {
      expect(compileHandleBlocklist([])('anything')).toBe(false)
    })

    it('rejects entries that cannot match a handle', () => {
      expect(() => parseHandleBlocklist('ok\n***')).toThrow('line 2')
      expect(() => parseHandleBlocklist('ok\n\nbad!word')).toThrow('line 3')
      expect(() => parseHandleBlocklist('café')).toThrow('line 1')
    })
  })

  describe('account handles', () => {
    let dir: string
    let network: TestNetworkNoAppView
    let agent: AtpAgent
    let sc: SeedClient

    beforeAll(async () => {
      dir = await mkdtemp(join(tmpdir(), 'pds-handle-blocklist-'))
      const handleBlocklistFile = join(dir, 'blocklist.txt')
      await writeFile(handleBlocklistFile, 'bigcock\n*nazi*\n')
      network = await TestNetworkNoAppView.create({
        pds: { handleBlocklistFile },
      })
      agent = network.pds.getAgent()
      sc = network.getSeedClient()
      await sc.createAccount('alice', {
        email: 'alice@test.com',
        handle: 'alice.test',
        password: 'alice-pass',
      })
    })

    afterAll(async () => {
      await network?.close()
      if (dir) await rm(dir, { recursive: true, force: true })
    })

    const reserved = { error: 'HandleNotAvailable', message: 'Reserved handle' }

    it('refuses blocked handles on account creation', async () => {
      for (const handle of ['big-cock.test', 'thenazi.test']) {
        await expect(
          agent.com.atproto.server.createAccount({
            email: `${handle}@test.com`,
            handle,
            password: 'password',
          }),
        ).rejects.toMatchObject(reserved)
      }
    })

    it('refuses blocked handles on handle update', async () => {
      await expect(
        agent.com.atproto.identity.updateHandle(
          { handle: 'bigcock.test' },
          {
            headers: sc.getHeaders(sc.dids.alice),
            encoding: 'application/json',
          },
        ),
      ).rejects.toMatchObject(reserved)
    })

    it('allows other handles', async () => {
      await agent.com.atproto.server.createAccount({
        email: 'bigcockatoo@test.com',
        handle: 'bigcockatoo.test',
        password: 'password',
      })
    })

    it('lets admins override', async () => {
      await agent.com.atproto.admin.updateAccountHandle(
        { did: sc.dids.alice, handle: 'bigcock.test' },
        {
          headers: network.pds.adminAuthHeaders(),
          encoding: 'application/json',
        },
      )
    })
  })
})
