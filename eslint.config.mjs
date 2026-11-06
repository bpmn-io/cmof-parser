import bpmnIoPlugin from 'eslint-plugin-bpmn-io';

const files = {
  ignored: [
    'coverage',
    'tmp',
    'docs/api'
  ],
  lib: [
    'index.js',
    'lib/**/*.js'
  ],
  test: [
    'test/**/*.js'
  ]
};

export default [
  {
    ignores: files.ignored
  },
  ...bpmnIoPlugin.configs.node.map(config => ({
    ...config,
    files: files.lib,
    languageOptions: {
      ...config.languageOptions,
      sourceType: 'commonjs'
    }
  })),
  ...bpmnIoPlugin.configs.node.map(config => ({
    ...config,
    files: files.test,
    languageOptions: {
      ...config.languageOptions,
      sourceType: 'commonjs'
    }
  })),
  ...bpmnIoPlugin.configs.mocha.map(config => ({
    ...config,
    files: files.test
  }))
];
