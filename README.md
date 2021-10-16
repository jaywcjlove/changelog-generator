changelog-generator
----

[![Build & Test](https://github.com/jaywcjlove/changelog-generator/actions/workflows/changelog.yml/badge.svg)](https://github.com/jaywcjlove/changelog-generator/actions/workflows/changelog.yml)

This [Action](https://github.com/actions) returns a markdown formatted changelog between two git references. There are other projects that use milestones, labeled PRs, etc. Those are just to much work for simple projects.

<a target="__blank" href="https://github.com/jaywcjlove/changelog-generator/releases">
  <img src="https://user-images.githubusercontent.com/1680273/103605228-53636b80-4f4e-11eb-9fa3-c53e7358f645.png" height="320" alt="Changelog Generator" />
</a>

I just wanted a simple way to populate the body of a GitHub Release.


```yml
- name: Generate changelog
  id: changelog
  uses: jaywcjlove/changelog-generator@main
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
  if: steps.create_tag.outputs.successful
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    name: ${{ steps.create_tag.outputs.version }}
    tag: ${{ steps.create_tag.outputs.version }}
    body: |
      ${{ steps.changelog.outputs.compareurl }}

      ${{ steps.changelog.outputs.changelog }}
```

## Inputs

#### `token`

A GITHUB_TOKEN with the ability to pull from the repo in question. This is required. Why do we need `token`? Read more here: [About the GITHUB_TOKEN secret](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret)

#### `filter-author`

Regular expression filtering author. Example: [`filter-author: (jaywcjlove|小弟调调™|dependabot\[bot\]|Renovate Bot)`](https://github.com/jaywcjlove/changelog-generator/blob/f48f63cdb5f3c5d8b6499c6d96e3450ee7bdb9f5/.github/workflows/changelog.yml#L17)

#### `filter`

Regular expression filtering changelog. Example: [`filter: '[R|r]elease[d]\s+[v|V]\d(\.\d+){0,2}'`](https://github.com/jaywcjlove/changelog-generator/blob/b372394a4e7265d4041c479b4d1f515a9c21ec37/.github/workflows/release.yml#L21)

#### `head-ref`

The name of the head reference. Default `${{github.sha}}`.

#### `base-ref`

The name of the second branch. Defaults to the `tag_name` of the latest GitHub release. *This must be a GitHub release. Git tags or branches will not work.*

#### `original-markdown`

Default `true`, Output clean markdown content.

## Outputs

- `changelog` Markdown formatted changelog.
- `compareurl` Comparing two branches to see what’s changed or to start a new pull request.
- `tag` Tag name `v1.0.0`.
- `version` The version number of the tag created. example: `1.0.0`
- `branch` Branch name.

## Troubleshooting

#### Error not found

```
Error: Not Found
```

If you are seeing this error its likely that you do not yet have a GitHub release. You might have a git tag and that shows up in the release tab. The
API this Action uses only works with GitHub Releases. Convert one of your tags to a release and you'll be on your way. You can check out how this
repository uses this action and GitHub releases for an [example](https://github.com/jaywcjlove/changelog-generator/blob/600f36ff605c63a74a264ab324247f0c392bf7a2/.github/workflows/changelog.yml#L12-L18).

## Related

- [Create Tags From](https://github.com/jaywcjlove/create-tag-action) Auto create tags from commit or package.json.

## Acknowledgements

- [@jessicalostinspace/commit](https://github.com/jessicalostinspace/commit-difference-action).
- [@metcalfc/changelog-generator](https://github.com/metcalfc/changelog-generator).
- [@homeday-de/github-action-changelog-generator](https://github.com/homeday-de/github-action-changelog-generator).

## Example

- [uiwjs/react-md-editor](https://github.com/uiwjs/react-md-editor/blob/e3293bca45bff08110ef5e9119d907db2ec95baa/.github/workflows/ci.yml#L30-L37)
- [uiwjs/react-code-preview](https://github.com/uiwjs/react-code-preview/blob/fb9829440a21fddbb57100db62ae113be3c01161/.github/workflows/ci.yml#L42-L50)
- [uiwjs/react-amap](https://github.com/uiwjs/react-amap/blob/550599511bdf42260580fad380c4c9741142e572/.github/workflows/ci.yml#L29-L36)
- [uiwjs/react-heat-map](https://github.com/uiwjs/react-heat-map/blob/f828826111dc6d79249fdd106648d835ae8e47ba/.github/workflows/ci.yml#L29-L36)

## License

The scripts and documentation in this project are released under the [MIT License](./LICENSE)
