changelog-generator
----

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
    filter-author: (jaywcjlove|小弟调调™|dependabot\[bot\]|Renovate Bot)
    filter: (^[\s]+?[R|r]elease)|(^[R|r]elease)
```

Then you can to use the resulting changelog.

```yml
- name: Get the changelog
  run: echo "${{ steps.changelog.outputs.changelog }}"

- name: Create Release
  id: create_release
  uses: actions/create-release@latest
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tag_name: ${{ github.ref }}
    release_name: ${{ github.ref }}
    body: |
      ${{ steps.changelog.outputs.compareurl }}
      ${{ steps.changelog.outputs.changelog }}
    draft: false
    prerelease: false
```

## Inputs

#### `token`

A GITHUB_TOKEN with the ability to pull from the repo in question. This is required. Why do we need `token`? Read more here: [About the GITHUB_TOKEN secret](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret)

#### `filter-author`

Regular expression filtering author. Default `false`. Example: [`filter-author: (jaywcjlove|小弟调调™|dependabot\[bot\]|Renovate Bot)`](https://github.com/jaywcjlove/changelog-generator/blob/f48f63cdb5f3c5d8b6499c6d96e3450ee7bdb9f5/.github/workflows/changelog.yml#L17)

#### `filter`

Regular expression filtering changelog. Example: [`filter: (^[\s]+?[R|r]elease)|(^[R|r]elease)`](https://github.com/jaywcjlove/changelog-generator/blob/b372394a4e7265d4041c479b4d1f515a9c21ec37/.github/workflows/release.yml#L21)

#### `head-ref`

The name of the head reference. Default `${{github.sha}}`.

#### `base-ref`

The name of the second branch. Defaults to the `tag_name` of the latest GitHub release. *This must be a GitHub release. Git tags or branches will not work.*

## Outputs

- `changelog` Markdown formatted changelog.
- `compareurl` Comparing two branches to see what’s changed or to start a new pull request.
- `tag` Tag name.
- `branch` Branch name.

## Troubleshooting

#### Error not found

```
Error: Not Found
```

If you are seeing this error its likely that you do not yet have a GitHub release. You might have a git tag and that shows up in the release tab. The
API this Action uses only works with GitHub Releases. Convert one of your tags to a release and you'll be on your way. You can check out how this
repository uses this action and GitHub releases for an [example](.github/workflows/release.yml).

## Acknowledgements

- [@jessicalostinspace/commit](https://github.com/jessicalostinspace/commit-difference-action).
- [@metcalfc/changelog-generator](https://github.com/metcalfc/changelog-generator).
- [@homeday-de/github-action-changelog-generator](https://github.com/homeday-de/github-action-changelog-generator).

## License

The scripts and documentation in this project are released under the [MIT License](./LICENSE)