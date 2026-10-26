'use strict';
// Execução de ponta a ponta do BirthdayBot.gs com serviços do Google falsos.
// Cenário: exemplos/colaboradores_exemplo.csv, "hoje" = sexta 26/02/2027.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { prepararExecucao, CSV_EXEMPLO } = require('./apoio/ambiente-falso');
const { carregarBot, CAMINHO_BOT } = require('./apoio/carregar-bot');

const SEXTA = '2027-02-26T12:00:00-03:00';
const SABADO = '2027-02-27T12:00:00-03:00';
const NO_DIA_UTIL = { fimDeSemana: 'antecipar_sexta', ccEmail: 'rh@empresa.com' };
const ESPERADOS = ['ana.prado@exemplo.com', 'bruno.tavares@exemplo.com', 'elisa.moura@exemplo.com',
  'marisa.quental@exemplo.com', 'tomas.davila@exemplo.com'];
const real = (extra = {}) => Object.assign({ modoTeste: false }, NO_DIA_UTIL, extra);

test('o arquivo sai de fábrica em modo teste, mandando para o admin (defeito 5)', () => {
  const { config } = carregarBot();
  assert.equal(config.modoTeste, true);
  assert.equal(config.modoTesteDestino, 'admin');
  assert.equal(config.fimDeSemana, 'enviar');
  assert.equal(config.aniversario29Fev, '28fev');
  assert.equal(config.ccEmail, '', 'sem cópia para domínio de exemplo');
});

test('modo teste: tudo vai para o admin, sem cópia, destinatário no assunto, nada registrado (defeito 5)', () => {
  const { bot, estado } = prepararExecucao({ hoje: SEXTA, config: NO_DIA_UTIL });
  const resumo = bot.EnvioManual();
  assert.equal(resumo.enviados, 5);
  assert.ok(estado.emails.every((e) => e.para === 'admin@empresa.com' && !e.opcoes.cc));
  assert.ok(estado.emails.every((e) => /^\[TESTE para \S+@exemplo\.com\] Feliz aniversário/.test(e.assunto)));
  assert.equal(Object.keys(estado.propriedades).length, 0, 'teste não marca ninguém como enviado');
});

test("modo teste 'log': nenhum e-mail sai (defeito 5)", () => {
  const { bot, estado } = prepararExecucao({ hoje: SEXTA, config: Object.assign({ modoTesteDestino: 'log' }, NO_DIA_UTIL) });
  const resumo = bot.EnvioManual();
  assert.equal(estado.emails.length, 0);
  assert.equal(resumo.simulados, 5);
});

test('envio real na sexta: hoje + sábado + domingo + 29/02; desligado e repetido fora (defeitos 2, 3, 13)', () => {
  const { bot, estado } = prepararExecucao({ hoje: SEXTA, config: real() });
  const resumo = bot.EnvioManual();
  assert.deepEqual(estado.emails.map((e) => e.para).sort(), ESPERADOS);
  assert.deepEqual([...resumo.datasCobertas], ['2027-02-26', '2027-02-27', '2027-02-28']);
  assert.equal(resumo.pulados.desligado, 1);
  assert.equal(resumo.pulados.repetido, 1);
  assert.equal(resumo.falhas.length, 0);
  assert.ok(estado.emails.every((e) => e.opcoes.cc === 'rh@empresa.com'));
});

test('remetente com acento vai no campo name do MailApp, sem cabeçalho montado à mão (defeito 9)', () => {
  const { bot, estado } = prepararExecucao({ hoje: SEXTA, config: real() });
  bot.EnvioManual();
  assert.ok(estado.emails.every((e) => e.opcoes.name === 'Equipe de Gente & Gestão'));
  assert.ok(estado.emails.every((e) => e.opcoes.inlineImages.aniversario && e.opcoes.htmlBody.includes('cid:aniversario')));
});

test("nome com apóstrofo escapado no HTML e cru no assunto (defeito 10)", () => {
  const { bot, estado, config } = prepararExecucao({ hoje: SEXTA, config: real({ usarNomeCompleto: true }) });
  config.email.textoPersonalizado.ativo = true;
  bot.EnvioManual();
  const tomas = estado.emails.find((e) => e.para === 'tomas.davila@exemplo.com');
  assert.ok(tomas.opcoes.htmlBody.includes('Tomás D&#39;Ávila'));
  assert.equal(tomas.assunto, "Feliz aniversário, Tomás D'Ávila! 🥳");
});

