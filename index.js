const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

const src = __dirname;

async function run() {
  try {
    var headRef = core.getInput('head-ref');
    var baseRef = core.getInput('base-ref');
    const { owner, repo } = github.context.repo;
    console.log(`owner: ${owner}`);
    console.log(`repo: ${repo}`);
    const myToken = core.getInput('myToken');
    console.log(`head-ref: ${headRef}`)
    console.log(`base-ref: ${baseRef}`)
    console.log(`myToken: ${myToken}`)
    console.log(`github.context: ${JSON.stringify(github.context)}`)

  } catch (error) {
    core.setFailed(error.message);
  }
}


try {
  run();
} catch (error) {
  core.setFailed(error.message);
}
