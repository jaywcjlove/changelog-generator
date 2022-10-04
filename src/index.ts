import { getInput, setFailed, startGroup, info, endGroup, setOutput } from '@actions/core';
import { context, getOctokit,  } from '@actions/github';
import { OctokitResponse } from '@octokit/types';

const regexp = /^[.A-Za-z0-9_-]*$/;

const getVersion = (ver: string = '') => {
  let currentVersion = ''
  ver.replace(/([v|V]\d(\.\d+){0,2})/i, (str) => {
    currentVersion = str
    return str
  })
  return currentVersion
}

const types = {
  type: '🆎',
  feat: '🌟',
  style: '🎨',
  chore: '💄',
  doc: '📖',
  fix: '🐞',
  test: '⛑',
  refactor: '🐝',
  website: '🌍',
  revert: '🔙',
  clean: '💊',
  perf: '📈',
  ci: '💢',
}

async function run() {
  try {
    var headRef = getInput('head-ref');
    var baseRef = getInput('base-ref');
    const myToken = getInput('token');
    const myPath = getInput('path');
    const filterAuthor = getInput('filter-author');
    const regExp = getInput('filter');
    const ghPagesBranch = getInput('gh-pages') || 'gh-pages';
    const originalMarkdown = getInput('original-markdown');
    const { owner, repo } = context.repo;
    const octokit = getOctokit(myToken);

    if (!baseRef) {
      const latestRelease = await octokit.rest.repos.getLatestRelease({ ...context.repo });
      if (latestRelease.status !== 200) {
        setFailed(
          `There are no releases on ${owner}/${repo}. Tags are not releases. (status=${latestRelease.status}) ${(latestRelease.data as any).message || ''}`
        );
      }
      baseRef = latestRelease.data.tag_name;
      startGroup(
        `Latest Release Result Data: \x1b[32m${latestRelease.status || '-'}\x1b[0m \x1b[32m${latestRelease.data.tag_name}\x1b[0m`
      )
      info(`${JSON.stringify(latestRelease, null, 2)}`)
      endGroup()
    }
    if (!headRef) {
      headRef = context.sha;
    }

    info(`Commit Content: \x1b[34m${owner}/${repo}\x1b[0m`)
    startGroup(`Ref: \x1b[34m${context.ref}\x1b[0m`);
    info(`${JSON.stringify(context, null, 2)}`);
    endGroup();

    let tagRef = '';
    if ((context.ref || '').startsWith('refs/tags/')) {
      tagRef = getVersion(context.ref);
    }

    if ((context.ref || '').startsWith('refs/heads/')) {
      const branch = context.ref.replace(/.*(?=\/)\//, '');
      setOutput('branch', branch);
      info(`Branch: \x1b[34m${branch}\x1b[0m`);
    }
    info(`Ref: baseRef(\x1b[32m${baseRef}\x1b[0m), headRef(\x1b[32m${headRef}\x1b[0m), tagRef(\x1b[32m${tagRef}\x1b[0m)`);

    try {
      const branchData = await octokit.request('GET /repos/{owner}/{repo}/branches', { ...context.repo });
      const ghPagesData = branchData.data.find((item) => item.name === ghPagesBranch);
      startGroup(`\x1b[34mGet Branch \x1b[0m`);
      info(`Branch Data: ${JSON.stringify(branchData.data, null, 2)}`);
      if (ghPagesData) {
        info(`ghPages Data: ${ghPagesBranch}, ${ghPagesData.commit.sha}, ${JSON.stringify(ghPagesData, null, 2)}`);
      }
      endGroup();
      if (ghPagesData) {
        setOutput('gh-pages-hash', ghPagesData.commit.sha);
        setOutput('gh-pages-short-hash', ghPagesData.commit.sha.substring(0,7));
      }
    } catch (error) {
      if (error instanceof Error) {
        info(`Get Branch: \x1b[33m${error.message}\x1b[0m`);
      }
    }

    if ((baseRef || '').replace(/^[vV]/, '') === headRef) {
      setOutput('tag', baseRef);
      setOutput('version', baseRef.replace(/^[vV]/, ''));
      info(`Done: baseRef(\x1b[33m${baseRef}\x1b[0m) === headRef(\x1b[32m${headRef}\x1b[0m)`);
      return;
    }

    if (
      !!headRef &&
      !!baseRef &&
      regexp.test(headRef) &&
      regexp.test(baseRef)
    ) {

      let commitsData = null as unknown as OctokitResponse<CommitsData>
      if (myPath) {
        info(`path: ${myPath}`)
        const commitsData = await octokit.request('GET /repos/{owner}/{repo}/commits', {
          ...context.repo,
          path: myPath,
        })

        if (commitsData && commitsData.status !== 200) {
          setFailed(
            `There are no releases on ${owner}/${repo}. Tags are not releases. (status=${commitsData.status}) ${(commitsData.data as any).message || ''}`
          );
        }
        startGroup(
          `Compare Path Commits Result Data: \x1b[32m${commitsData.status || '-'}\x1b[0m \x1b[32m${baseRef}\x1b[0m...\x1b[32m${headRef}\x1b[0m`
        )
        info(`${JSON.stringify(commitsData.data, null, 2)}`)
        endGroup()
      } else {
        const commitsData = await octokit.rest.repos.compareCommits({
          ...context.repo,
          base: baseRef,
          head: headRef,
        });
  
        if (commitsData && commitsData.status !== 200) {
          setFailed(
            `There are no releases on ${owner}/${repo}. Tags are not releases. (status=${commitsData.status}) ${(commitsData.data as any).message || ''}`
          );
        }
        startGroup(
          `Compare Commits Result Data: \x1b[32m${commitsData.status || '-'}\x1b[0m \x1b[32m${baseRef}\x1b[0m...\x1b[32m${headRef}\x1b[0m`
        )
        info(`${JSON.stringify(commitsData, null, 2)}`)
        endGroup()
      }

      let commitLog = [];
      for (const data of commitsData.data.commits) {
        const message = data.commit.message.split('\n\n')[0];
        const author = data.author || data.committer || { login: '-' };
        startGroup(`Commit: \x1b[34m${message}\x1b[0m \x1b[34m${(data.commit.author || {}).name}(${author.login})\x1b[0m ${data.sha}`);
        info(`${JSON.stringify(data, null, 2)}`);
        endGroup();
        commitLog.push(formatStringCommit(message, `${owner}/${repo}`, {
          originalMarkdown,
          regExp, shortHash: data.sha.slice(0, 7), filterAuthor, hash: data.sha,
          // author: '',
          // author: data.commit.author ? data.commit.author.name : '',
          login: author.login,
        }));
      }

      commitLog = commitLog.map((commit) => {
        (Object.keys(types) as Array<keyof typeof types>).forEach((name) => {
          if (getRegExp(name, commit)) {
            commit = `- ${types[name]} ${commit}`;
          }
        });
        if (!/^-\s/.test(commit) && commit) {
          commit = `- 📄 ${commit}`;
        }
        return commit
      }).filter(Boolean);

      if (!tagRef) {
        const listTags = await octokit.rest.repos.listTags({ owner, repo });
        if (listTags.status !== 200) {
          setFailed(`Failed to get tag lists (status=${listTags.status})`);
          return
        }
        tagRef = listTags.data[0] && listTags.data[0].name ? listTags.data[0].name : '';
      }
  
      info(`Tag: \x1b[34m${tagRef}\x1b[0m`);
      setOutput('tag', tagRef);

      info(`Tag: \x1b[34m${tagRef || headRef || '-'}\x1b[0m`);
      info(`Input head-ref: \x1b[34m${headRef}\x1b[0m`);
      info(`Input base-ref: \x1b[34m${baseRef}\x1b[0m`);
      startGroup('Result Changelog');
      info(`${commitLog.join('\n')}`);
      endGroup();
      setOutput('compareurl', `https://github.com/${owner}/${repo}/compare/${baseRef}...${tagRef || headRef}`);
      setOutput('changelog', commitLog.join('\n'));
      setOutput('version', getVersion(tagRef || headRef || '').replace(/^v/, ''));
    } else {
      setFailed(
        'Branch names must contain only numbers, strings, underscores, periods, and dashes.'
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      startGroup(`Error: \x1b[34m${error.message}\x1b[0m`);
      info(`${JSON.stringify(error, null, 2)}`);
      endGroup();
      setFailed(
        `Could not generate changelog between references because: ${error.message}`
      );
    }
    process.exit(1);
  }
}

type FormatStringCommit = {
  regExp?: string;
  shortHash?: string;
  originalMarkdown?: string;
  filterAuthor?: string;
  hash?: string;
  login?: string;
}

function formatStringCommit(commit = '', repoName = '', { regExp, shortHash, originalMarkdown, filterAuthor, hash, login = '' }: FormatStringCommit) {
  if (filterAuthor && (new RegExp(filterAuthor)).test(login)) {
    login = '';
  }
  if (regExp && (new RegExp(regExp).test(commit))) {
    return '';
  }
  login = login.replace(/\[bot\]/, '-bot');
  if (originalMarkdown) {
    return `${commit} ${shortHash} ${login ? `@${login}`: ''}`;
  }
  return `${commit} [\`${shortHash}\`](http://github.com/${repoName}/commit/${hash})${login ? ` @${login}`: ''}`;
}

function getRegExp(str = '', commit = '') {
  return (new RegExp(`^(${str}\s+[\s|(|:])|(${str}[(|:])`)).test(commit.trim().toLocaleLowerCase());
}

try {
  run();
} catch (error) {
  if (error instanceof Error) {
    setFailed(error.message);
  }
}
