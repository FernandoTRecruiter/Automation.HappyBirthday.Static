'use strict';
// Carrega o BirthdayBot.gs (o MESMO arquivo que vai para o Apps Script) dentro de
// um contexto isolado do Node, com versões mínimas dos serviços do Google.
// Por quê: testar as regras sem conta Google e sem mandar e-mail de verdade.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..', '..');
const CAMINHO_BOT = path.join(RAIZ, 'BirthdayBot.gs');

/** Utilities.formatDate simplificado: aceita yyyy, MM, dd, HH, mm, ss. */
function formatDate(data, fuso, padrao) {
  const partes = {};
  new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(data).forEach((p) => { partes[p.type] = p.value; });
  return padrao.replace('yyyy', partes.year).replace('MM', partes.month).replace('dd', partes.day)
    .replace('HH', partes.hour).replace('mm', partes.minute).replace('ss', partes.second);
}

/** Utilities.parseCsv simplificado: basta para os CSV do repositório (sem aspas). */
function parseCsv(texto, separador = ',') {
  return texto.split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => l.split(separador));
}

/**
 * Devolve { bot, logs, config }:
 *   bot    = o contexto (as funções do .gs ficam em bot.nomeDaFuncao)
 *   logs   = tudo o que passou por Logger.log
 *   config = o objeto CONFIG de dentro do contexto (pode ser alterado)
 */
function carregarBot(servicos = {}) {
  const logs = [];
  const contexto = vm.createContext(Object.assign({
    Logger: { log: (msg) => { logs.push(String(msg)); } },
    Utilities: { formatDate, parseCsv },
    console,
  }, servicos));
  vm.runInContext(fs.readFileSync(CAMINHO_BOT, 'utf8'), contexto, { filename: 'BirthdayBot.gs' });
  return { bot: contexto, logs, config: vm.runInContext('CONFIG', contexto) };
}

/** Copia "limpa" de um valor do contexto, para comparar com deepStrictEqual. */
const simples = (valor) => JSON.parse(JSON.stringify(valor));

module.exports = { carregarBot, simples, formatDate, parseCsv, RAIZ, CAMINHO_BOT };
