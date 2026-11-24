#!/usr/bin/env bash
# Run against a committed tree; Docker exercises the actual allowlist and gitsha stage.
set -euo pipefail
root=$(git rev-parse --show-toplevel)
sha=$(git rev-parse HEAD)
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT

branch=$(git -C "$root" branch --show-current)
if [[ -n "$branch" ]]; then
  git clone -q --depth 1 --branch "$branch" "file://$root" "$scratch/checkout"
else
  # checkout@v4 leaves a detached PR merge commit on the Actions runner.
  git init -q "$scratch/checkout"
  git -C "$scratch/checkout" fetch -q --depth 1 "file://$root" "$sha"
  git -C "$scratch/checkout" checkout -q --detach FETCH_HEAD
fi
test "$(git -C "$scratch/checkout" rev-parse HEAD)" = "$sha"
mkdir "$scratch/archive"
git -C "$root" archive "$sha" | tar -x -C "$scratch/archive"
cp -R "$scratch/archive" "$scratch/plain"
git -C "$root" show "$sha:.source-revision" > "$scratch/plain/.source-revision"

check_image() {
  local context=$1
  shift
  local image
  image=$(docker build -q --target gitsha "$@" "$context")
  test "$(docker run --rm --entrypoint cat "$image" /git-sha)" = "${sha:0:12}"
}
refuse_build() {
  local reason=$1
  shift
  if docker build --progress=plain --target gitsha "$@" > "$scratch/refusal.log" 2>&1; then
    echo "Expected build refusal: $reason" >&2
    exit 1
  fi
  grep -Eq "^#[0-9]+ [0-9.]+ ${reason}" "$scratch/refusal.log"
}

check_image "$scratch/checkout"
check_image "$scratch/archive"
check_image "$scratch/plain" --build-arg "BUILD_REVISION=$sha"
refuse_build 'Missing valid source revision' "$scratch/plain"
refuse_build 'Conflicting source revisions' --build-arg "BUILD_REVISION=${sha:0:12}" "$scratch/archive"
echo 'Passed checkout, archive, verified build argument, missing and conflicting revision checks.'
