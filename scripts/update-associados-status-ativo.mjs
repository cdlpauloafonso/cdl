/**
 * Atualiza TODOS os documentos da coleção "associados" para status = "ativo".
 *
 * Uso:
 *   node scripts/update-associados-status-ativo.mjs /caminho/serviceAccount.json
 * ou:
 *   export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
 *   node scripts/update-associados-status-ativo.mjs
 * ou:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/caminho/serviceAccount.json
 *   node scripts/update-associados-status-ativo.mjs
 */

import { createRequire } from 'module';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(join(root, 'frontend/node_modules/firebase-admin/package.json'));
const admin = require('firebase-admin');

function initAdmin() {
  if (admin.apps.length) return;
  const credFileArg = process.argv[2];
  if (credFileArg && existsSync(credFileArg)) {
    const key = JSON.parse(readFileSync(credFileArg, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(key) });
    return;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
    return;
  }
  // Tentativa com Application Default Credentials (ADC)
  admin.initializeApp();
}

async function main() {
  try {
    initAdmin();
  } catch (err) {
    console.error('Falha ao inicializar Firebase Admin:', err);
    process.exit(1);
  }

  const db = admin.firestore();
  const snap = await db.collection('associados').get();

  if (snap.empty) {
    console.log('Nenhum associado encontrado.');
    return;
  }

  let updated = 0;
  let batch = db.batch();
  let ops = 0;

  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      status: 'ativo',
      updated_at: admin.firestore.Timestamp.now(),
    });
    updated += 1;
    ops += 1;

    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
      console.error(`... ${updated}/${snap.size} atualizado(s)`);
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  console.log(`Concluído: ${updated} associado(s) atualizado(s) para status="ativo".`);
}

main().catch((err) => {
  console.error('Erro ao atualizar status dos associados:', err);
  process.exit(1);
});

