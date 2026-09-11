#!/usr/bin/env bash
# Build and publish the app to GitHub Pages (gh-pages branch).
set -euo pipefail
cd "$(dirname "$0")/app"
npm run build
cd dist
rm -rf .git
git init -q
git checkout -qb gh-pages
touch .nojekyll
git add -A
git -c user.email="anishajbajracharya@gmail.com" -c user.name="Kritisha Chulyadya" commit -qm "deploy $(date -u +%FT%TZ)"
git push -qf https://github.com/kchulyadya01-ui/bitaran.git gh-pages:gh-pages
echo "live: https://kchulyadya01-ui.github.io/bitaran/"
