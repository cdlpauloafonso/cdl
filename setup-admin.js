// Script para configurar claims de admin no Firebase
// Execute este script no ambiente Node.js com Firebase Admin SDK

const admin = require('firebase-admin');

// Configuração do Firebase (substitua com suas credenciais)
const serviceAccount = require('./path/to/your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'sitecdl'
});

async function setupAdminClaims() {
  try {
    // Lista de emails que devem ser administradores
    const adminEmails = [
      'admin@cdl.com.br', // Substitua com o email real do admin
      // Adicione outros emails de admin aqui
    ];

    for (const email of adminEmails) {
      try {
        // Buscar usuário pelo email
        const userRecord = await admin.auth().getUserByEmail(email);
        
        // Configurar claim de admin
        await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
        
        // Criar documento na coleção admins (fallback)
        await admin.firestore().collection('admins').doc(userRecord.uid).set({
          email: email,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          isActive: true
        });

        console.log(`✅ Admin claim configurado para: ${email}`);
        
        // Revogar todos os tokens para forçar re-login
        await admin.auth().revokeRefreshTokens(userRecord.uid);
        
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          console.log(`⚠️  Usuário não encontrado: ${email}`);
        } else {
          console.error(`❌ Erro ao configurar ${email}:`, error);
        }
      }
    }

    console.log('\n🎉 Configuração concluída!');
    console.log('📝 Os usuários precisarão fazer login novamente para receber as novas claims.');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Função para verificar claims atuais
async function checkCurrentClaims() {
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    const users = listUsersResult.users;

    console.log('\n📋 Claims atuais dos usuários:');
    users.forEach(user => {
      const claims = user.customClaims || {};
      console.log(`${user.email}: admin = ${claims.admin || false}`);
    });
  } catch (error) {
    console.error('❌ Erro ao verificar claims:', error);
  }
}

// Executar configuração
if (process.argv.includes('--check')) {
  checkCurrentClaims();
} else {
  setupAdminClaims();
}
