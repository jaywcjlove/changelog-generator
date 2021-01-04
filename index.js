const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

const src = __dirname;

async function run() {
  try {
    var headRef = core.getInput('head-ref');
    var baseRef = core.getInput('base-ref');
    const myToken = core.getInput('myToken');
    const { owner, repo } = github.context.repo;
    console.log(`repo: ${owner}/${repo}`);
    console.log(`head-ref: ${headRef}`);
    console.log(`base-ref: ${baseRef}`);

    const octokit = github.getOctokit(myToken);
    console.log(`test1:`)
    if (!baseRef) {
      console.log(`test2:`)
      const latestRelease = await octokit.repos.getLatestRelease({
        owner: owner,
        repo: repo
      });
      console.log(`test3: ${JSON.stringify(latestRelease)}`)
      if (latestRelease) {
        baseRef = latestRelease.data.tag_name;
      } else {
        core.setFailed(
          `There are no releases on ${owner}/${repo}. Tags are not releases.`
        );
      }
    }
    if (!headRef) {
      headRef = github.context.sha;
    }




    console.log(`tag: ${JSON.stringify(github.context.sha)}`);
    console.log(`head-ref1: ${headRef}`);
    console.log(`base-ref1: ${baseRef}`);

  } catch (error) {
    core.setFailed(error.message);
  }
}


try {
  run();
} catch (error) {
  core.setFailed(error.message);
}
