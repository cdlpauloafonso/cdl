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

## Estrutura das Regras

### Funções Helper
- `isAuthenticated()`: Verifica se o usuário está autenticado
- `isAdmin()`: Verifica se o usuário é administrador
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

Para que as regras funcionem corretamente, os usuários administradores precisam ter o claim `admin: true` no token de autenticação.

### Via Firebase Authentication
```javascript
// No backend (Firebase Functions)
const admin = require('firebase-admin');
await admin.auth().setCustomUserClaims(uid, { admin: true });
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
1. **Missing or insufficient permissions**: Verifique se usuário tem claim `admin: true`
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
