changelog-generator
----

This Action returns a markdown formatted changelog between two git references. There are other projects that use milestones, labeled PRs, etc. Those are just to much work for simple projects.

<img src="https://user-images.githubusercontent.com/1680273/103601680-1fd01380-4f45-11eb-9ff3-84a435288ac1.png" height="320" alt="Changelog Generator" />

I just wanted a simple way to populate the body of a GitHub Release.


```yml
- name: Generate changelog
  id: changelog
  uses: jaywcjlove/changelog-generator@main
  with:
    myToken: ${{ secrets.GITHUB_TOKEN }}
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

#### `myToken`

A GITHUB_TOKEN with the ability to pull from the repo in question. This is required.

Why do we need `myToken`? Read more here: [About the GITHUB_TOKEN secret](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret)

#### `filter`

Regular expression filtering. Example: [`filter: (^[\s]+?[R|r]elease)|(^[R|r]elease)`](https://github.com/jaywcjlove/changelog-generator/blob/b372394a4e7265d4041c479b4d1f515a9c21ec37/.github/workflows/release.yml#L21)

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

### Error not found

```
Error: Not Found
```

If you are seeing this error its likely that you do not yet have a GitHub release. You might have a git tag and that shows up in the release tab. The
API this Action uses only works with GitHub Releases. Convert one of your tags to a release and you'll be on your way. You can check out how this
repository uses this action and GitHub releases for an [example](.github/workflows/release.yml).

## Acknowledgements

- Thanks [@jessicalostinspace/commit](https://github.com/jessicalostinspace/commit-difference-action).
- Thanks [@jessicalostinspace/commit](https://github.com/metcalfc/changelog-generator).

## License

The scripts and documentation in this project are released under the [MIT License](./LICENSE)