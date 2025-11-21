module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [2, 'never', []], // subject 대소문자 규칙 비활성화
  },
};