test('rodar de novo não manda em dobro (defeito 4)', () => {
  const { bot, estado } = prepararExecucao({ hoje: SEXTA, config: real() });
  bot.EnvioManual();
  const segunda = bot.EnvioManual();
  assert.equal(estado.emails.length, 5);
  assert.equal(segunda.enviados, 0);
  assert.equal(segunda.pulados.jaEnviado, 5);
  assert.ok('envio|2027-02-28|marisa.quental@exemplo.com' in estado.propriedades, 'chave = data do aniversário');
});

test('execução simultânea: a segunda não pega a trava e não envia (defeito 4)', () => {
  const { bot, estado } = prepararExecucao({ hoje: SEXTA, config: real(), travaLivre: false });
  const resumo = bot.EnvioManual();
  assert.equal(resumo.situacao, 'ocupado');
  assert.equal(estado.emails.length, 0);
});

test('imagem baixada do Drive uma vez só (defeito 8)', () => {
  const { bot, estado } = prepararExecucao({ hoje: SEXTA, config: real() });
  bot.EnvioManual();
  assert.equal(estado.emails.length, 5);
  assert.equal(estado.downloadsImagem, 1);
});

test('falha vira e-mail de resumo para o admin; sem falha, nenhum aviso (defeito 7)', () => {
  const comFalha = prepararExecucao({ hoje: SEXTA, config: real(), falharEnvioPara: ['bruno.tavares@exemplo.com'] });
  const resumo = comFalha.bot.EnvioManual();
  assert.equal(resumo.enviados, 4);
  assert.equal(resumo.falhas.length, 1);
  const aviso = comFalha.estado.emails.at(-1);
  assert.equal(aviso.para, 'admin@empresa.com');
  assert.equal(aviso.assunto, '[Birthday Bot] 1 falha(s) em 2027-02-26');
  assert.match(aviso.corpo, /linha 3 \(br\*\*\*@exemplo\.com\): Endereço recusado/);
  assert.ok(!aviso.corpo.includes('bruno.tavares@'));

  const semFalha = prepararExecucao({ hoje: SEXTA, config: real() });
  semFalha.bot.EnvioManual();
  assert.ok(semFalha.estado.emails.every((e) => e.para !== 'admin@empresa.com'));
});

test('log sem e-mail inteiro e sem desligado fora do dia dele (defeito 14)', () => {
  const sexta = prepararExecucao({ hoje: SEXTA, config: real() });
  sexta.bot.EnvioManual();
  const textoSexta = sexta.logs.join('\n');
  CSV_EXEMPLO.split('\n').slice(1).filter(Boolean).forEach((l) => {
    assert.ok(!textoSexta.includes(l.split(',')[2]), 'e-mail inteiro no log: ' + l.split(',')[2]);
  });
  assert.match(textoSexta, /Pulado \(desligado\): linha 5, di\*\*\*@exemplo\.com/);

  const julho = prepararExecucao({ hoje: '2027-07-15T12:00:00-03:00', config: real() });
  julho.bot.EnvioManual();
  assert.ok(!julho.logs.join('\n').includes('desligado):'), 'em outro dia o desligado não aparece');
});

test('Google Sheets: data como objeto Date, inclusive com planilha em outro fuso (defeito 1)', () => {
  const cab = ['Profissional', 'Nascimento', 'E-mail corporativo', 'Data de Desligamento'];
  const cfg = real({ fonteDados: 'google_sheets', googleSheets: { spreadsheetId: 'ss-1', sheetName: 'Planilha1' }, fimDeSemana: 'enviar' });
  const sp = prepararExecucao({ hoje: SEXTA, config: cfg,
    linhasPlanilha: [cab, ['Ana Luiza Prado', new Date('1991-02-26T03:00:00Z'), 'ana.prado@exemplo.com', '']] });
  sp.bot.EnvioManual();
  assert.equal(sp.estado.emails.length, 1);
  assert.equal(sp.estado.abas.Envios.linhas[1][0], '2027-02-26|ana.prado@exemplo.com', 'registro na aba Envios');

  const tokyo = prepararExecucao({ hoje: SEXTA, config: cfg, fusoPlanilha: 'Asia/Tokyo',
    linhasPlanilha: [cab, ['Ana Luiza Prado', new Date('1991-02-25T15:00:00Z'), 'ana.prado@exemplo.com', '']] });
  tokyo.bot.EnvioManual();
  assert.equal(tokyo.estado.emails.length, 1, 'meia-noite de 26/02 em Tóquio continua sendo 26/02');
});

