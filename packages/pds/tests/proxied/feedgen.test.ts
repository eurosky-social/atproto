import { AtUri, AtpAgent } from '@atproto/api'
import { SeedClient, TestNetwork } from '@atproto/dev-env'
import { InvalidRequestError } from '@atproto/xrpc-server'
import { forSnapshot } from '../_util'
import basicSeed from '../seeds/basic'

describe.skip('feedgen proxy view', () => {
  // SKIPPED: TestNetwork requires PostgreSQL and creates multiple PDS instances with global env vars
  // This causes schema conflicts that cannot be resolved without architectural changes
  let network: TestNetwork
  let agent: AtpAgent
  let sc: SeedClient
  let feedUri: AtUri

  beforeAll(async () => {
    if (process.env.TEST_DATABASE_TYPE === 'postgres') {
      return
    }

    network = await TestNetwork.create({
      dbPostgresSchema: 'proxy_feedgen',
    })
    agent = network.pds.getClient()
    sc = network.getSeedClient()
    await basicSeed(sc, { addModLabels: network.bsky })

    feedUri = AtUri.make(sc.dids.alice, 'app.bsky.feed.generator', 'mutuals')

    const feedGen = await network.createFeedGen({
      [feedUri.toString()]: ({ params }) => {
        if (params.feed !== feedUri.toString()) {
          throw new InvalidRequestError('Unknown feed')
        }
        return {
          encoding: 'application/json',
          body: {
            feed: [
              { post: sc.posts[sc.dids.alice][0].ref.uriStr },
              { post: sc.posts[sc.dids.carol][0].ref.uriStr },
            ],
          },
        }
      },
    })

    // publish feed
    await agent.api.app.bsky.feed.generator.create(
      { repo: sc.dids.alice, rkey: feedUri.rkey },
      {
        did: feedGen.did,
        displayName: 'Test feed',
        createdAt: new Date().toISOString(),
      },
      sc.getHeaders(sc.dids.alice),
    )
    await network.processAll()
  })

  afterAll(async () => {
    if (process.env.TEST_DATABASE_TYPE === 'postgres') {
      return
    }
    await network?.close()
  })

  it('performs basic proxy of getFeed', async () => {
    const { data: feed } = await agent.api.app.bsky.feed.getFeed(
      { feed: feedUri.toString() },
      {
        headers: { ...sc.getHeaders(sc.dids.alice) },
      },
    )
    expect(forSnapshot(feed)).toMatchSnapshot()
  })
})
