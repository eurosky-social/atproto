# Eurosky fork

This is Eurosky's fork of [bluesky-social/atproto](https://github.com/bluesky-social/atproto). We track upstream closely and keep our own changes small.

## Branches

- **`eurosky`** (default): upstream plus our changes. Work here: branch off it and open PRs into it.
- **`main`**: an exact mirror of `upstream/main`. Never commit to it; [sync-upstream.yaml](.github/workflows/sync-upstream.yaml) fast-forwards it.

Merge methods:

- **Our PRs:** squash, so each change lands as a single commit that can be reverted on its own.
- **Sync PRs** (`sync/upstream-*`): **Create a merge commit**. Never squash or rebase them: that drops the upstream ancestry, and the next sync conflicts on everything.

## Syncing with upstream

Every Monday the sync workflow fast-forwards `main`, merges it into a `sync/upstream-<date>` branch cut from `eurosky`, and opens a PR. You can also run it by hand from the Actions tab.

If the merge conflicts, the workflow fails and lists the files. Resolve it locally:

```bash
git fetch upstream origin
git switch -c sync/upstream-$(date +%F) origin/eurosky
git merge upstream/main
# resolve, then: pnpm install && pnpm build && pnpm verify
git push -u origin HEAD   # open a PR into eurosky, merge with a merge commit
```

`pnpm-lock.yaml` conflicts: we add no dependencies, so take upstream's version (`git checkout --theirs pnpm-lock.yaml`) and run `pnpm install`.

Turn on `git config rerere.enabled true` so git reuses your previous conflict resolutions.

## When upstream covers one of our changes

Revert ours on the sync branch **before** merging upstream, and name what replaced it:

```bash
git switch -c sync/upstream-$(date +%F) origin/eurosky
git revert <commit>   # "Drop <change>: superseded by bluesky-social/atproto#NNNN"
git merge upstream/main
```

Then update the table below. If upstream took our change as-is (we sent it upstream), the merge absorbs it and there's nothing to do.

To see what still differs from upstream:

```bash
git diff --stat main...eurosky                                              # what's different
git log --oneline --no-merges --right-only --cherry-mark main...eurosky     # = already upstream, + ours only
git log --first-parent --oneline eurosky                                    # our PRs and syncs only
```

## Our changes

| Change                                                                                                                         | Commit           | Files                                                                                                | Status                       |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------- |
| Configurable uploadBlob rate limit (`PDS_RATE_LIMIT_REPO_UPLOAD_BLOB_TIME_DURATION`, `PDS_RATE_LIMIT_REPO_UPLOAD_BLOB_POINTS`) | `8046afd8d`      | `packages/pds/src/{api/com/atproto/repo/uploadBlob,config/config,config/env}.ts`                     | Ours only; could go upstream |
| Zeppelin AppView variant (`eurosky` Docker stage)                                                                              | `71521774a`      | `services/bsky/api-zeppelin.ts`, `services/bsky/Dockerfile`, `build-and-push-eurosky-zeppelin.yaml`  | Ours only                    |
| `make signing-key` helper                                                                                                      | `6f6478eb7`      | `Makefile`                                                                                           | Ours only                    |
| Eurosky PDS image build                                                                                                        | `0c6a0412b`      | `build-and-push-eurosky-pds.yaml`                                                                    | Ours only                    |
| Fork CI: upstream sync, ozone image build on the fork, changeset check skipped, image builds triggered from `eurosky`          | `d6dc37ef4`, #20 | `sync-upstream.yaml`, `build-and-push-ozone-ghcr.yaml`, `repo.yaml`, `build-and-push-eurosky-*.yaml` | Ours only                    |
