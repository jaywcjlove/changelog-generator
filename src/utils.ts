import { getInput, setFailed, startGroup, info, endGroup, setOutput } from '@actions/core';
import { context, getOctokit } from '@actions/github';


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

export type ActionOptions = ReturnType<typeof getOptions>;

export const getVersion = (ver: string = '') => {
  let currentVersion = ''
  ver.replace(/([v|V]\d(\.\d+){0,2})/i, (str) => {
    currentVersion = str
    return str
  })
  return currentVersion
}

export const defaultTypes = {
  type: '🆎',
  feat: '🌟',
  style: '🎨',
  chore: '💄',
  doc: '📖',
  docs: '📖',
  build: '🧯',
  fix: '🐞',
  test: '⛑',
  refactor: '🐝',
  website: '🌍',
  revert: '🔙',
  clean: '💊',
  perf: '📈',
  ci: '💢',
  __unknown__: '📄'
}

/**
 * Parse custom emojis
 */
export const parseCustomEmojis = (customEmoji: string, defaultTypes: Record<string, string>) => {
  const customEmojiData = customEmoji.split(',');
  customEmojiData.forEach((item) => {
    const emojiIcon = item.match(/[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu);
    const typeName = item.replace(/[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '');
    if (typeName && emojiIcon) {
      defaultTypes[typeName as keyof typeof defaultTypes] = emojiIcon[0];
    }
  });
  return defaultTypes as Options['types'];
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


export type FormatStringCommit = {
  regExp?: string;
  shortHash?: string;
  originalMarkdown?: string;
  filterAuthor?: string;
  hash?: string;
  login?: string;
}

export function formatStringCommit(commit = '', repoName = '', { regExp, shortHash, originalMarkdown, filterAuthor, hash, login = '' }: FormatStringCommit) {
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

export function getRegExp(str = '', commit = '') {
  return (new RegExp(`^(${str}\s+[\s|(|:])|(${str}[(|:])`)).test(commit.trim().toLocaleLowerCase());
}

type Options = {
  types: typeof defaultTypes;
  category?: Partial<Record<keyof typeof defaultTypes, string[]>>;
  showEmoji: boolean;
  removeType: boolean;
  template: string;
}

export function getCommitLog(log: string[], options = {} as Options) {
  const { types, category = {}, showEmoji, template, removeType = false } = options;
  if (!Array.isArray(category['__unknown__'])) category['__unknown__'] = [];
  log = log.map((commit) => {
    (Object.keys(types || {}) as Array<keyof typeof defaultTypes>).forEach((name) => {
      if (!category[name]) category[name] = [];
      if (getRegExp(name, commit)) {
        commit = showEmoji ? `- ${types[name]} ${commit}` : `- ${commit}`;
        category[name]!.push(commit);
      }
    });
    if (!/^-\s/.test(commit) && commit) {
      commit = showEmoji ? `- ${types['__unknown__']} ${commit}` : `- ${commit}`;
      category['__unknown__']!.push(commit);
    }
    if (removeType) {
      commit = commit.replace(/(^-\s+?\w+(\s+)?\((.*?)\):\s+)|(^-\s+?\w+(\s+)?:\s+)/, '- ');
    }
    return commit
  }).filter(Boolean);

  let changelogContent = '';
  /**
   * https://github.com/jaywcjlove/changelog-generator/issues/111#issuecomment-1594085749
   */
  if (template && typeof template === 'string') {
    changelogContent = template.replace(/\{\{(.*?)\}\}/g, (string, replaceValue) => {
      const [typeString = '', emptyString] = (replaceValue || '').split('||');
      const arr = typeString.replace(/\s/g, '').split(',').map((name: keyof typeof types) => category[name] || []).flat().filter(Boolean);
      if (arr.length === 0 && emptyString) return emptyString;
      if (arr.length > 0) return arr.join('\n');
      return string;
    });
    changelogContent = changelogContent.replace(/##(.*?)\n+\{\{(.*?)\}\}(\s+)?(\n+)?/g, '');
  } else {
    changelogContent = log.join('\n');
  }
  return {
    changelog: log,
    category,
    changelogContent,
  }
}
