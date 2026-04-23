# 🎂 Birthday Bot — Parabéns Automático para Colaboradores

> Envie e-mails personalizados de aniversário para os colaboradores da sua empresa, de forma totalmente automática, usando Google Apps Script.

<p align="center">
  <img src="https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white"/>
  <img src="https://img.shields.io/badge/Gmail%20API-EA4335?style=for-the-badge&logo=gmail&logoColor=white"/>
  <img src="https://img.shields.io/badge/Google%20Drive-34A853?style=for-the-badge&logo=googledrive&logoColor=white"/>
  <img src="https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=googlesheets&logoColor=white"/>
</p>

---

## ✨ O que o Birthday Bot faz?

Todos os dias, no horário que você definir, o script:

1. 📋 Consulta sua lista de colaboradores (Google Sheets, Smartsheet ou CSV)
2. 🎂 Identifica quem faz aniversário **hoje**
3. ✉️ Envia um e-mail personalizado com imagem e sua assinatura
4. 📩 Copia automaticamente o RH (ou quem você quiser)
5. ⏭️ Ignora colaboradores desligados automaticamente

---

## 🗂️ Fontes de dados suportadas

| Fonte | Quando usar |
|---|---|
| **Google Sheets** | Planilha no Google Drive *(recomendado)* |
| **Smartsheet** | Se sua empresa usa Smartsheet |
| **CSV no Drive** | Exportação de qualquer sistema (Excel, Power BI, etc.) |

> ⚠️ **Power Query** é uma ferramenta do Excel/Power BI e não roda no Apps Script. Se seus dados vierem do Power Query, exporte-os como `.csv` para o Drive e use a opção `csv_drive`.

---

## 📋 Pré-requisitos

