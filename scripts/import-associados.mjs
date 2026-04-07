/**
 * Importa registros de scripts/associados-import.json para Firestore (coleção associados).
 *
 * Uso (na raiz do repositório), uma das opções:
 *   node scripts/import-associados.mjs /caminho/serviceAccount.json
 *   export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
 *   node scripts/import-associados.mjs
 *   export GOOGLE_APPLICATION_CREDENTIALS=/caminho/serviceAccount.json && node scripts/import-associados.mjs
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(join(root, 'frontend/node_modules/firebase-admin/package.json'));
const admin = require('firebase-admin');

const jsonPath = join(__dirname, 'associados-import.json');
const items = JSON.parse(readFileSync(jsonPath, 'utf8'));

const credFileArg = process.argv[2];

if (!admin.apps.length) {
  if (credFileArg && existsSync(credFileArg)) {
    const key = JSON.parse(readFileSync(credFileArg, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(key) });
  } else {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (raw) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp();
    } else {
      console.error(
        'Credenciais ausentes. Opções:\n' +
          '  node scripts/import-associados.mjs /caminho/serviceAccount.json\n' +
          '  export FIREBASE_SERVICE_ACCOUNT_JSON=\'{"type":"service_account",...}\'\n' +
          '  export GOOGLE_APPLICATION_CREDENTIALS=/caminho/serviceAccount.json'
      );
      process.exit(1);
    }
  }
}

const db = admin.firestore();
const col = db.collection('associados');
const now = admin.firestore.Timestamp.now();

let ok = 0;
for (const data of items) {
  await col.add({
    ...data,
    created_at: now,
    updated_at: now,
  });
  ok += 1;
  if (ok % 20 === 0) console.error(`… ${ok}/${items.length}`);
}

console.log(`Importados ${ok} associados na coleção "associados".`);
