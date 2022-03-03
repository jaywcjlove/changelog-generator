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
    const ghPagesBranch = core.getInput('gh-pages') || 'gh-pages';
    const originalMarkdown = core.getInput('original-markdown');
    const { owner, repo } = github.context.repo;
    const octokit = github.getOctokit(myToken);

    if (!baseRef) {
      const latestRelease = await octokit.rest.repos.getLatestRelease({ ...github.context.repo });
      if (latestRelease.status !== 200) {
        core.setFailed(
          `There are no releases on ${owner}/${repo}. Tags are not releases. (status=${latestRelease.status}) ${latestRelease.data.message || ''}`
        );
      }
      baseRef = latestRelease.data.tag_name;
      core.startGroup(
        `Latest Release Result Data: \x1b[32m${latestRelease.status || '-'}\x1b[0m \x1b[32m${latestRelease.data.tag_name}\x1b[0m`
      )
      core.info(`${JSON.stringify(latestRelease, null, 2)}`)
      core.endGroup()
    }
    if (!headRef) {
      headRef = github.context.sha;
    }

    core.info(`Commit Content: \x1b[34m${owner}/${repo}\x1b[0m`)
    core.startGroup(`Ref: \x1b[34m${github.context.ref}\x1b[0m`);
    core.info(`${JSON.stringify(github.context, null, 2)}`);
    core.endGroup();

    let tagRef = '';
    if ((github.context.ref || '').startsWith('refs/tags/')) {
      tagRef = getVersion(github.context.ref);
    }

    if ((github.context.ref || '').startsWith('refs/heads/')) {
      const branch = github.context.ref.replace(/.*(?=\/)\//, '');
      core.setOutput('branch', branch);
      core.info(`Branch: \x1b[34m${branch}\x1b[0m`);
    }
    core.info(`Ref: baseRef(\x1b[32m${baseRef}\x1b[0m), headRef(\x1b[32m${headRef}\x1b[0m), tagRef(\x1b[32m${tagRef}\x1b[0m)`);

    try {
      const branchData = await octokit.request('GET /repos/{owner}/{repo}/branches', { ...github.context.repo });
      const ghPagesData = branchData.data.find((item) => item.name === ghPagesBranch);
      core.startGroup(`\x1b[34mGet Branch \x1b[0m`);
      core.info(`Branch Data: ${JSON.stringify(branchData.data, null, 2)}`);
      core.info(`ghPages Data: ${ghPagesBranch}, ${ghPagesData.commit.hash}, ${JSON.stringify(ghPagesData, null, 2)}`);
      core.endGroup();
      core.setOutput('gh-pages-hash', ghPagesData.commit.hash);
    } catch (error) {
      core.info(`Get Branch: \x1b[33m${error.message}\x1b[0m`);
    }

    if ((baseRef || '').replace(/^[vV]/, '') === headRef) {
      core.setOutput('tag', baseRef);
      core.setOutput('version', baseRef.replace(/^[vV]/, ''));
      core.info(`Done: baseRef(\x1b[33m${baseRef}\x1b[0m) === headRef(\x1b[32m${headRef}\x1b[0m)`);
      return;
    }

    if (
      !!headRef &&
      !!baseRef &&
      regexp.test(headRef) &&
      regexp.test(baseRef)
    ) {
      const commits = await octokit.rest.repos.compareCommits({
        ...github.context.repo,
        base: baseRef,
        head: headRef,
      });

      if (commits && commits.status !== 200) {
        core.setFailed(
          `There are no releases on ${owner}/${repo}. Tags are not releases. (status=${commits.status}) ${commits.data.message || ''}`
        );
      }
      core.startGroup(
        `Compare Commits Result Data: \x1b[32m${commits.status || '-'}\x1b[0m \x1b[32m${baseRef}\x1b[0m...\x1b[32m${headRef}\x1b[0m`
      )
      core.info(`${JSON.stringify(commits, null, 2)}`)
      core.endGroup()

      let changelog = '';
      for (const data of commits.data.commits) {
        const message = data.commit.message.split('\n\n')[0];
        core.startGroup(`Commit: \x1b[34m${message}\x1b[0m \x1b[34m${data.commit.author.name}(${data.author.login})\x1b[0m ${data.sha}`);
        core.info(`${JSON.stringify(data, null, 2)}`);
        core.endGroup();
        changelog += formatStringCommit(message, `${owner}/${repo}`, {
          originalMarkdown,
          regExp, shortHash: data.sha.slice(0, 7), filterAuthor, hash: data.sha,
          author: data.commit.author.name,
          login: data.author.login,
        }) || '';
      }


      if (!tagRef) {
        const listTags = await octokit.rest.repos.listTags({ owner, repo });
        if (listTags.status !== 200) {
          core.setFailed(`Failed to get tag lists (status=${listTags.status})`);
          return
        }
        tagRef = listTags.data[0] && listTags.data[0].name ? listTags.data[0].name : '';
      }
  
      core.info(`Tag: \x1b[34m${tagRef}\x1b[0m`);
      core.setOutput('tag', tagRef);

      core.info(`Tag: \x1b[34m${tagRef || headRef || '-'}\x1b[0m`);
      core.info(`Input head-ref: \x1b[34m${headRef}\x1b[0m`);
      core.info(`Input base-ref: \x1b[34m${baseRef}\x1b[0m`);
      core.startGroup('Result Changelog');
      core.info(`${changelog}`);
      core.endGroup();
      core.setOutput('compareurl', `https://github.com/${owner}/${repo}/compare/${baseRef}...${tagRef || headRef}`);
      core.setOutput('changelog', changelog);
      core.setOutput('version', getVersion(tagRef || headRef || '').replace(/^v/, ''));
    } else {
      core.setFailed(
        'Branch names must contain only numbers, strings, underscores, periods, and dashes.'
      );
    }
  } catch (error) {
    core.startGroup(`Error: \x1b[34m${error.message}\x1b[0m`);
    core.info(`${JSON.stringify(error, null, 2)}`);
    core.endGroup();
    core.setFailed(
      `Could not generate changelog between references because: ${error.message}`
    );
    process.exit(1);
  }
}

function formatStringCommit(commit = '', repoName = '', { regExp, shortHash, originalMarkdown, filterAuthor, hash, login = '' }) {
  if (filterAuthor && (new RegExp(filterAuthor)).test(login)) {
    login = '';
  }
  if (regExp && (new RegExp(regExp).test(commit))) {
    return '';
  }
  login = login.replace(/\[bot\]/, '-bot');
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
  if (originalMarkdown) {
    return `- ${commit} ${shortHash} ${login ? `@${login}`: ''}\n`;
  }
  return `- ${commit} [\`${shortHash}\`](http://github.com/${repoName}/commit/${hash})${login ? ` @${login}`: ''}\n`;
}

function getRegExp(str = '', commit = '') {
  return (new RegExp(`^(${str}\s+[\s|(|:])|(${str}[(|:])`)).test(commit.trim().toLocaleLowerCase());
}

try {
  run();
} catch (error) {
  core.setFailed(error.message);
}