- Conta Google (Google Workspace ou Gmail)
- Acesso ao [Google Apps Script](https://script.google.com)
- Uma imagem de aniversário salva no Google Drive
- Sua fonte de dados pronta (Sheets, Smartsheet ou CSV)

---

## 🚀 Passo a passo de instalação

### 1. Crie o projeto no Apps Script

1. Acesse [script.google.com](https://script.google.com)
2. Clique em **"Novo projeto"**
3. Renomeie o projeto para `Birthday Bot` (ou o nome que preferir)
4. Apague o código de exemplo que aparece
5. Cole o conteúdo do arquivo [`BirthdayBot.gs`](./BirthdayBot.gs) no editor
6. Clique em 💾 **Salvar**

---

### 2. Habilite o serviço Gmail API

1. No editor do Apps Script, clique em **"Serviços"** (ícone `+` na barra lateral esquerda)
2. Encontre **Gmail API** na lista
3. Clique em **Adicionar**

> Sem isso, o script não consegue enviar e-mails com a formatação correta.

---

### 3. Prepare sua planilha de colaboradores

Independente da fonte escolhida, você precisa de uma tabela com pelo menos estas colunas:

| Profissional | Nascimento | E-mail corporativo | Data de Desligamento |
|---|---|---|---|
| João Silva | 1990-03-15 | joao@empresa.com | |
| Maria Souza | 1985-07-22 | maria@empresa.com | |
| Pedro Lima | 1992-11-08 | pedro@empresa.com | 2024-01-10 |

- **Nascimento**: aceita os formatos `AAAA-MM-DD` (ex: `1990-03-15`) ou `DD/MM/AAAA` (ex: `15/03/1990`)
- **Data de Desligamento**: se preenchida, o colaborador **não** recebe e-mail
- Os nomes das colunas podem ser diferentes — você vai configurar isso no Passo 5

---

### 4. Suba sua imagem de aniversário no Drive

1. Vá para o [Google Drive](https://drive.google.com)
2. Faça upload da sua imagem de aniversário (PNG ou JPG)
3. Clique com o botão direito → **"Compartilhar"** → **"Qualquer pessoa com o link pode visualizar"**
4. Copie o link. O ID da imagem é o trecho entre `/d/` e `/view`:
   ```
   https://drive.google.com/file/d/ >>ESTE_É_O_ID<< /view
   ```

---

### 5. Configure o script

Abra o arquivo `BirthdayBot.gs` e edite o bloco `CONFIG`:

#### 5a. Escolha a fonte de dados

```javascript
fonteDados: 'google_sheets',  // 'google_sheets' | 'smartsheet' | 'csv_drive'
```

Depois preencha **apenas o bloco** da fonte escolhida:

**Google Sheets:**
```javascript
googleSheets: {
  spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', // ID da planilha
  sheetName: 'Planilha1',  // Nome da aba
},
```
> 💡 O ID está na URL da planilha: `docs.google.com/spreadsheets/d/`**ID_AQUI**`/edit`

**Smartsheet:**
```javascript
smartsheet: {
  sheetId:  '5567823049871236',
  apiToken: 'seu-token-aqui',
},
```
> 💡 Token: Smartsheet → Conta → Apps & Integrations → API Access → Generate New Access Token

**CSV no Drive:**
```javascript
csv: {
  driveFileId: 'ID_DO_SEU_ARQUIVO_CSV',
},
```

#### 5b. Configure as colunas

```javascript
colunas: {
  nome:          'Profissional',        // Título exato da coluna de nomes
  dataNascimento:'Nascimento',          // Título exato da coluna de datas
  email:         'E-mail corporativo',  // Título exato da coluna de e-mails
  desligamento:  'Data de Desligamento' // Título exato (pode deixar mesmo se não usar)
},
```

> ⚠️ Os títulos devem ser **idênticos** ao que está na planilha, incluindo acentos, espaços e maiúsculas.

#### 5c. Configure o remetente e a assinatura

```javascript
remetente: {
  forcarNome:  'Equipe de Gente & Gestão',  // Nome que aparece no e-mail
  forcarEmail: '',                           // Deixe '' para usar a conta logada
  assinatura: `
    <table style="font-family: Arial, sans-serif; font-size: 13px;">
      <tr><td>
        <strong>Seu Nome</strong><br>
        Seu Cargo | sua@empresa.com.br
      </td></tr>
    </table>
  `,
},
```

#### 5d. Configure a imagem

```javascript
imagemPrincipal: {
  driveId: 'ID_DA_IMAGEM_QUE_VOCE_COPIOU_NO_PASSO_4',
  altText: 'Feliz Aniversário!',
},
```

---

### 6. Teste o script

Antes de ativar o envio automático, **sempre teste primeiro**:

1. No editor do Apps Script, selecione a função `EnvioManual` no menu suspenso
2. Clique em ▶️ **Executar**
3. Autorize as permissões quando solicitado (é pedido apenas na primeira vez)
4. Verifique os **Logs** (`Ctrl+Enter` ou menu Ver → Logs)

Se aparecer `✅ E-mail enviado para...` — funcionou! 🎉

> 💡 Para testar sem depender de aniversários reais, edite temporariamente uma data na planilha para hoje.

---

### 7. Ative o envio automático diário

1. No editor do Apps Script, clique no ícone de **⏰ Acionadores** (relógio na barra lateral)
2. Clique em **"+ Adicionar acionador"** (canto inferior direito)
3. Configure assim:

| Campo | Valor |
|---|---|
| Função a executar | `EnvioAutomatico_Acionador` |
| Implantação | `Principal` |
| Origem do evento | `Acionado por tempo` |
| Tipo de acionador | `Temporizador diário` |
| Horário | Escolha um (sugestão: 8h–9h da manhã) |

4. Clique em **Salvar** ✅

---

## ⚙️ Configurações adicionais

| Configuração | Descrição |
|---|---|
| `usarNomeCompleto: true` | Usa o nome completo no lugar do primeiro nome |
| `ccEmail: 'rh@empresa.com'` | Envia cópia para este e-mail |
| `enviarFinsDeSemana: false` | Pula envios em sábado e domingo |
| `textoPersonalizado.ativo: true` | Adiciona um texto acima da imagem |

---

## 🔒 Segurança

- O script roda **na sua conta Google** — ele não acessa dados de ninguém além de você
- Se usar o token do Smartsheet, **não compartilhe o arquivo** com ele preenchido
- Para maior segurança em ambientes corporativos, considere guardar o token com `PropertiesService`:
  ```javascript
  // Salvar (execute uma vez):
  PropertiesService.getScriptProperties().setProperty('SMARTSHEET_TOKEN', 'seu-token');
  
  // Usar no código:
  const token = PropertiesService.getScriptProperties().getProperty('SMARTSHEET_TOKEN');
  ```

---

## ❓ Problemas comuns

**O script não encontra os aniversariantes**
→ Verifique se os títulos das colunas em `CONFIG.colunas` são idênticos aos da planilha (incluindo acentos)

**Erro de permissão ao enviar e-mail**
→ Certifique-se de ter adicionado o serviço **Gmail API** (Passo 2)

**A imagem não aparece no e-mail**
→ Confirme que o arquivo no Drive está com permissão "Qualquer pessoa com o link pode ver"

**Colaboradores desligados ainda recebem e-mail**
→ Verifique se o título da coluna em `CONFIG.colunas.desligamento` está correto

**Erro no Smartsheet: HTTP 401**
→ Seu API Token expirou ou está incorreto. Gere um novo em Smartsheet → Conta → API Access

---

## 📄 Licença

MIT — use, modifique e distribua à vontade. Se melhorar, considera abrir um Pull Request! 😊

---

<p align="center">Feito com ☕ e muito amor pela equipe de G&G</p>
