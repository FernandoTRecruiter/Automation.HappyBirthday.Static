/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║           🎂  BIRTHDAY BOT — SISTEMA AUTOMÁTICO DE ANIVERSÁRIOS  🎂         ║
 * ║                          Google Apps Script    !                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Envia e-mails personalizados de parabéns automaticamente no aniversário de
 * cada colaborador, com imagem, assinatura e cópia para RH.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * 📋 PRÉ-REQUISITOS
 * ──────────────────────────────────────────────────────────────────────────────
 *  1. Conta Google (Google Workspace ou Gmail pessoal)
 *  2. Acesso ao Google Apps Script → https://script.google.com
 *  3. Serviço Gmail API habilitado:
 *       Apps Script → Serviços (+) → Gmail API → adicionar
 *  4. Uma imagem de aniversário salva no Google Drive
 *  5. Dependendo da fonte de dados escolhida (veja abaixo):
 *       • Google Sheets: planilha compartilhada com sua conta
 *       • Smartsheet:    API Token + Sheet ID
 *       • CSV no Drive:  arquivo .csv salvo no Google Drive
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * 🗂️ FONTES DE DADOS SUPORTADAS — escolha UMA:
 * ──────────────────────────────────────────────────────────────────────────────
 *
 *  ┌─────────────────┬──────────────────────────────────────────────────────┐
 *  │ FONTE           │ O QUE PREENCHER                                      │
 *  ├─────────────────┼──────────────────────────────────────────────────────┤
 *  │ google_sheets   │ googleSheets.spreadsheetId + googleSheets.sheetName  │
 *  │ smartsheet      │ smartsheet.sheetId + smartsheet.apiToken             │
 *  │ csv_drive       │ csv.driveFileId                                      │
 *  └─────────────────┴──────────────────────────────────────────────────────┘
 *
 *  ⚠️  Power Query é uma ferramenta do Excel/Power BI e não roda no Apps Script.
 *      Se seus dados vierem de lá, exporte como CSV para o Drive e use csv_drive.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ⚙️ PASSO A PASSO DE CONFIGURAÇÃO
 * ──────────────────────────────────────────────────────────────────────────────
 *
 *  PASSO 1 — Defina a fonte de dados
 *    → Altere CONFIG.fonteDados para: 'google_sheets', 'smartsheet' ou 'csv_drive'
 *    → Preencha apenas o bloco correspondente à sua fonte
 *
 *  PASSO 2 — Configure as colunas
 *    → Em CONFIG.colunas, coloque os títulos EXATOS das colunas da sua planilha
 *      (maiúsculas, acentos e espaços importam!)
 *    Exemplo de planilha mínima necessária:
 *      | Profissional | Nascimento | E-mail corporativo | Data de Desligamento |
 *
 *  PASSO 3 — Configure o remetente
 *    → CONFIG.remetente.nomeExibicao: nome que aparece no campo "De:" do e-mail
 *      Deixe '' para usar o nome padrão da conta Google logada
 *    → CONFIG.remetente.incluirAssinatura: true = usa a assinatura do Gmail | false = envia sem assinatura
 *    → O e-mail do remetente é sempre o da conta Google logada no Apps Script (não é editável)
 *
 *  PASSO 4 — Configure a imagem
 *    → Suba uma imagem ao Google Drive
 *    → Clique com botão direito → "Compartilhar" → "Qualquer pessoa com o link pode ver"
 *    → Copie o ID do link (parte entre /d/ e /view) e cole em CONFIG.imagemPrincipal.driveId
 *
 *  PASSO 5 — Ajuste o e-mail
 *    → Personalize CONFIG.email.titulo e CONFIG.email.textoPersonalizado
 *    → Use {{primeiroNome}} para inserir o nome do aniversariante dinamicamente
 *
 *  PASSO 6 — Crie o Acionador automático
 *    → No Apps Script: Acionadores (ícone de relógio) → + Adicionar acionador
 *    → Função: EnvioAutomatico_Acionador
 *    → Tipo: Acionado por tempo → Temporizador diário → escolha o horário
 *    → Salvar ✅
 *
 *  PASSO 7 — Teste antes de ativar!
 *    → Execute a função EnvioManual para testar sem esperar o acionador
 *    → Verifique os Logs (Ctrl+Enter) para confirmar que funcionou
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * 🔒 SEGURANÇA
 * ──────────────────────────────────────────────────────────────────────────────
 *  • Nunca compartilhe este arquivo com o API Token do Smartsheet preenchido
 *  • Para maior segurança, use PropertiesService (veja comentário no código)
 *  • O script acessa apenas as planilhas e e-mails da sua própria conta Google
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * 📞 SUPORTE & REPOSITÓRIO
 * ──────────────────────────────────────────────────────────────────────────────
 *  GitHub: https://github.com/SEU_USUARIO/birthday-bot
 *  Dúvidas? Abra uma Issue no repositório acima.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */


// ==============================================================================
// 🔧 CONFIGURAÇÕES — EDITE APENAS ESTE BLOCO
// ==============================================================================

const CONFIG = {

  // ----------------------------------------------------------------------------
  // 🗂️ FONTE DE DADOS
  // Escolha UMA das opções abaixo e preencha apenas o bloco correspondente:
  //   'google_sheets' | 'smartsheet' | 'csv_drive'
  // ----------------------------------------------------------------------------
  fonteDados: 'google_sheets',   // ← ALTERE AQUI

  // ------ Google Sheets -------------------------------------------------------
  // Encontre o ID na URL da planilha:
  //   https://docs.google.com/spreadsheets/d/ >>ESTE_TRECHO<< /edit
  googleSheets: {
    spreadsheetId: 'COLE_AQUI_O_ID_DA_SUA_PLANILHA',
    sheetName:     'Planilha1',    // Nome da aba (aparece na aba inferior)
  },

  // ------ Smartsheet ----------------------------------------------------------
  // sheetId:    URL do Smartsheet → número no final
  // apiToken:   Smartsheet → Conta → Apps & Integrations → API Access → Generate Token
  smartsheet: {
    sheetId:   'COLE_AQUI_O_SHEET_ID',
    apiToken:  'COLE_AQUI_O_API_TOKEN',
  },

  // ------ CSV no Google Drive -------------------------------------------------
  // driveFileId: abra o arquivo no Drive → ID na URL entre /d/ e /view
  // Formato esperado do CSV: linha 1 = cabeçalhos, demais linhas = dados
  csv: {
    driveFileId: 'COLE_AQUI_O_ID_DO_ARQUIVO_CSV',
  },

  // ----------------------------------------------------------------------------
  // 📊 NOMES DAS COLUNAS
  // Coloque o título EXATO de cada coluna na sua planilha/fonte de dados
  // (respeitando maiúsculas, acentos e espaços)
  // ----------------------------------------------------------------------------
  colunas: {
    nome:          'Profissional',           // Nome completo do colaborador
    dataNascimento:'Nascimento',             // Formato esperado: AAAA-MM-DD ou DD/MM/AAAA
    email:         'E-mail corporativo',     // E-mail para receber os parabéns
    desligamento:  'Data de Desligamento',   // Se preenchida, o colaborador é ignorado
  },

  // ----------------------------------------------------------------------------
  // 👤 NOME NO E-MAIL
  // false → somente o primeiro nome  (ex: "João")
  // true  → nome completo            (ex: "João Silva")
  // ----------------------------------------------------------------------------
  usarNomeCompleto: false,

  // ----------------------------------------------------------------------------
  // 📧 CÓPIA (CC)
  // Deixe '' para não copiar ninguém
  // ----------------------------------------------------------------------------
  ccEmail: 'rh@suaempresa.com.br',

  // ----------------------------------------------------------------------------
  // 👤 REMETENTE
  // O e-mail usado é sempre o da conta Google logada no Apps Script.
  // Aqui você só precisa definir como seu nome vai aparecer no e-mail.
  // ----------------------------------------------------------------------------
  remetente: {
    // Nome de exibição no campo "De:" do e-mail
    // Exemplos: 'Equipe de RH', 'Gente & Gestão', 'Fernando Leandro'
    // Deixe '' para usar o nome padrão configurado na conta Google
    nomeExibicao: 'Equipe de Gente & Gestão',

    // Incluir assinatura no e-mail?
    // true  → usa a assinatura padrão configurada no Gmail do remetente
    // false → envia sem assinatura
    incluirAssinatura: true,
  },

  // ----------------------------------------------------------------------------
  // 💌 CONTEÚDO DO E-MAIL
  // Use {{primeiroNome}} em qualquer lugar para inserir o nome dinamicamente
  // ----------------------------------------------------------------------------
  email: {
    titulo: 'Feliz Aniversário, {{primeiroNome}}! 🥳',

    // Bloco de texto acima da imagem — ative se quiser uma mensagem personalizada
    textoPersonalizado: {
      ativo: false,
      conteudo: `
        <div style="text-align: center; font-family: Arial, sans-serif; color: #333; margin-bottom: 20px;">
          <h2 style="color: #2c3e50;">Parabéns, {{primeiroNome}}! 🎉</h2>
          <p style="font-size: 16px; line-height: 1.6;">
            Que seu dia seja repleto de alegrias, conquistas e momentos especiais!<br>
            Desejamos um ano cheio de sucesso e realizações.
          </p>
        </div>
      `
    },

    // Enviar em sábados e domingos?
    // true  → envia todos os dias
    // false → envia apenas em dias úteis (seg–sex)
    enviarFinsDeSemana: true,
  },

  // ----------------------------------------------------------------------------
  // 🖼️ IMAGEM PRINCIPAL
  // driveId: ID do arquivo no Google Drive (veja Passo 4 na documentação acima)
  // ----------------------------------------------------------------------------
  imagemPrincipal: {
    driveId: 'COLE_AQUI_O_ID_DA_IMAGEM_NO_DRIVE',
    altText: 'Imagem de parabéns de aniversário',
  },

};