test('sem adminEmail e sem conseguir ler a conta: para com mensagem clara (defeito 15)', () => {
  const { bot, estado } = prepararExecucao({ hoje: SEXTA, emailDaConta: '', config: Object.assign({ adminEmail: '' }, NO_DIA_UTIL) });
  const resumo = bot.EnvioManual();
  assert.equal(resumo.situacao, 'interrompida');
  assert.match(resumo.falhas[0].motivo, /Preencha CONFIG\.adminEmail/);
  assert.equal(estado.emails.length, 0);
  assert.ok(!fs.readFileSync(CAMINHO_BOT, 'utf8').includes('noreply@'), 'nenhum remetente inventado no código');
});

test('instalarAcionador cria um só, mesmo rodando duas vezes; removerAcionadores apaga (defeito 6)', () => {
  const { bot, estado } = prepararExecucao();
  bot.instalarAcionador();
  bot.instalarAcionador();
  assert.equal(estado.acionadores.length, 1);
  assert.equal(estado.acionadores[0].funcao, 'EnvioAutomatico_Acionador');
  assert.equal(estado.acionadores[0].hora, 8);
  assert.equal(bot.removerAcionadores(), 1);
  assert.equal(estado.acionadores.length, 0);
});

test('token do Smartsheet: vai para as Propriedades e tem prioridade sobre o CONFIG (defeito 11)', () => {
  const { bot, estado, config, logs } = prepararExecucao();
  config.smartsheet = { sheetId: '123', apiToken: 'tok-abcdef-9876' };
  bot.salvarTokenSmartsheet();
  assert.equal(estado.propriedades.SMARTSHEET_TOKEN, 'tok-abcdef-9876');
  assert.ok(!logs.join('\n').includes('tok-abcdef-9876'), 'o log mostra só o fim do token');
  config.smartsheet.apiToken = 'outro-token';
  assert.equal(bot._tokenSmartsheet(), 'tok-abcdef-9876');
});

test('coluna de desligamento com nome errado: nenhum colaborador recebe (defeito novo)', () => {
  const { bot, estado, config } = prepararExecucao({ hoje: SEXTA, config: real() });
  config.colunas = Object.assign({}, config.colunas, { desligamento: 'Desligado em' });
  const resumo = bot.EnvioManual();
  assert.equal(resumo.situacao, 'interrompida');
  assert.deepEqual(estado.emails.map((e) => e.para), ['admin@empresa.com'], 'só o aviso de falha sai');
});

test('CSV salvo pelo Excel em português (; e Windows-1252) lê acento certo (defeito novo)', () => {
  const csv = 'Profissional;Nascimento;E-mail corporativo;Data de Desligamento\r\nOtávio Lins;26/02/1985;otavio.lins@exemplo.com;\r\n';
  const { bot, estado } = prepararExecucao({ hoje: SEXTA, config: real({ fimDeSemana: 'enviar' }), csvBytes: Buffer.from(csv, 'latin1') });
  bot.EnvioManual();
  assert.equal(estado.emails.length, 1);
  assert.equal(estado.emails[0].assunto, 'Feliz aniversário, Otávio! 🥳');
});

test("sábado com 'antecipar_sexta': ninguém recebe de novo (defeito 3)", () => {
  const { bot, estado, logs } = prepararExecucao({ hoje: SABADO, config: real() });
  const resumo = bot.EnvioManual();
  assert.equal(estado.emails.length, 0);
  assert.equal(resumo.datasCobertas.length, 0);
  assert.match(logs.join('\n'), /não é dia de envio/);
});
