const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const regexp = /^[.A-Za-z0-9_-]*$/;

async function run() {
  try {
    var headRef = core.getInput('head-ref');
    var baseRef = core.getInput('base-ref');
    var filterAuthor = core.getInput('filter-author');
    const myToken = core.getInput('myToken');
    const { owner, repo } = github.context.repo;

    const octokit = github.getOctokit(myToken);
    core.saveState("filterAuthor", filterAuthor ? filterAuthor : false);

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
    console.log(`head-ref: ${headRef}`);
    console.log(`base-ref: ${baseRef}`);

    if (
      !!headRef &&
      !!baseRef &&
      regexp.test(headRef) &&
      regexp.test(baseRef)
    ) {

      // By default a GitHub action checkout is shallow. Get all the tags, branches,
      // and history. Redirect output to standard error which we can collect in the
      // action.
      await exec.exec('git fetch --depth=1 origin +refs/tags/*:refs/tags/*');
      await exec.exec('git fetch --prune --unshallow');

      let tagRef = '';
      if (/^refs\/tags\//.test(github.context.ref)) {
        tagRef = github.context.ref.replace(/.*(?=\/)\//, '');
        console.log(`tag-> : ${tagRef}`);
        core.setOutput('tag', tagRef);
      }
      if (/^refs\/heads\//.test(github.context.ref)) {
        const branch = github.context.ref.replace(/.*(?=\/)\//, '');
        console.log(`branch: ${branch}`);
        core.setOutput('branch', branch);
      }
      getChangelog(headRef, baseRef, { repoName: owner + '/' + repo, tagRef });
    } else {
      core.setFailed(
        'Branch names must contain only numbers, strings, underscores, periods, and dashes.'
      );
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getChangelog(headRef, baseRef, { repoName, tagRef }) {
  try {
    let output = ''
    let err = ''

    // These are option configurations for the @actions/exec lib`
    await exec.exec(
      `git log "${baseRef}...${headRef}" --pretty=format:"[,,,]%h[,,,]%H[,,,]%s[,,,]%an" --reverse`,
      [],
      {
        cwd: './',
        listeners: {
          stdout: data => {
            output += data.toString();
          },
          stderr: data => {
            err += data.toString();
          }
        }
      }
    );

    if (output) {
      const regExp = core.getInput('filter');
      const changelog = formatString(output, repoName, { regExp });
      console.log('\x1b[32m%s\x1b[0m', `Changelog between ${baseRef} and ${headRef}:\n${changelog}`);
      core.setOutput('compareurl', `https://github.com/${repoName}/compare/${baseRef}...${tagRef || headRef}`);
      core.setOutput('changelog', changelog);
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
 * @param {*} regExp `^released`
 */
function formatString(str = '', repoName = '', { regExp }) {
  let result = '';
  str.split('\n').filter(Boolean).forEach((subStr) => {
    const strArr = subStr.split('[,,,]');
    const shortHash = strArr[1];
    const hash = strArr[2];
    let commit = strArr[3];
    let author = strArr[4];
    const filterAuthor = core.getState('filterAuthor');
    if ((new RegExp(filterAuthor)).test(author) || filterAuthor === false) {
      author = '';
    }
    if (regExp && (new RegExp(regExp).test(commit))) {
      return;
    }

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
    const changelog = `- ${commit} [\`${shortHash}\`](http://github.com/${repoName}/commit/${hash})${author ?` @${author}`: ''}`;
    result += `${changelog}\n`;
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
