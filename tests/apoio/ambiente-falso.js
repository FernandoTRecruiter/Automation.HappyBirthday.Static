'use strict';
// Serviços do Google "de mentira", só com o que o BirthdayBot.gs usa.
// Guardam tudo em `estado` para o teste conferir (e-mails, downloads, registros).

const fs = require('node:fs');
const path = require('node:path');
const { carregarBot, formatDate, parseCsv, RAIZ } = require('./carregar-bot');

const CSV_EXEMPLO = fs.readFileSync(path.join(RAIZ, 'exemplos', 'colaboradores_exemplo.csv'), 'utf8');

function abaFalsa(linhas) {
  return {
    getDataRange: () => ({ getValues: () => linhas.map((l) => l.slice()) }),
    appendRow: (l) => { linhas.push(l); },
    getLastRow: () => linhas.length,
    getRange: (r, c, n, m) => ({ getValues: () => linhas.slice(r - 1, r - 1 + n).map((l) => l.slice(c - 1, c - 1 + m)) }),
    linhas,
  };
}

/**
 * op: csv (texto) | csvBytes (Buffer) | linhasPlanilha (tabela com Date) | fusoPlanilha
 *     travaLivre (false = outra execução segura a trava) | falharEnvioPara ([e-mails])
 *     emailDaConta | semGmail
 */
function criarAmbiente(op = {}) {
  const estado = { emails: [], downloadsImagem: 0, propriedades: {}, acionadores: [], abas: {} };
  if (op.linhasPlanilha) estado.abas.Planilha1 = abaFalsa(op.linhasPlanilha);

  const imagem = { copyBlob() { return this; }, getContentType: () => 'image/png', getBytes: () => [] };
  const csvBytes = op.csvBytes || Buffer.from(op.csv === undefined ? CSV_EXEMPLO : op.csv, 'utf8');

  const servicos = {
    Utilities: { formatDate, parseCsv },
    Session: {
      getScriptTimeZone: () => 'America/Sao_Paulo',
      getEffectiveUser: () => ({ getEmail: () => (op.emailDaConta === undefined ? 'dono@empresa.com' : op.emailDaConta) }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => op.travaLivre !== false, releaseLock() {} }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in estado.propriedades ? estado.propriedades[k] : null),
        setProperty: (k, v) => { estado.propriedades[k] = String(v); },
        deleteProperty: (k) => { delete estado.propriedades[k]; },
        getKeys: () => Object.keys(estado.propriedades),
      }),
    },
    DriveApp: {
      getFileById: (id) => {
        if (id === 'csv-1') {
          return { getBlob: () => ({ getDataAsString: (cs) => csvBytes.toString(cs === 'UTF-8' ? 'utf8' : 'latin1') }) };
        }
        estado.downloadsImagem++;
        return { getBlob: () => imagem };
      },
    },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: (nome) => estado.abas[nome] || null,
        insertSheet: (nome) => (estado.abas[nome] = abaFalsa([])),
        getSpreadsheetTimeZone: () => op.fusoPlanilha || 'America/Sao_Paulo',
      }),
    },
    MailApp: {
      sendEmail: (para, assunto, corpo, opcoes) => {
        if ((op.falharEnvioPara || []).includes(para)) throw new Error('Endereço recusado pelo servidor');
        estado.emails.push({ para, assunto, corpo, opcoes: opcoes || {} });
      },
    },
    ScriptApp: {
      newTrigger: (funcao) => {
        const novo = { funcao, getHandlerFunction: () => funcao };
        const construtor = {
          timeBased: () => construtor,
          everyDays: () => construtor,
          atHour: (h) => { novo.hora = h; return construtor; },
          create: () => { estado.acionadores.push(novo); return novo; },
        };
        return construtor;
      },
      getProjectTriggers: () => estado.acionadores.slice(),
      deleteTrigger: (t) => { estado.acionadores = estado.acionadores.filter((x) => x !== t); },
    },
  };
  if (!op.semGmail) {
    servicos.Gmail = { Users: { Settings: { SendAs: { list: () => ({ sendAs: [{ isPrimary: true,
      signature: op.assinatura || '<b>Equipe de Gente &amp; Gestão</b><br>Empresa Exemplo' }] }) } } } };
  }
  return { servicos, estado };
}

/**
 * Bot pronto para rodar: ambiente falso + CONFIG válido (fonte CSV de exemplo).
 * op.hoje fixa o dia (ex.: '2027-02-26T12:00:00-03:00'); op.config sobrescreve o CONFIG.
 */
function prepararExecucao(op = {}) {
  const { servicos, estado } = criarAmbiente(op);
  const { bot, logs, config } = carregarBot(servicos);
  Object.assign(config, {
    fonteDados: 'csv_drive',
    csv: { driveFileId: 'csv-1' },
    imagemPrincipal: { driveId: 'img-1', altText: 'Cartão de aniversário' },
    adminEmail: 'admin@empresa.com',
  }, op.config || {});
  if (op.hoje) bot._agora = () => new Date(op.hoje);
  return { bot, logs, config, estado };
}

module.exports = { criarAmbiente, prepararExecucao, CSV_EXEMPLO };
