# Firebase Firestore Security Rules

## Overview
Este arquivo contém as regras de segurança do Firebase Firestore para a aplicação CDL, garantindo acesso controlado e validação de dados.

## Como Aplicar as Regras

### 1. Via Firebase Console
1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá para Firestore Database > Rules
4. Copie e cole o conteúdo do arquivo `firestore.rules`
5. Clique em "Publish"

### 2. Via Firebase CLI
```bash
# Instalar Firebase CLI (se ainda não tiver)
npm install -g firebase-tools

# Login no Firebase
firebase login

# Deploy das regras
firebase deploy --only firestore:rules
```

## 🚨 SOLUÇÃO DE PROBLEMA DE PERMISSÕES

### Problema: "Missing or insufficient permissions"
Este erro ocorre quando as regras do Firebase estão bloqueando o acesso porque o usuário não tem a claim `admin: true` ou não está na coleção `/admins/{uid}`.

### Soluções Rápidas:

#### Opção 1: Configurar Claims de Admin (Recomendado)
1. **Execute o script de configuração:**
   ```bash
   # Instale Firebase Admin SDK
   npm install firebase-admin

   # Baixe a chave de serviço do Firebase Console
   # Firebase Console > Project Settings > Service accounts > Generate new private key

   # Execute o script
   node setup-admin.js
   ```

2. **Manualmente via Firebase Console:**
   - Vá para Authentication > Users
   - Selecione o usuário admin
   - Adicione custom claim: `{"admin": true}`

#### Opção 2: Criar Documento de Admin (Fallback)
Crie manualmente um documento na coleção `admins`:
```javascript
// No Firebase Console ou via script
{
  admins: {
    "USER_UID_DO_ADMIN": {
      email: "admin@cdl.com.br",
      createdAt: timestamp,
      isActive: true
    }
  }
}
```

#### Opção 3: Regras Temporárias (Apenas para Desenvolvimento)
Se precisar acesso imediato para testes, modifique temporariamente a função `isAdmin()`:
```javascript
function isAdmin() {
  return isAuthenticated(); // Temporário - permite qualquer usuário logado
}
```

## Estrutura das Regras

### Funções Helper
- `isAuthenticated()`: Verifica se o usuário está autenticado
- `isAdmin()`: Verifica se o usuário é administrador (claim OU documento admins)
- `isValidEmail()`: Valida formato de email
- `isValidCNPJ()`: Valida CNPJ (14 dígitos)
- `isValidPhone()`: Valida telefone (10-11 dígitos)
- `isValidDate()`: Valida data (DD/MM/YYYY)
- `isValidMoney()`: Valida valor monetário (> 0)
- `isValidPaymentMethod()`: Valida método de pagamento
- `isValidTransactionType()`: Valida tipo de transação
- `isValidTransactionStatus()`: Valida status de transação

### Coleções Protegidas

#### 1. Associados (`/associados/{associadoId}`)
- **Read**: Apenas administradores
- **Create**: Apenas administradores com validação completa
- **Update**: Apenas administradores com validações parciais
- **Delete**: Apenas administradores

**Validações:**
- Email formato válido
- CNPJ 14 dígitos
- Telefone 10-11 dígitos
- Status: 'ativo', 'em_negociacao', 'desativado'

#### 2. Categorias Livro Caixa (`/categorias_livro_caixa/{categoriaId}`)
- **Read**: Apenas administradores
- **Create**: Apenas administradores
  - Nome obrigatório (1-50 caracteres)
- **Update**: Apenas administradores
- **Delete**: Apenas administradores

#### 3. Transações Livro Caixa (`/transacoes_livro_caixa/{transacaoId}`)
- **Read**: Apenas administradores
- **Create**: Apenas administradores com validação completa
- **Update**: Apenas administradores com validações parciais
- **Delete**: Apenas administradores

**Validações:**
- Data formato DD/MM/YYYY
- Descrição obrigatória (1-200 caracteres)
- Categoria obrigatória
- Tipo: 'entrada' ou 'saida'
- Valor: número > 0
- Método pagamento: 'pix', 'cartao', 'dinheiro'
- Status: 'confirmado' ou 'pendente'

#### 4. Índice CNPJ (`/associados_cnpj/{cnpj}`)
- **Read/Write**: Apenas administradores

#### 5. Usuários (`/users/{userId}`)
- **Read/Write**: Administradores ou próprio usuário

#### 6. Admins (`/admins/{adminId}`)
- **Read**: Usuários autenticados
- **Create/Update/Delete**: Bloqueado (apenas via backend)

## Segurança Implementada

### Autenticação Obrigatória
- Todas as operações requerem usuário autenticado
- Acesso administrador obrigatório para operações críticas

### Validação de Dados
- Formato de email validado
- CNPJ validado (14 dígitos)
- Telefone validado (10-11 dígitos)
- Datas em formato brasileiro
- Valores monetários positivos
- Strings com tamanho limitado
- Enums com valores permitidos

### Prevenção de Injeção
- Uso de `matches()` para validação de strings
- Verificação de tipo de dados
- Limitação de tamanho de campos

### Auditoria
- Campos `created_at` e `updated_at` obrigatórios
- Rastreamento de modificações

## Configuração de Admin

Para que as regras funcionem corretamente, os usuários administradores precisam ter:
1. **Claim `admin: true`** no token de autenticação, OU
2. **Documento na coleção `/admins/{uid}`**

### Via Firebase Authentication
```javascript
// No backend (Firebase Functions)
const admin = require('firebase-admin');
await admin.auth().setCustomUserClaims(uid, { admin: true });
```

### Via Script Automático
```bash
# Execute o script fornecido
node setup-admin.js

# Para verificar claims atuais
node setup-admin.js --check
```

## Teste das Regras

### Teste no Firebase Console
1. Vá para Firestore Database > Rules
2. Use o simulador de regras
3. Teste diferentes cenários:
   - Usuário não autenticado
   - Usuário autenticado sem admin
   - Usuário administrador

### Cenários de Teste

#### Associados
- Criar associado com dados inválidos (deve falhar)
- Criar associado com dados válidos (deve funcionar)
- Tentar ler sem ser admin (deve falhar)

#### Transações
- Criar transação com valor negativo (deve falhar)
- Criar transação com data inválida (deve falhar)
- Criar transação válida (deve funcionar)

#### Categorias
- Criar categoria com nome vazio (deve falhar)
- Criar categoria válida (deve funcionar)

## Manutenção

### Atualizações Frequentes
- Monitore logs de segurança
- Atualize regras conforme necessário
- Teste novas regras antes de deploy

### Boas Práticas
- Princípio do menor privilégio
- Validações no frontend e backend
- Logs de auditoria para operações críticas
- Backup regular dos dados

## Solução de Problemas

### Erros Comuns
1. **Missing or insufficient permissions**: 
   - Verifique se usuário tem claim `admin: true` OU documento em `/admins/{uid}`
   - Execute o script `setup-admin.js`
   
2. **Invalid data format**: Verifique validações específicas do campo
3. **Rules too complex**: Simplifique lógica quando possível

### Debug
- Use o simulador de regras do Firebase
- Verifique logs do Firebase Functions
- Teste com diferentes tipos de usuário

## Considerações de Performance

- Mantenha regras simples e eficientes
- Evite consultas desnecessárias
- Use índices apropriados no Firestore
- Monitore tempo de execução das regras
