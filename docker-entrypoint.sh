#!/bin/sh
set -e

cd /app

mkdir -p content/posts content/storyboards content/runs content/artifacts content/tracker
mkdir -p apps/helloiam-remotion/public/generated

if [ ! -f content/tracker/07_LAUNCH_TRACKER.md ]; then
  printf '%s\n' '# Launch Tracker' > content/tracker/07_LAUNCH_TRACKER.md
fi

npm run index

exec node apps/post-ops-ui/src/server.js
