import { maskPII } from './pii-mask';

function runTests() {
  const tests = [
    { input: "My email is okywoww@gmail.com", expected: "My email is [REDACTED_EMAIL]" },
    { input: "Call me at +62 812-3456-7890 tomorrow", expected: "Call me at [PHONE_REDACTED] tomorrow" },
    { input: "No PII here, just a journal entry about cats.", expected: "No PII here, just a journal entry about cats." }
  ];

  let passed = 0;
  tests.forEach((t, i) => {
    const result = maskPII(t.input);
    if (result === t.expected) {
      console.log(`✅ Test ${i+1} Passed`);
      passed++;
    } else {
      console.error(`❌ Test ${i+1} Failed: Expected "${t.expected}", got "${result}"`);
    }
  });
  console.log(`\n${passed}/${tests.length} passed.`);
}

runTests();
