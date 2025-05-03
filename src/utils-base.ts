import { getInput, setFailed, startGroup, info, endGroup, setOutput } from '@actions/core';
import { context, getOctokit } from '@actions/github';

import { parseCustomEmojis } from './utils';
import { defaultTypes, formatStringCommit } from './utils';

export type ActionOptions = ReturnType<typeof getOptions>;

export const getOptions = () => {
    const myToken = getInput('token');
    return {
      ...context.repo,
      headRef: getInput('head-ref'),
      baseRef: getInput('base-ref'),
      myToken,
      myPath: getInput('path'),
      order: getInput('order') as 'asc' | 'desc',
      template: getInput('template'),
      /** @example `type🆎,chore💄,fix🐞` Use commas to separate */
      customEmoji: getInput('custom-emoji') || '',
      showEmoji: getInput('show-emoji') !== 'false',
      removeType: getInput('remove-type') !== 'false',
      filterAuthor: getInput('filter-author'),
      regExp: getInput('filter'),
      ghPagesBranch: getInput('gh-pages') || 'gh-pages',
      originalMarkdown: getInput('original-markdown'),
      octokit: getOctokit(myToken),
      types: parseCustomEmojis(getInput('custom-emoji'), defaultTypes),
      tagRef: '',
    };
};

export const getTagRef = async (options: ActionOptions) => {
    const { octokit, owner, repo, headRef } = options;
    let tagRef = '';
  
    if (!options.tagRef) {
      const listTags = await octokit.rest.repos.listTags({ owner, repo });
      if (listTags.status !== 200) {
        setFailed(`Failed to get tag lists (status=${listTags.status})`);
        return '';
      }
      tagRef = listTags.data[0]?.name || '';
    } else {
      tagRef = options.tagRef;
    }
  
    return tagRef;
};

export const handleNoBaseRef = async (options: ActionOptions) => {
    const { octokit, owner, repo } = options;
    // Get the latest release
    const latestRelease = await octokit.rest.repos.getLatestRelease({ ...context.repo });
    if (latestRelease.status !== 200) {
      setFailed(`There are no releases on ${owner}/${repo}. Tags are not releases. (status=${latestRelease.status}) ${(latestRelease.data as any).message || ''}`);
    } else {
      options.baseRef = latestRelease.data.tag_name;
      startGroup(`Latest Release Result Data: \x1b[32m${latestRelease.status || '-'}\x1b[0m \x1b[32m${latestRelease.data.tag_name}\x1b[0m`);
      info(`${JSON.stringify(latestRelease, null, 2)}`);
      endGroup();
      return latestRelease.data.tag_name;
    }
};


export const handleBranchData = async (options: ActionOptions) => {
    const { octokit, ghPagesBranch } = options;
    try {
      const branchData = await octokit.request('GET /repos/{owner}/{repo}/branches', { ...context.repo });
      const ghPagesData = branchData.data.find((item: any) => item.name === ghPagesBranch);
      startGroup(`\x1b[34mGet Branch \x1b[0m`);
      info(`Branch Data: ${JSON.stringify(branchData.data, null, 2)}`);
      if (ghPagesData) {
        info(`ghPages Data: ${ghPagesBranch}, ${ghPagesData.commit.sha}, ${JSON.stringify(ghPagesData, null, 2)}`);
        setOutput('gh-pages-hash', ghPagesData.commit.sha);
        setOutput('gh-pages-short-hash', ghPagesData.commit.sha.substring(0, 7));
      }
      endGroup();
    } catch (error) {
      if (error instanceof Error) {
        info(`Get Branch: \x1b[33m${error.message}\x1b[0m`);
      }
    }
};

export const fetchCommits = async (options: ActionOptions) => {
  const { octokit, myPath, baseRef, headRef } = options;
  let resultData = [] as any[];

  if (myPath) {
    info(`path: ${myPath}`);
    const commitsData = await octokit.request('GET /repos/{owner}/{repo}/commits', {
      ...context.repo,
      path: myPath,
    });

    if (commitsData && commitsData.status !== 200) {
      setFailed(`There are no releases on ${options.owner}/${options.repo}. Tags are not releases. (status=${commitsData.status}) ${(commitsData.data as any).message || ''}`);
    } else {
      resultData = commitsData.data;
    }
    startGroup(`Compare Path Commits Result Data: \x1b[32m${commitsData.status || '-'}\x1b[0m \x1b[32m${baseRef}\x1b[0m...\x1b[32m${headRef}\x1b[0m`);
    info(`${JSON.stringify(commitsData.data, null, 2)}`);
    endGroup();
  } else {
    const commitsData = await octokit.rest.repos.compareCommitsWithBasehead({
      ...context.repo,
      basehead: `${baseRef}...${headRef}`,
    });

    if (commitsData && commitsData.status !== 200) {
      setFailed(`There are no releases on ${options.owner}/${options.repo}. Tags are not releases. (status=${commitsData.status}) ${(commitsData.data as any).message || ''}`);
    } else {
      resultData = commitsData.data.commits;
    }
    startGroup(`Compare Commits Result Data: \x1b[32m${commitsData.status || '-'}\x1b[0m \x1b[32m${baseRef}\x1b[0m...\x1b[32m${headRef}\x1b[0m`);
    info(`${JSON.stringify(commitsData, null, 2)}`);
    endGroup();
  }

  return resultData;
};

export const processCommits = (resultData: any[], options: ActionOptions) => {
  const { order, owner, repo, originalMarkdown, regExp, filterAuthor, types } = options;
  let commitLog = [] as string[];

  info(`ResultData Length: ${resultData.length} - ${order}`);
  resultData.forEach((data) => {
    const message = data.commit.message.split('\n\n')[0];
    const author = data.author || data.committer || { login: '-' };
    startGroup(`Commit: \x1b[34m${message}\x1b[0m \x1b[34m${(data.commit.author || {}).name}(${author.login})\x1b[0m ${data.sha}`);
    info(`${JSON.stringify(data, null, 2)}`);
    endGroup();
    commitLog.push(formatStringCommit(message, `${owner}/${repo}`, {
      originalMarkdown,
      regExp,
      shortHash: data.sha.slice(0, 7),
      filterAuthor,
      hash: data.sha,
      login: author.login,
    }));
  });

  return order === 'asc' ? commitLog : commitLog.reverse();
};
