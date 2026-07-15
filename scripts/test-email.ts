import { verifyEmailConfig } from '../api/lib/mailer.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('--- TESTING EMAIL CONFIGURATION ---');
  const result = await verifyEmailConfig();
  console.log('Validation Result:', JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error('Test execution failed:', err);
});
