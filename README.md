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

#### 5c. Configure o remetente

```javascript
remetente: {
  nomeExibicao:      'Equipe de Gente & Gestão', // Nome no campo "De:" — deixe '' para usar o da conta Google
  incluirAssinatura: true,                        // true = usa a assinatura do Gmail | false = sem assinatura
},
```

> 💡 O e-mail do remetente é sempre o da **conta Google logada** no Apps Script — isso não é configurável por segurança. Só o nome de exibição pode ser alterado.
>
> A assinatura, quando ativada, é puxada automaticamente das configurações do Gmail do remetente (Configurações → Ver todas as configurações → Assinatura). Nada precisa ser colado aqui.

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
| `remetente.nomeExibicao: 'Equipe RH'` | Altera o nome exibido no campo "De:" |
| `remetente.incluirAssinatura: false` | Envia o e-mail sem assinatura |

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

# ENGLISH VERSION 
# 🎂 Birthday Bot — Automated Employee Birthday Emails

> Send personalized birthday emails to your company’s employees automatically using Google Apps Script.

<p align="center">
  <img src="https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white"/>
  <img src="https://img.shields.io/badge/Gmail%20API-EA4335?style=for-the-badge&logo=gmail&logoColor=white"/>
  <img src="https://img.shields.io/badge/Google%20Drive-34A853?style=for-the-badge&logo=googledrive&logoColor=white"/>
  <img src="https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=googlesheets&logoColor=white"/>
</p>

---

## ✨ What does Birthday Bot do?

Every day, at the time you define, the script will:

1. 📋 Read your employee database (Google Sheets, Smartsheet, or CSV)
2. 🎂 Identify who has a birthday **today**
3. ✉️ Send a personalized email with an image and your signature
4. 📩 Automatically CC HR (or anyone you choose)
5. ⏭️ Skip terminated employees automatically

---

## 🗂️ Supported Data Sources

| Source | When to use |
|---|---|
| **Google Sheets** | Spreadsheet stored in Google Drive *(recommended)* |
| **Smartsheet** | If your company uses Smartsheet |
| **CSV (Drive)** | Export from any system (Excel, Power BI, etc.) |

> ⚠️ **Power Query** is an Excel/Power BI feature and does not run in Apps Script. If your data comes from Power Query, export it as a `.csv` file to Google Drive and use the `csv_drive` option.

---

## 📋 Requirements

- Google account (Google Workspace or Gmail)
- Access to https://script.google.com
- A birthday image stored in Google Drive
- Your data source ready (Sheets, Smartsheet, or CSV)

---

## 🚀 Setup Guide

### 1. Create the Apps Script project

1. Go to https://script.google.com  
2. Click **"New Project"**  
3. Rename it to `Birthday Bot` (or any name you prefer)  
4. Delete the default code  
5. Paste the content of `BirthdayBot.gs` into the editor  
6. Click 💾 **Save**

---

### 2. Enable Gmail API

1. In the Apps Script editor, click **"Services"** (➕ icon on the left sidebar)  
2. Find **Gmail API**  
3. Click **Add**

> Without this, the script cannot send properly formatted emails.

---

### 3. Prepare your employee data

Your dataset must include at least the following columns:

| Name | Birthdate | Corporate Email | Termination Date |
|---|---|---|---|
| John Smith | 1990-03-15 | john@company.com | |
| Mary Souza | 1985-07-22 | mary@company.com | |
| Pedro Lima | 1992-11-08 | pedro@company.com | 2024-01-10 |

- **Birthdate** formats supported: `YYYY-MM-DD` or `DD/MM/YYYY`  
- **Termination Date**: if filled, the employee will **not** receive emails  
- Column names can be customized in Step 5  

---

### 4. Upload your birthday image

1. Go to https://drive.google.com  
2. Upload your birthday image (PNG or JPG)  
3. Right-click → **Share** → *Anyone with the link can view*  
4. Copy the link  

The image ID is the part between `/d/` and `/view`:

```
https://drive.google.com/file/d/THIS_IS_THE_ID/view
```

