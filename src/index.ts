import { setFailed, startGroup, info, endGroup, setOutput } from '@actions/core';
import { context } from '@actions/github';
import { getVersion, getOptions, getCommitLog, handleBranchData, processCommits, getTagRef, fetchCommits, handleNoBaseRef } from './utils';

const regexp = /^[.A-Za-z0-9_/-]*$/;

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

    if ((context.ref || '').startsWith('refs/tags/')) {
      options.tagRef = getVersion(context.ref);
    }

    if ((context.ref || '').startsWith('refs/heads/')) {
      const branch = context.ref.replace(/.*(?=\/)\//, '');
      setOutput('branch', branch);
      info(`Branch: \x1b[34m${branch}\x1b[0m`);
    }

    info(`Ref: baseRef(\x1b[32m${options.baseRef}\x1b[0m), options.headRef(\x1b[32m${headRef}\x1b[0m), tagRef(\x1b[32m${options.tagRef}\x1b[0m)`);

    await handleBranchData(options);

    if ((options.baseRef || '').replace(/^[vV]/, '') === headRef) {
      setOutput('tag', options.baseRef);
      setOutput('version', options.baseRef.replace(/^[vV]/, ''));
      info(`Done: options.baseRef(\x1b[33m${options.baseRef}\x1b[0m) === headRef(\x1b[32m${headRef}\x1b[0m)`);
      return;
    }

    if (regexp.test(headRef) && regexp.test(options.baseRef)) {
      const resultData = await fetchCommits(options);
      const commitLog = processCommits(resultData, options);

      const tagRef = await getTagRef(options);
      const { changelog, changelogContent } = getCommitLog(commitLog, { types, showEmoji, removeType, template });
      startGroup('Result Changelog');
      info(`${changelog.join('\n')}`);
      endGroup();
      setOutput('changelog', changelogContent);
      setOutput('tag', tagRef);

      info(`Tag: \x1b[34m${tagRef || headRef || '-'}\x1b[0m`);
      info(`Input head-ref: \x1b[34m${headRef}\x1b[0m`);
      info(`Input base-ref: \x1b[34m${options.baseRef}\x1b[0m`);
      setOutput('compareurl', `https://github.com/${owner}/${repo}/compare/${options.baseRef}...${tagRef || headRef}`);
      setOutput('version', getVersion(tagRef || headRef || '').replace(/^v/, ''));
    } else {
      setFailed('Branch names must contain only numbers, strings, underscores, periods, forward slashes and dashes. (A-z 0-9 _ - / .)');
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
