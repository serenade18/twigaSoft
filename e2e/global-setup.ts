import { resetDatabase } from './support';

// Migrates the e2e database before the first test; each spec also resets it as needed.
export default function globalSetup() {
  resetDatabase();
}