---

### 5. Configure the script

Open `BirthdayBot.gs` and edit the `CONFIG` block:

#### 5a. Choose your data source

```javascript
fonteDados: 'google_sheets',  // 'google_sheets' | 'smartsheet' | 'csv_drive'
```

Fill only the selected source:

**Google Sheets**
```javascript
googleSheets: {
  spreadsheetId: 'YOUR_SPREADSHEET_ID',
  sheetName: 'Sheet1',
},
```

**Smartsheet**
```javascript
smartsheet: {
  sheetId:  'YOUR_SHEET_ID',
  apiToken: 'YOUR_API_TOKEN',
},
```

**CSV (Drive)**
```javascript
csv: {
  driveFileId: 'YOUR_CSV_FILE_ID',
},
```

---

#### 5b. Configure columns

```javascript
colunas: {
  nome:          'Name',
  dataNascimento:'Birthdate',
  email:         'Corporate Email',
  desligamento:  'Termination Date'
},
```

> ⚠️ Column names must match **exactly** (including spaces and capitalization).

---

#### 5c. Configure sender

```javascript
remetente: {
  nomeExibicao:      'People & Culture Team', // Display name in "From:"
  incluirAssinatura: true,                    // true = use Gmail signature | false = no signature
},
```

> 💡 The sender email is always the **logged-in Google account** used in Apps Script — this cannot be changed for security reasons. Only the display name can be customized.
>
> When enabled, the signature is automatically pulled from Gmail settings (Settings → See all settings → Signature).

---

#### 5d. Configure the image

```javascript
imagemPrincipal: {
  driveId: 'IMAGE_ID_FROM_STEP_4',
  altText: 'Happy Birthday!',
},
```

---

### 6. Test the script

Before enabling automation:

1. Select function `EnvioManual`  
2. Click ▶️ **Run**  
3. Grant permissions (first time only)  
4. Check logs (`View → Logs`)

If you see `✅ Email sent to...` — it’s working 🎉  

> 💡 Tip: temporarily change a birthdate to today for testing.

---

### 7. Enable daily automation

1. Open **Triggers (⏰ icon)**  
2. Click **"+ Add Trigger"**  
3. Configure:

| Field | Value |
|---|---|
| Function | `EnvioAutomatico_Acionador` |
| Deployment | `Head` |
| Event Source | `Time-driven` |
| Trigger Type | `Daily` |
| Time | Choose (recommended: 8–9 AM) |

4. Click **Save** ✅

---

## ⚙️ Additional Settings

| Setting | Description |
|---|---|
| `usarNomeCompleto: true` | Use full name instead of first name |
| `ccEmail: 'hr@company.com'` | Send a copy to this email |
| `enviarFinsDeSemana: false` | Skip weekends |
| `textoPersonalizado.ativo: true` | Add custom text above the image |
| `remetente.nomeExibicao: 'HR Team'` | Change display name in "From:" |
| `remetente.incluirAssinatura: false` | Send email without signature |

---

## 🔒 Security

- The script runs under your Google account  
- It only accesses data you provide  
- Do not share your Smartsheet API token  

For better security, use `PropertiesService`:

```javascript
// Save once
PropertiesService.getScriptProperties().setProperty('SMARTSHEET_TOKEN', 'your-token');

// Retrieve
const token = PropertiesService.getScriptProperties().getProperty('SMARTSHEET_TOKEN');
```

---

## ❓ Common Issues

**No birthdays found**  
→ Check column names in `CONFIG.colunas`

**Permission error sending emails**  
→ Ensure Gmail API is enabled  

**Image not displaying**  
→ Check sharing settings in Drive  

**Terminated employees still receiving emails**  
→ Verify termination column mapping  

**Smartsheet error (HTTP 401)**  
→ Token is invalid or expired  

---

## 📄 License

MIT — feel free to use, modify, and distribute.  
If you improve it, consider opening a Pull Request 😊

---

<p align="center">Made with ☕ and a lot of love for People & Culture teams 💙</p>
