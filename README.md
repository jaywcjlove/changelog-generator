Changelog Generator
===

[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-048754?logo=buymeacoffee)](https://jaywcjlove.github.io/#/sponsor)
[![Build & Test](https://github.com/jaywcjlove/changelog-generator/actions/workflows/changelog.yml/badge.svg)](https://github.com/jaywcjlove/changelog-generator/actions/workflows/changelog.yml)
[![Repo Dependents](https://badgen.net/github/dependents-repo/jaywcjlove/changelog-generator)](https://github.com/jaywcjlove/changelog-generator/network/dependents)

This [Action](https://github.com/actions) returns a markdown formatted changelog between two git references. There are other projects that use milestones, labeled PRs, etc. Those are just to much work for simple projects.

<a target="__blank" href="https://github.com/jaywcjlove/changelog-generator/releases">
  <img src="https://user-images.githubusercontent.com/1680273/103605228-53636b80-4f4e-11eb-9fa3-c53e7358f645.png" height="320" alt="Changelog Generator" />
</a>

I just wanted a simple way to populate the body of a GitHub Release.


```yml
- run: echo "previous_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo '')" >> $GITHUB_ENV
- name: Generate changelog
  id: changelog
  uses: jaywcjlove/changelog-generator@main
  if: env.previous_tag
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    filter-author: (jaywcjlove|小弟调调™|dependabot|renovate\\[bot\\]|dependabot\\[bot\\]|Renovate Bot)
    filter: '[R|r]elease[d]\s+[v|V]\d(\.\d+){0,2}'
```

Then you can to use the resulting changelog.

```yml
- name: Get the changelog
  run: echo "${{ steps.changelog.outputs.changelog }}"

- name: Create Release
  uses: ncipollo/release-action@v1
  if: steps.create_tag.outputs.successful == 'true'
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    name: ${{ steps.create_tag.outputs.version }}
    tag: ${{ steps.create_tag.outputs.version }}
    body: |
      ${{ steps.changelog.outputs.compareurl }}

      ${{ steps.changelog.outputs.changelog }}
      
      Document Website: https://raw.githack.com/jaywcjlove/changelog-generator/${{ steps.changelog.outputs.gh-pages-short-hash }}/index.html
```

Define the log display template ([#111](https://github.com/jaywcjlove/changelog-generator/issues/111#issuecomment-1594085749)).

```yml
- name: Generate changelog
  uses: jaywcjlove/changelog-generator@main
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    filter-author: (jaywcjlove|小弟调调™|dependabot|renovate\\[bot\\]|dependabot\\[bot\\]|Renovate Bot)
    filter: '[R|r]elease[d]\s+[v|V]\d(\.\d+){0,2}'
    template: |
      ## Bugs
      {{fix}}
      ## Feature
      {{feat}}
      ## Improve
      {{refactor,perf,clean}}
      ## Misc 
      {{chore,style,ci||🔶 Nothing change}}
      ## Unknown
      {{__unknown__}}
```

Customize `type` and `emoji` icons

```yml
- name: Generate Changelog(custom-emoji test)
  uses: jaywcjlove/changelog-generator@main
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    filter-author: (小弟调调™|Renovate Bot)
    filter: '[R|r]elease[d]\s+[v|V]\d(\.\d+){0,2}'
    custom-emoji: 'type🐝,feat💄,fix🆎'
```

## GETTING STARTED

Only use the following Git Commit Messages. A simple and small footprint is critical here.

1. 🌟 `feat` Use when you add something entirely new. E.g: `feat(Button): add type props.`
2. 🐞 `fix` Use when you fix a bug — need I say more? E.g. `fix: Case conversion.`
3. 📖 `doc`/`docs` Use when you add documentation like README.md, or even inline docs. E.g. `doc(Color): API Interface.`
4. 💄 `chore` Changes to the build process or auxiliary tools. E.g. `chore(Color): API Interface.`
5. 🎨 `style` Format (changes that do not affect code execution). E.g. `style(Alert): API Interface.`
6. 🆎 `type` Typescript type bug fixes. E.g. `type(Alert): fix type error.`
7. ⛑ `test` Add and modify test cases. E.g. `test(Alert): Add test case.`
8. 🐝 `refactor` Refactoring (i.e. code changes that are not new additions or bug fixes). E.g. `refactor(Alert): API Interface.`
9. 🌍 `website` Documentation website changes. E.g. `website(Alert): Add example.`
10. 🔙 `revert` Revert last commit. E.g. `revert: Add test case.`
11. 💊 `clean` clean up. E.g. `clean: remove comment code.`
12. 📈 `perf` Change the code to improve performance. E.g. `perf(pencil): remove graphiteWidth option`
13. 💢 `ci` Continuous integration related file modification. E.g. `ci: Update workflows config.`
14. 🧯 `build` Changes that affect the build system or external dependencies (example scopes: gulp, webpack, vite, npm)

```shell
<type>(<scope>): <short summary>
  │       │             │
  │       │             └─⫸ Summary in present tense. Not capitalized. No period at the end.
  │       │
  │       └─⫸ Commit Scope: animations|bazel|benchpress|common|compiler|compiler-cli|core|
  │                          elements|forms|http|language-service|localize|platform-browser|
  │                          platform-browser-dynamic|platform-server|router|service-worker|
  │                          upgrade|zone.js|packaging|changelog|docs-infra|migrations|ngcc|ve|
  │                          devtools....
  │
  └─⫸ Commit Type: build|ci|doc|docs|feat|fix|perf|refactor|test
                    website|chore|style|type|revert
```


## Inputs

- `token` A GITHUB_TOKEN with the ability to pull from the repo in question. This is required. Why do we need `token`? Read more here: [About the GITHUB_TOKEN secret](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret). Default: `${{ github.token }}`
- `filter-author` Regular expression filtering author. Example: [`filter-author: (jaywcjlove|小弟调调™|dependabot\[bot\]|Renovate Bot)`](https://github.com/jaywcjlove/changelog-generator/blob/f48f63cdb5f3c5d8b6499c6d96e3450ee7bdb9f5/.github/workflows/changelog.yml#L17)
- `filter` Regular expression filtering changelog. Example: [`filter: '[R|r]elease[d]\s+[v|V]\d(\.\d+){0,2}'`](https://github.com/jaywcjlove/changelog-generator/blob/b372394a4e7265d4041c479b4d1f515a9c21ec37/.github/workflows/release.yml#L21)
- `head-ref` The name of the head reference. Default `${{github.sha}}`.
- `base-ref` The name of the second branch. Defaults to the `tag_name` of the latest GitHub release. *This must be a GitHub release. Git tags or branches will not work.*
- `original-markdown` Default `true`, Output clean markdown content.
- `gh-pages` Default `gh-pages`, Specify the branch name to get the hash from
- `order` Default `asc`, Should the log results be displayed in descending (desc) or ascending (asc) order
- `path` Only commits containing this file path will be returned.
- `template` Define the log display template ([#111](https://github.com/jaywcjlove/changelog-generator/issues/111#issuecomment-1594085749)).
- `show-emoji` Show emoji icons. Default `true`.
- `custom-emoji` Customize type and emoji icons. Example `type🆎,chore💄,fix🐞`.

## Outputs

- `changelog` Markdown formatted changelog.
- `compareurl` Comparing two branches to see what’s changed or to start a new pull request.
- `tag` Tag name `v1.0.0`.
- `version` The version number of the tag created. example: `1.0.0`
- `branch` Branch name.
- `gh-pages-hash` Output to the latest hash of the specified branch. example: `cc088c571f86fe222ff68f565`
- `gh-pages-short-hash` Specify the branch name to get the short-hash from. example: `cc088c5`

## Troubleshooting

#### Error not found

```
Error: Not Found
```

If you are seeing this error its likely that you do not yet have a GitHub release. You might have a git tag and that shows up in the release tab. The
API this Action uses only works with GitHub Releases. Convert one of your tags to a release and you'll be on your way. You can check out how this
repository uses this action and GitHub releases for an [example](https://github.com/jaywcjlove/changelog-generator/blob/600f36ff605c63a74a264ab324247f0c392bf7a2/.github/workflows/changelog.yml#L12-L18).

You can also set `env.previous_tag` to `""` or the previous tag if it exists, and run the step conditionally. If there is no previous tag, the step will not run:

```diff
+- run: echo "previous_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo '')" >> $GITHUB_ENV
 - name: Generate changelog
   id: changelog
   uses: jaywcjlove/changelog-generator@main
+  if: env.previous_tag
   with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

## See also

- [Create Tags From](https://github.com/jaywcjlove/create-tag-action) Auto create tags from commit or package.json.
- [Github Action Contributors](https://github.com/jaywcjlove/github-action-contributors) Github action generates dynamic image URL for contributor list to display it!
- [Create Coverage Badges](https://github.com/jaywcjlove/coverage-badges-cli) Create coverage badges from coverage reports. (no 3rd parties servers)
- [Generated Badges](https://github.com/jaywcjlove/generated-badges) Create a badge using GitHub Actions and GitHub Workflow CPU time (no 3rd parties servers)

## Acknowledgements

- [@conventional-changelog/conventional-changelog](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular#angular-convention).
- [@homeday-de/github-action-changelog-generator](https://github.com/homeday-de/github-action-changelog-generator).
- [@jessicalostinspace/commit](https://github.com/jessicalostinspace/commit-difference-action).
- [@metcalfc/changelog-generator](https://github.com/metcalfc/changelog-generator).

## Example

- [uiwjs/react-md-editor](https://github.com/uiwjs/react-md-editor/blob/e3293bca45bff08110ef5e9119d907db2ec95baa/.github/workflows/ci.yml#L30-L37)
- [uiwjs/react-code-preview](https://github.com/uiwjs/react-code-preview/blob/fb9829440a21fddbb57100db62ae113be3c01161/.github/workflows/ci.yml#L42-L50)
- [uiwjs/react-amap](https://github.com/uiwjs/react-amap/blob/550599511bdf42260580fad380c4c9741142e572/.github/workflows/ci.yml#L29-L36)
- [uiwjs/react-heat-map](https://github.com/uiwjs/react-heat-map/blob/f828826111dc6d79249fdd106648d835ae8e47ba/.github/workflows/ci.yml#L29-L36)
- [More Examples...](https://github.com/jaywcjlove/changelog-generator/network/dependents)

## Contributors

As always, thanks to our amazing contributors!

<a href="https://github.com/jaywcjlove/changelog-generator/graphs/contributors">
  <img src="https://jaywcjlove.github.io/changelog-generator/CONTRIBUTORS.svg" />
</a>

Made with [action-contributors](https://github.com/jaywcjlove/github-action-contributors).

## License

The scripts and documentation in this project are released under the [MIT License](./LICENSE)
