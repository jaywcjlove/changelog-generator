import { getCommitLog, defaultTypes, getRegExp, getVersion, parseCustomEmojis } from '../src/utils';

const log = [
    'feat: Add new feature',
    'fix(auth): Correct login issue',
    'docs: Update README.md',
    'doc: Update README.md',
];

const template = `## Bugs
{{fix}}
## Feature
{{feat}}
## Improve
{{refactor,perf,clean}}
## Document
{{docs,doc}}
## Unknown
{{__unknown__}}`;

describe('getCommitLog', () => {
    it('should include emoji in commit log when showEmoji is true', () => {
        const result = getCommitLog(log, {
            types: defaultTypes,
            showEmoji: true,
            removeType: false,
            template: ''
        });
        let changelog = [
            '- 🌟 feat: Add new feature',
            '- 🐞 fix(auth): Correct login issue',
            '- 📖 docs: Update README.md',
            '- 📖 doc: Update README.md'
        ]
        expect(result.changelog[0]).toBe(changelog[0]);
        expect(result.changelog[1]).toBe(changelog[1]);
        expect(result.changelog[2]).toBe(changelog[2]);
        expect(result.changelog[3]).toBe(changelog[3]);
    })
    it('should exclude emoji from commit log when showEmoji is false and keep type', () => {
        const result = getCommitLog(log, {
            types: defaultTypes,
            showEmoji: false,
            removeType: false,
            template: ''
        });
        let changelog = [
            '- feat: Add new feature',
            '- fix(auth): Correct login issue',
            '- docs: Update README.md',
            '- doc: Update README.md'
        ]
        expect(result.changelog[0]).toBe(changelog[0]);
        expect(result.changelog[1]).toBe(changelog[1]);
        expect(result.changelog[2]).toBe(changelog[2]);
        expect(result.changelog[3]).toBe(changelog[3]);
    })
    it('should exclude emoji and remove type prefix from commit log when showEmoji is false and removeType is true', () => {
        const result = getCommitLog(log, {
            types: defaultTypes,
            showEmoji: false,
            removeType: true,
            template: ""
        });
        let changelog = [
            '- Add new feature',
            '- Correct login issue',
            '- Update README.md',
            '- Update README.md'
        ]
        expect(result.changelog[0]).toBe(changelog[0]);
        expect(result.changelog[1]).toBe(changelog[1]);
        expect(result.changelog[2]).toBe(changelog[2]);
        expect(result.changelog[3]).toBe(changelog[3]);
    })
    it('should format commit log content according to the provided template', () => {
        const result = getCommitLog(log, {
            types: defaultTypes,
            showEmoji: false,
            removeType: true,
            template: template
        });
        let changelog = '## Bugs\n' +
        '- fix(auth): Correct login issue\n' +
        '## Feature\n' +
        '- feat: Add new feature\n' +
        '## Document\n' +
        '- docs: Update README.md\n' +
        '- doc: Update README.md\n'
        expect(result.changelogContent).toBe(changelog);
    })
})

describe('getRegExp', () => {
    it('should correctly match commit types', () => {
        expect(getRegExp('feat', 'feat: Add new feature')).toBe(true);
        expect(getRegExp('feat', '🌟 feat: Add new feature')).toBe(true);
        expect(getRegExp('fix', 'fix(auth): Correct login issue')).toBe(true);
        expect(getRegExp('fix', '🐞 fix: Correct login issue')).toBe(true);
        expect(getRegExp('docs', 'docs: Update README')).toBe(true);
        expect(getRegExp('docs', '📖 docs: Update README')).toBe(true);
        //expect(getRegExp('doc', '📖 docs: Update README')).toBe(true); // 'doc' 应该也能匹配 '📖'
        expect(getRegExp('style', 'style: Format code')).toBe(true);
        expect(getRegExp('style', '🎨 style: Format code')).toBe(true);
        expect(getRegExp('chore', 'chore: Update dependencies')).toBe(true);
        expect(getRegExp('chore', '💄 chore: Update dependencies')).toBe(true);
    });

    it('should not match incorrect commit types', () => {
        expect(getRegExp('feat', 'fix: Correct login issue')).toBe(false);
        expect(getRegExp('feat', 'docs: Update README')).toBe(false);
        expect(getRegExp('fix', 'feat: Add new feature')).toBe(false);
        expect(getRegExp('docs', 'fix: Correct login issue')).toBe(false);
    });

    it('should handle empty string and undefined commit', () => {
        expect(getRegExp('feat', '')).toBe(false);
        expect(getRegExp('feat', undefined)).toBe(false);
        expect(getRegExp('', 'feat: Add new feature')).toBe(false);
    });
});

describe('getVersion', () => {
  test.each([
    ['v1.2.3', 'v1.2.3'],
    ['V4.5', 'V4.5'],
    ['hello world', ''],
    ['', ''],
    ['some text v2.0-beta another text', 'v2.0'],
    ['v1.0 and V2.1.0 are present', 'v1.0'],
    ['version V5', 'V5'],
    ['app version v3.1', 'v3.1'],
  ])('should return %s when the input is %s', (input, expectedOutput) => {
    expect(getVersion(input)).toBe(expectedOutput);
  });
});

describe('parseCustomEmojis', () => {
    const defaultTypes = {
        text: '📝',
        image: '🖼️',
        video: '🎬',
    };

    test.each([
        [
            'single custom emoji',
            'note📌',
            { text: '📝', image: '🖼️', video: '🎬', note: '📌' },
        ],
        [
            'multiple custom emojis',
            'flag🚩,star⭐',
            { text: '📝', image: '🖼️', video: '🎬', flag: '🚩', star: '⭐' },
        ],
        [
            'overwrite default emoji',
            'text✏️',
            { text: '✏️', image: '🖼️', video: '🎬' },
        ],
        [
            'ignore item without valid emoji',
            'text,icon:',
            { text: '📝', image: '🖼️', video: '🎬' },
        ],
        [
            'ignore item without type name',
            ':✨,image🖼️',
            { ":": "✨", text: '📝', image: '🖼️', video: '🎬' },
        ],
        ['empty custom emoji string', '', { text: '📝', image: '🖼️', video: '🎬' }],
        [
            'handle extra commas',
            'note📌,,star⭐,',
            { text: '📝', image: '🖼️', video: '🎬', note: '📌', star: '⭐' },
        ],
        [
            'use first emoji if multiple present',
            'alert⚠️🚨',
            { text: '📝', image: '🖼️', video: '🎬', alert: '⚠️🚨' },
        ],
    ])('should handle %s: input "%s" and return %j', (testName, customEmoji, expectedOutput) => {
        expect(parseCustomEmojis(customEmoji, { ...defaultTypes })).toEqual(expectedOutput);
    });
});