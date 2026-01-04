// biome-ignore-all lint/suspicious/noTemplateCurlyInString: requested by the release-it config
import type { Config } from 'release-it';

export default {
  plugins: {
    '@release-it-plugins/workspaces': {
      skipChecks: true,
    },
    '@release-it/conventional-changelog': {
      preset: {
        name: 'angular',
      },
      infile: 'CHANGELOG.md',
    },
  },
  hooks: {
    'after:bump': 'npm run build',
  },
  git: {
    commitMessage: 'chore: release v${version} [skip ci]',
    tagName: 'v${version}',
  },
  github: {
    releaseName: 'v${version}',
  },
  npm: {
    skipChecks: true,
    publish: false,
  },
} satisfies Config;
