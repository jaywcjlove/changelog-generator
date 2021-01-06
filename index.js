const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const regexp = /^[.A-Za-z0-9_-]*$/;


const getVersion = (ver) => {
  let currentVersion = ''
  ver.replace(/([v|V]\d(\.\d+){0,2})/i, (str) => {
    currentVersion = str
    return str
  })
  return currentVersion
}

async function run() {
  try {
    var headRef = core.getInput('head-ref');
    var baseRef = core.getInput('base-ref');
    const myToken = core.getInput('token');
    const { owner, repo } = github.context.repo;
    const octokit = github.getOctokit(myToken);

    if (!baseRef) {
      const latestRelease = await octokit.repos.getLatestRelease({ ...github.context.repo });
      if (latestRelease.status !== 200) {
        core.setFailed(
          `There are no releases on ${owner}/${repo}. Tags are not releases. (status=${latestRelease.status}) ${latestRelease.data.message || ''}`
        );
      }
      baseRef = latestRelease.data.tag_name;
    }
    if (!headRef) {
      headRef = github.context.sha;
    }

    core.info(`Commit Content: \x1b[34m${owner}/${repo}\x1b[0m`)
    core.info(`Ref: \x1b[34m${github.context.ref}\x1b[0m`)

    if (
      !!headRef &&
      !!baseRef &&
      regexp.test(headRef) &&
      regexp.test(baseRef)
    ) {
      const commits = await octokit.repos.compareCommits({
        ...github.context.repo,
        base: baseRef,
        head: headRef,
      });

      if (commits.status !== 200) {
        core.setFailed(
          `There are no releases on ${owner}/${repo}. Tags are not releases. (status=${commits.status}) ${commits.data.message || ''}`
        );
      }
      core.info(`Latest Ref: \x1b[34m${JSON.stringify(commits.data.commits)}\x1b[0m`)

      for (const data of commits.data.commits) {
        core.info(`Commit: \x1b[34m${data.commit.message}\x1b[0m \x1b[34m${data.commit.message}\x1b[0m ${data.commit.author.name}`)
      }

      // By default a GitHub action checkout is shallow. Get all the tags, branches,
      // and history. Redirect output to standard error which we can collect in the
      // action.
      await exec.exec('git fetch --depth=1 origin +refs/tags/*:refs/tags/*');
      await exec.exec('git fetch --prune --unshallow');

      // const commitList = await octokit.repos.listBranchesForHeadCommit({
      //   ...github.context.repo,
      //   commit_sha: baseHash || baseRef
      // })
      // core.info(`Commit List: \x1b[34m${JSON.stringify(commitList.data)}\x1b[0m`)
      // octokit.repos.listCommits({})
      // octokit.repos.listCommentsForCommit
      // octokit.repos.listBranchesForHeadCommit

      let tagRef = '';
      if ((github.context.ref || '').startsWith('refs/tags/')) {
        tagRef = getVersion(github.context.ref)
        core.info(`Tag: \x1b[34m${tagRef}\x1b[0m`)
        core.setOutput('tag', tagRef);
      }

      if ((github.context.ref || '').startsWith('refs/heads/')) {
        const branch = github.context.ref.replace(/.*(?=\/)\//, '');
        core.setOutput('branch', branch);
        core.info(`Branch: \x1b[34m${branch}\x1b[0m`)
      }

      core.info(`Tag: \x1b[34m${tagRef}\x1b[0m`)
      core.info(`Input head-ref: \x1b[34m${headRef}\x1b[0m`)
      core.info(`Input base-ref: \x1b[34m${baseRef}\x1b[0m`)
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
      `git log "${baseRef}...${headRef}" --pretty="format:[,,,]%h[,,,]%H[,,,]%s[,,,]%an" --reverse`,
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
  const filterAuthor = core.getInput('filter-author');
  let result = '';
  str.split('\n').filter(Boolean).forEach((subStr) => {
    const strArr = subStr.split('[,,,]');
    const shortHash = strArr[1];
    const hash = strArr[2];
    let commit = strArr[3];
    let author = strArr[4];
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
