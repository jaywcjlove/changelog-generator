const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const path = require('path');
const regexp = /^[.A-Za-z0-9_-]*$/;
const src = __dirname;

async function run() {
  try {
    var headRef = core.getInput('head-ref');
    var baseRef = core.getInput('base-ref');
    const myToken = core.getInput('myToken');
    const { owner, repo } = github.context.repo;

    const octokit = github.getOctokit(myToken);
    if (!baseRef) {
      const latestRelease = await octokit.repos.getLatestRelease({
        owner: owner,
        repo: repo
      });
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

    console.log(`repo: ${owner}/${repo}`);
    console.log(`ref: ${JSON.stringify(github.context.ref)}`);
    console.log(`head-ref1: ${headRef}`);
    console.log(`base-ref1: ${baseRef}`);

    if (
      !!headRef &&
      !!baseRef &&
      regexp.test(headRef) &&
      regexp.test(baseRef)
    ) {
      getChangelog(headRef, baseRef, owner + '/' + repo);
    } else {
      core.setFailed(
        'Branch names must contain only numbers, strings, underscores, periods, and dashes.'
      );
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getChangelog(headRef, baseRef, repoName) {
  try {
    let output = ''
    let err = ''

    // These are option configurations for the @actions/exec lib`
    const options = {}
    options.listeners = {
      stdout: data => {
        output += data.toString();
      },
      stderr: data => {
        err += data.toString();
      }
    }
    options.cwd = './';
    await exec.exec(
      path.join(src, '..', 'changelog.sh'),
      [headRef, baseRef, repoName],
      options
    );

    if (output) {
      console.log('\x1b[32m%s\x1b[0m', `Changelog between ${baseRef} and ${headRef}:\n${output}`);
      core.setOutput('compareurl', `https://github.com/${repoName}/compare/${baseRef}...${headRef}`);
      core.setOutput('changelog', formatString(output, repoName));
    } else {
      core.setFailed(err);
      process.exit(1);
    }
    
  } catch (error) {
    core.setFailed(
      `Could not generate changelog between references because: ${error.message}`
    );
    process.exit(0);
  }
}

/**
 * `%h[,,,]%H[,,,]%s[,,,]%an[-|-]`
 * @param {*} str ``
 * @param {*} repoName `uiwjs/uiw`
 */
function formatString(str = '', repoName = '') {
  let result = '';
  str.split('\n').filter(Boolean).forEach((subStr) => {
    console.log('\x1b[32m%s\x1b[0m', `Changelog>>>> ${subStr}`);
    const strArr = subStr.split('[,,,]');
    const shortHash = strArr[1];
    const hash = strArr[2];
    let commit = strArr[3];
    const author = strArr[4];
    console.log('\x1b[32m%s\x1b[0m', `StrArr> ${shortHash}>>> ${JSON.stringify(strArr)}`);
    if (getRegExp('type', commit)) {
      commit = `🆎 ${commit}`;
    } else if (getRegExp('feat', commit)) {
      commit = `🌟 ${commit}`;
    } else if (getRegExp('style', commit)) {
      commit = `🎨 ${commit}`;
    } else if (getRegExp('chore', commit)) {
      commit = `💄 ${commit}`;
    } else if (getRegExp('doc', commit) || getRegExp('docs', commit)) {
      commit = `📖 ${commit}`;
    } else if (getRegExp('fix', commit)) {
      commit = `🐞 ${commit}`;
    } else if (getRegExp('test', commit)) {
      commit = `⛑ ${commit}`;
    } else if (getRegExp('refactor', commit)) {
      commit = `🐝 ${commit}`;
    } else if (getRegExp('website', commit)) {
      commit = `🌍 ${commit}`;
    } else if (getRegExp('revert', commit)) {
      commit = `🔙 ${commit}`;
    } else if (getRegExp('clean', commit)) {
      commit = `💊 ${commit}`;
    } else {
      commit = `📄 ${commit}`;
    }
    result += `- ${commit} [\`${shortHash}\`](http://github.com/${repoName}/commit/${hash})\n`;
  });
  return result;
}

function getRegExp(str = '', commit = '') {
  return (new RegExp(`^(${str}\s+[\s|(|:])|(${str}[(|:])`)).test(commit.trim().toLocaleLowerCase());
}

try {
  run();
} catch (error) {
  core.setFailed(error.message);
}