// ==============================================================================
// 🚀 PONTOS DE ENTRADA — NÃO É NECESSÁRIO EDITAR ABAIXO DESTA LINHA
// ==============================================================================

/**
 * ⏰ Chamado automaticamente pelo Acionador diário configurado no Apps Script.
 *    NÃO execute manualmente — use EnvioManual para testes.
 */
function EnvioAutomatico_Acionador() {
  Logger.log('⏰ [ACIONADOR] Iniciando envio automático...');
  _executarEnvio();
}

/**
 * 🖱️ Execute manualmente para testar ou forçar um envio pontual.
 *    Respeita todas as mesmas regras do envio automático.
 */
function EnvioManual() {
  Logger.log('🖱️ [MANUAL] Iniciando envio manual...');
  _executarEnvio();
}


// ==============================================================================
// ⚙️ SISTEMA PRINCIPAL (INTERNO)
// ==============================================================================

let _variaveis = {};

function _executarEnvio() {
  if (!_validarConfiguracao()) return;

  const hoje = new Date();

  if (!CONFIG.email.enviarFinsDeSemana && !_ehDiaUtil(hoje)) {
    Logger.log('🌅 Final de semana — envio desativado nas configurações.');
    return;
  }

  Logger.log(`🔍 Buscando aniversariantes de ${hoje.getDate()}/${hoje.getMonth() + 1}...`);
  Logger.log(`📦 Fonte de dados: ${CONFIG.fonteDados}`);

  const aniversariantes = _buscarAniversariantes(hoje);

  if (aniversariantes.length === 0) {
    Logger.log('🍃 Nenhum aniversariante hoje.');
    return;
  }

  Logger.log(`🎂 ${aniversariantes.length} aniversariante(s) encontrado(s).`);
  aniversariantes.forEach(pessoa => _enviarEmailParabens(pessoa.email, pessoa.nome));
}

// ==============================================================================
// 🗂️ ADAPTADORES DE FONTE DE DADOS
// ==============================================================================

/**
 * Busca aniversariantes de hoje independente da fonte configurada.
 * Retorna array de { nome, email }
 */
function _buscarAniversariantes(hoje) {
  const fonte = CONFIG.fonteDados;

  if (fonte === 'google_sheets') return _buscarDeGoogleSheets(hoje);
  if (fonte === 'smartsheet')    return _buscarDeSmartsheet(hoje);
  if (fonte === 'csv_drive')     return _buscarDeCsvDrive(hoje);

  Logger.log(`❌ Fonte de dados inválida: "${fonte}". Use 'google_sheets', 'smartsheet' ou 'csv_drive'.`);
  return [];
}

