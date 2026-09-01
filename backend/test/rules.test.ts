import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { setDoc, getDoc, doc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

async function runTests() {
  console.log("Setting up test environment...");
  testEnv = await initializeTestEnvironment({
    projectId: "demo-genai-track3",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080
    }
  });

  const alice = testEnv.authenticatedContext("alice");
  const bob = testEnv.authenticatedContext("bob");

  console.log("Running tests...");
  
  // Test 1: Alice can write to her own document
  const aliceDocRef = doc(alice.firestore(), "users/alice/entries/1");
  try {
    await assertSucceeds(setDoc(aliceDocRef, { ciphertext: "hello" }));
    console.log("✅ Test 1 Passed: Alice can write to her own entry.");
  } catch (e) {
    console.error("❌ Test 1 Failed", e);
  }

  // Test 2: Bob cannot read Alice's document
  const bobDocRef = doc(bob.firestore(), "users/alice/entries/1");
  try {
    await assertFails(getDoc(bobDocRef));
    console.log("✅ Test 2 Passed: Bob cannot read Alice's entry.");
  } catch (e) {
    console.error("❌ Test 2 Failed", e);
  }

  await testEnv.cleanup();
}

runTests().catch(console.error);
