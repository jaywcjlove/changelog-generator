const core = require('@actions/core');
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
    const filterAuthor = core.getInput('filter-author');
    const regExp = core.getInput('filter');
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

      if (commits && commits.status !== 200) {
        core.setFailed(
          `There are no releases on ${owner}/${repo}. Tags are not releases. (status=${commits.status}) ${commits.data.message || ''}`
        );
      }
      let changelog = '';
      for (const data of commits.data.commits) {
        core.info(`Commit: \x1b[34m${data.commit.message}\x1b[0m \x1b[34m${data.author.name}\x1b[0m ${data.sha}`);
        changelog += formatStringCommit(data.commit.message, `${owner}/${repo}`, {
          regExp, shortHash: data.sha, filterAuthor, hash: data.sha, author: data.author.name
        });
      }

      let tagRef = '';
      if ((github.context.ref || '').startsWith('refs/tags/')) {
        tagRef = getVersion(github.context.ref);
        core.info(`Tag: \x1b[34m${tagRef}\x1b[0m`);
        core.setOutput('tag', tagRef);
      }
      if ((github.context.ref || '').startsWith('refs/heads/')) {
        const branch = github.context.ref.replace(/.*(?=\/)\//, '');
        core.setOutput('branch', branch);
        core.info(`Branch: \x1b[34m${branch}\x1b[0m`);
      }
      core.info(`Tag: \x1b[34m${tagRef || '-'}\x1b[0m`);
      core.info(`Input head-ref: \x1b[34m${headRef}\x1b[0m`);
      core.info(`Input base-ref: \x1b[34m${baseRef}\x1b[0m`);
      core.setOutput('compareurl', `https://github.com/${owner}/${repo}/compare/${baseRef}...${tagRef || headRef}`);
      core.setOutput('changelog', changelog);
    } else {
      core.setFailed(
        'Branch names must contain only numbers, strings, underscores, periods, and dashes.'
      );
    }

  } catch (error) {
    core.setFailed(
      `Could not generate changelog between references because: ${error.message}`
    );
    process.exit(0);
  }
}

function formatStringCommit(commit = '', repoName = '', { regExp, shortHash, filterAuthor, hash, author }) {
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
  } else if (getRegExp('fix', commit) || getRegExp('fixed', commit)) {
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
  return `- ${commit} [\`${shortHash}\`](http://github.com/${repoName}/commit/${hash})${author ?` @${author}`: ''}\n`;
}

function getRegExp(str = '', commit = '') {
  return (new RegExp(`^(${str}\s+[\s|(|:])|(${str}[(|:])`)).test(commit.trim().toLocaleLowerCase());
}

try {
  run();
} catch (error) {
  core.setFailed(error.message);
}