// ──────────────────────────────────────────────────────────────────────────────
// 📗 Google Sheets
// ──────────────────────────────────────────────────────────────────────────────
function _buscarDeGoogleSheets(hoje) {
  try {
    const ss    = SpreadsheetApp.openById(CONFIG.googleSheets.spreadsheetId);
    const sheet = ss.getSheetByName(CONFIG.googleSheets.sheetName);

    if (!sheet) {
      Logger.log(`❌ Aba "${CONFIG.googleSheets.sheetName}" não encontrada na planilha.`);
      return [];
    }

    const dados = sheet.getDataRange().getValues();
    return _filtrarAniversariantes(dados, hoje);

  } catch (e) {
    Logger.log(`❌ Erro ao acessar Google Sheets: ${e.message}`);
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 📘 Smartsheet
// ──────────────────────────────────────────────────────────────────────────────
function _buscarDeSmartsheet(hoje) {
  try {
    const response = UrlFetchApp.fetch(
      `https://api.smartsheet.com/2.0/sheets/${CONFIG.smartsheet.sheetId}`,
      {
        headers: { Authorization: `Bearer ${CONFIG.smartsheet.apiToken}` },
        muteHttpExceptions: true,
      }
    );

    if (response.getResponseCode() !== 200) {
      Logger.log(`❌ Smartsheet retornou HTTP ${response.getResponseCode()}`);
      return [];
    }

    const data    = JSON.parse(response.getContentText());
    const colunas = {};
    data.columns?.forEach(col => { colunas[col.title] = col.id; });

    const idNome         = colunas[CONFIG.colunas.nome];
    const idData         = colunas[CONFIG.colunas.dataNascimento];
    const idEmail        = colunas[CONFIG.colunas.email];
    const idDesligamento = colunas[CONFIG.colunas.desligamento] || null;

    if (!idNome || !idData || !idEmail) {
      Logger.log('❌ Uma ou mais colunas obrigatórias não foram encontradas no Smartsheet. Verifique CONFIG.colunas.');
      return [];
    }

    const diaAtual = hoje.getDate();
    const mesAtual = hoje.getMonth() + 1;
    const resultado = [];

    data.rows?.forEach(row => {
      const getVal = id => row.cells?.find(c => c.columnId === id)?.value || null;

      const nome      = getVal(idNome);
      const dataStr   = getVal(idData);
      const email     = getVal(idEmail);
      const saiu      = idDesligamento ? getVal(idDesligamento) : null;

      if (!nome || !dataStr || !email) return;
      if (saiu) { Logger.log(`⏭️ ${nome} ignorado — desligado.`); return; }

      const [dia, mes] = _extrairDiaMes(dataStr);
      if (dia === diaAtual && mes === mesAtual) {
        resultado.push({ nome: _resolverNome(nome), email });
      }
    });

    return resultado;

  } catch (e) {
    Logger.log(`❌ Erro ao acessar Smartsheet: ${e.message}`);
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 📄 CSV no Google Drive
// ──────────────────────────────────────────────────────────────────────────────
function _buscarDeCsvDrive(hoje) {
  try {
    const file    = DriveApp.getFileById(CONFIG.csv.driveFileId);
    const conteudo = file.getBlob().getDataAsString('UTF-8');
    const linhas   = Utilities.parseCsv(conteudo);

    if (linhas.length < 2) {
      Logger.log('❌ CSV vazio ou sem dados (apenas cabeçalho).');
      return [];
    }

    return _filtrarAniversariantes(linhas, hoje);

  } catch (e) {
    Logger.log(`❌ Erro ao ler CSV do Drive: ${e.message}`);
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 🔄 Filtro comum (Google Sheets e CSV)
// Espera array 2D onde linha 0 = cabeçalhos, demais = dados
// ──────────────────────────────────────────────────────────────────────────────
function _filtrarAniversariantes(dados, hoje) {
  const cabecalhos = dados[0].map(h => h.toString().trim());

  const idx = {
    nome:         cabecalhos.indexOf(CONFIG.colunas.nome),
    data:         cabecalhos.indexOf(CONFIG.colunas.dataNascimento),
    email:        cabecalhos.indexOf(CONFIG.colunas.email),
    desligamento: cabecalhos.indexOf(CONFIG.colunas.desligamento),
  };

  if (idx.nome === -1 || idx.data === -1 || idx.email === -1) {
    Logger.log(`❌ Colunas obrigatórias não encontradas. Cabeçalhos encontrados: ${cabecalhos.join(', ')}`);
    Logger.log(`   Esperado: "${CONFIG.colunas.nome}", "${CONFIG.colunas.dataNascimento}", "${CONFIG.colunas.email}"`);
    return [];
  }

  const diaAtual = hoje.getDate();
  const mesAtual = hoje.getMonth() + 1;
  const resultado = [];

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    const nome    = linha[idx.nome]?.toString().trim();
    const dataStr = linha[idx.data]?.toString().trim();
    const email   = linha[idx.email]?.toString().trim();
    const saiu    = idx.desligamento !== -1 ? linha[idx.desligamento]?.toString().trim() : '';

    if (!nome || !dataStr || !email) continue;
    if (saiu) { Logger.log(`⏭️ ${nome} ignorado — desligado.`); continue; }

    const [dia, mes] = _extrairDiaMes(dataStr);
    if (dia === diaAtual && mes === mesAtual) {
      resultado.push({ nome: _resolverNome(nome), email });
    }
  }

  return resultado;
}


// ==============================================================================
// 📧 ENVIO DE E-MAIL
// ==============================================================================

function _enviarEmailParabens(email, nomeExibicao) {
  _variaveis = { primeiroNome: nomeExibicao };

  try {
    const assunto    = _gerarTituloEmailCodificado();
    const corpoHtml  = _gerarCorpoEmailCompleto();
    const imagemBlob = DriveApp.getFileById(CONFIG.imagemPrincipal.driveId).getBlob();
    const remetente  = _obterRemetente();

    const rawEmail = _construirEmail(email, assunto, corpoHtml, imagemBlob, remetente);
    Gmail.Users.Messages.send({ raw: Utilities.base64EncodeWebSafe(rawEmail) }, 'me');

    Logger.log(`✅ E-mail enviado para ${nomeExibicao} <${email}> por "${remetente.nome}"`);
  } catch (error) {
    Logger.log(`❌ Erro ao enviar para ${nomeExibicao}: ${error.message}`);
  }
}

function _gerarTituloEmailCodificado() {
  const texto = _substituirVariaveis(CONFIG.email.titulo);
  try {
    const bytes = Utilities.newBlob(texto, 'text/plain', 'UTF-8').getBytes();
    return `=?UTF-8?B?${Utilities.base64Encode(bytes)}?=`;
  } catch (e) {
    return texto;
  }
}

function _gerarCorpoEmailCompleto() {
  let corpo = '';

  if (CONFIG.email.textoPersonalizado.ativo) {
    corpo += _substituirVariaveis(CONFIG.email.textoPersonalizado.conteudo);
  }

  corpo += `
    <div style="text-align: center;">
      <img src="cid:aniversario"
           alt="${CONFIG.imagemPrincipal.altText}"
           style="max-width: 400px; height: auto; display: block; margin: 0 auto;">
    </div>
  `;

  corpo += _obterAssinatura();
  return corpo;
}

function _construirEmail(para, assunto, corpoHtml, imagemBlob, remetente) {
  const boundary    = 'bdy_' + Utilities.getUuid().replace(/-/g, '');
  const corpoBase64 = Utilities.base64Encode(Utilities.newBlob(corpoHtml, 'text/html', 'UTF-8').getBytes());
  const imageBase64 = Utilities.base64Encode(imagemBlob.getBytes());

  return [
    `From: "${remetente.nome}" <${remetente.email}>`,
    `To: ${para}`,
    CONFIG.ccEmail ? `Cc: ${CONFIG.ccEmail}` : null,
    `Subject: ${assunto}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/related; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    corpoBase64,
    ``,
    `--${boundary}`,
    `Content-Type: ${imagemBlob.getContentType()}`,
    `Content-Transfer-Encoding: base64`,
    `Content-ID: <aniversario>`,
    `Content-Disposition: inline`,
    ``,
    imageBase64,
    `--${boundary}--`,
  ].filter(line => line !== null).join('\r\n');
}


// ==============================================================================
// 👤 REMETENTE & ASSINATURA
// ==============================================================================

function _obterRemetente() {
  try {
    const userEmail = Session.getEffectiveUser().getEmail();
    let   userName  = CONFIG.remetente.nomeExibicao;

    // Se não definiu um nome, usa o nome padrão configurado na conta Google
    if (!userName) {
      try {
        const sendAs  = Gmail.Users.Settings.SendAs.list('me');
        const primary = sendAs?.sendAs?.find(s => s.isPrimary);
        userName = primary?.displayName || _formatarNomeDoEmail(userEmail);
      } catch (e) {
        userName = _formatarNomeDoEmail(userEmail);
      }
    }

    Logger.log(`👤 Remetente: "${userName}" <${userEmail}>`);
    return { nome: userName, email: userEmail };

  } catch (e) {
    Logger.log(`⚠️ Erro ao detectar remetente: ${e.message}`);
    return { nome: 'Equipe RH', email: 'noreply@empresa.com' };
  }
}

function _obterAssinatura() {
  // Se o toggle estiver desligado, não inclui nada
  if (!CONFIG.remetente.incluirAssinatura) return '';

  // Busca a assinatura padrão configurada no Gmail do remetente
  try {
    const sendAs  = Gmail.Users.Settings.SendAs.list('me');
    const primary = sendAs?.sendAs?.find(s => s.isPrimary);
    if (primary?.signature) {
      return `<div style="margin-top: 30px;">${primary.signature}</div>`;
    }
  } catch (e) {
    Logger.log(`⚠️ Não foi possível recuperar a assinatura do Gmail: ${e.message}`);
  }

  // Sem assinatura configurada no Gmail → envia sem assinatura (sem fallback genérico)
  Logger.log('ℹ️ Nenhuma assinatura encontrada no Gmail — e-mail enviado sem assinatura.');
  return '';
}

function _formatarNomeDoEmail(email) {
  return email.split('@')[0]
    .split('.')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}


// ==============================================================================
// 🛠️ UTILITÁRIOS
// ==============================================================================

function _validarConfiguracao() {
  const fontes = ['google_sheets', 'smartsheet', 'csv_drive'];
  if (!fontes.includes(CONFIG.fonteDados)) {
    Logger.log(`❌ CONFIG.fonteDados inválido: "${CONFIG.fonteDados}". Use: ${fontes.join(', ')}`);
    return false;
  }
  if (!CONFIG.imagemPrincipal.driveId || CONFIG.imagemPrincipal.driveId.startsWith('COLE_AQUI')) {
    Logger.log('❌ CONFIG.imagemPrincipal.driveId não foi preenchido.');
    return false;
  }
  return true;
}

/**
 * Extrai dia e mês de uma string de data.
 * Suporta: AAAA-MM-DD (ISO), DD/MM/AAAA, DD-MM-AAAA e objetos Date.
 */
function _extrairDiaMes(dataStr) {
  if (!dataStr) return [0, 0];

  // Objeto Date (Google Sheets pode retornar objetos Date)
  if (dataStr instanceof Date) {
    return [dataStr.getDate(), dataStr.getMonth() + 1];
  }

  const str = dataStr.toString().trim();

  // Formato ISO: AAAA-MM-DD
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return [parseInt(iso[3], 10), parseInt(iso[2], 10)];

  // Formato BR: DD/MM/AAAA ou DD-MM-AAAA
  const br = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (br) return [parseInt(br[1], 10), parseInt(br[2], 10)];

  return [0, 0];
}

function _resolverNome(nomeCompleto) {
  if (!nomeCompleto) return '';
  return CONFIG.usarNomeCompleto ? nomeCompleto : nomeCompleto.split(' ')[0];
}

function _ehDiaUtil(data) {
  const dia = data.getDay();
  return dia !== 0 && dia !== 6;
}

function _substituirVariaveis(texto) {
  if (!_variaveis || !texto) return texto;
  return texto.replace(/{{(.*?)}}/g, (match, variavel) => _variaveis[variavel.trim()] || match);
}
