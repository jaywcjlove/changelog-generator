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
