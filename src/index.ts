import { getInput, setFailed, startGroup, info, endGroup, setOutput } from '@actions/core';
import { context, getOctokit,  } from '@actions/github';
import { getVersion, getCommitLog, defaultTypes, handleBranchData, processCommits, parseCustomEmojis, getTagRef, fetchCommits, handleNoBaseRef } from './utils';

const regexp = /^[.A-Za-z0-9_-]*$/;

const getOptions = () => {
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
  };
};

async function run() {
  try {
    const options = getOptions();
    const { template, removeType, showEmoji, owner, repo, types, baseRef, headRef } = options || {};

    // If the baseRef is not provided, we will try to get the default branch
    if (!baseRef) {
      await handleNoBaseRef(options);
    }
    // If the headRef is not provided, we will use the current sha
    if (!headRef) {
      options.headRef = context.sha;
    }
    
    info(`Commit Content: \x1b[34m${owner}/${repo}\x1b[0m`);
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

    info(`Ref: baseRef(\x1b[32m${baseRef}\x1b[0m), options.headRef(\x1b[32m${headRef}\x1b[0m), tagRef(\x1b[32m${tagRef}\x1b[0m)`);

    await handleBranchData(options);

    if ((baseRef || '').replace(/^[vV]/, '') === headRef) {
      setOutput('tag', baseRef);
      setOutput('version', baseRef.replace(/^[vV]/, ''));
      info(`Done: baseRef(\x1b[33m${baseRef}\x1b[0m) === headRef(\x1b[32m${headRef}\x1b[0m)`);
      return;
    }

    if (regexp.test(headRef) && regexp.test(baseRef)) {
      const resultData = await fetchCommits(options);
      const commitLog = processCommits(resultData, options);
      tagRef = await getTagRef(options);
      const { changelog, changelogContent } = getCommitLog(commitLog, { types, showEmoji, removeType, template });
      startGroup('Result Changelog');
      info(`${changelog.join('\n')}`);
      endGroup();
      setOutput('changelog', changelogContent);
      setOutput('tag', tagRef);

      info(`Tag: \x1b[34m${tagRef || headRef || '-'}\x1b[0m`);
      info(`Input head-ref: \x1b[34m${headRef}\x1b[0m`);
      info(`Input base-ref: \x1b[34m${baseRef}\x1b[0m`);
      setOutput('compareurl', `https://github.com/${owner}/${repo}/compare/${baseRef}...${tagRef || headRef}`);
      setOutput('version', getVersion(tagRef || headRef || '').replace(/^v/, ''));
    } else {
      setFailed('Branch names must contain only numbers, strings, underscores, periods, and dashes.');
    }
  } catch (error) {
    info(`path: ${error}`);
    startGroup(`Error: \x1b[34m${(error as any).message || error}\x1b[0m`);
    info(`${JSON.stringify(error, null, 2)}`);
    endGroup();
    if (error instanceof Error) {
      setFailed(`Could not generate changelog between references because: ${error.message}`);
    }
    process.exit(1);
  }
}

try {
  run();
} catch (error) {
  if (error instanceof Error) {
    setFailed(error.message);
  }
}
