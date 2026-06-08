# Storage Layout (file-first)

## Directories
- `content/posts/` canonical post markdown source.
- `content/storyboards/` optional manual storyboard source.
- `content/tracker/index.json` normalized state for web UI and API.
- `content/runs/<post-id>/<timestamp>.json` immutable generation run logs.
- `content/artifacts/<post-id>/` generated draft outputs by step/version.

## Contracts
- `apps/post-ops-ui/src/contracts/post-record.schema.json`
- `apps/post-ops-ui/src/contracts/generation-run.schema.json`
- `apps/post-ops-ui/src/contracts/artifact-ref.schema.json`

## Side effects
- Generation creates a new run file on every execution.
- Generation never overwrites prior run logs.
- Artifact writes are versioned by run ID.

## Retry / rollback
- Retry: re-run the same step to produce a new run ID and new artifacts.
- Rollback: pick an older artifact version and re-link it in `content/tracker/index.json`.
