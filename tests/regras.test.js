'use strict';
// Regras puras do BirthdayBot.gs: datas, calendário, colunas, e-mail.
// Rodar: npm test   (ou: node --test tests/)

const test = require('node:test');
const assert = require('node:assert/strict');
const { carregarBot, simples } = require('./apoio/carregar-bot');

const { bot } = carregarBot();
const COLUNAS = { nome: 'Profissional', dataNascimento: 'Nascimento', email: 'E-mail corporativo', desligamento: 'Data de Desligamento' };
const CABECALHO = ['Profissional', 'Nascimento', 'E-mail corporativo', 'Data de Desligamento'];
const dm = (valor, fuso) => simples(bot.extrairDiaMes(valor, fuso));

test('extrairDiaMes: objeto Date do Google Sheets é lido (defeito 1)', () => {
  const meiaNoiteSP = new Date('1990-03-15T03:00:00Z'); // 15/03/1990 00:00 em São Paulo
  assert.deepStrictEqual(dm(meiaNoiteSP, 'America/Sao_Paulo'), { dia: 15, mes: 3 });
});

test('extrairDiaMes: usa o fuso da PLANILHA, não o do script (defeito 1)', () => {
  const meiaNoiteTokyo = new Date('1990-03-14T15:00:00Z'); // 15/03/1990 00:00 em Tóquio
  assert.deepStrictEqual(dm(meiaNoiteTokyo, 'Asia/Tokyo'), { dia: 15, mes: 3 });
  assert.deepStrictEqual(dm(meiaNoiteTokyo, 'America/Sao_Paulo'), { dia: 14, mes: 3 }, 'no fuso errado cai no dia anterior');
});

test('extrairDiaMes: texto ISO, BR e sem ano', () => {
  assert.deepStrictEqual(dm('1990-03-15'), { dia: 15, mes: 3 });
  assert.deepStrictEqual(dm('1990-03-15T00:00:00Z'), { dia: 15, mes: 3 });
  assert.deepStrictEqual(dm('15/03/1990'), { dia: 15, mes: 3 });
  assert.deepStrictEqual(dm(' 5/3/1990 '), { dia: 5, mes: 3 });
  assert.deepStrictEqual(dm('15-03-1990'), { dia: 15, mes: 3 });
  assert.deepStrictEqual(dm('15.03.90'), { dia: 15, mes: 3 });
  assert.deepStrictEqual(dm('15/03'), { dia: 15, mes: 3 });
  assert.deepStrictEqual(dm('29/02/1992'), { dia: 29, mes: 2 });
});

test('extrairDiaMes: texto inválido devolve null', () => {
  // exatamente o texto que a v1 gerava ao chamar toString() no Date do Sheets
  assert.equal(bot.extrairDiaMes('Thu Mar 15 1990 00:00:00 GMT-0300 (Horário Padrão de Brasília)'), null);
  ['abc', '', null, undefined, '31/02/1990', '13/13/1990', '03/15/1990', '29/02/1990', '1990-02-30']
    .forEach((v) => assert.equal(bot.extrairDiaMes(v), null, `devia recusar ${v}`));
  assert.equal(bot.extrairDiaMes(new Date('data ruim'), 'America/Sao_Paulo'), null);
});

test('29/02 em ano não bissexto: as duas regras (defeito 2)', () => {
  assert.equal(bot.dataComemoradaNoAno(29, 2, 2027, '28fev'), '2027-02-28');
  assert.equal(bot.dataComemoradaNoAno(29, 2, 2027, '01mar'), '2027-03-01');
  assert.equal(bot.dataComemoradaNoAno(29, 2, 2028, '28fev'), '2028-02-29', 'ano bissexto: no próprio dia');
  assert.equal(bot.dataComemoradaNoAno(29, 2, 2028, '01mar'), '2028-02-29');
  assert.equal(bot.dataComemoradaNoAno(28, 2, 2027, '01mar'), '2027-02-28');
});

test('29/02 de ponta a ponta: a pessoa é selecionada no dia da regra (defeito 2)', () => {
  const linhas = [CABECALHO, ['Marisa Quental', '29/02/1996', 'marisa@exemplo.com', '']];
  const sel = (datas, regra29) => bot.selecionarAniversariantes(linhas, { colunas: COLUNAS, datas, regra29 }).pessoas.length;
  assert.equal(sel(['2027-02-28'], '28fev'), 1);
  assert.equal(sel(['2027-03-01'], '28fev'), 0);
  assert.equal(sel(['2027-03-01'], '01mar'), 1);
  assert.equal(sel(['2027-02-28'], '01mar'), 0);
});

test("fim de semana 'enviar': manda no sábado e no domingo (defeito 3)", () => {
  assert.deepStrictEqual(simples(bot.datasDoEnvio('2027-02-27', { fimDeSemana: 'enviar' })), ['2027-02-27']);
  assert.deepStrictEqual(simples(bot.datasDoEnvio('2027-02-28', { fimDeSemana: 'enviar' })), ['2027-02-28']);
});

test("fim de semana 'antecipar_sexta': sexta leva sábado e domingo (defeito 3)", () => {
  const r = (d) => simples(bot.datasDoEnvio(d, { fimDeSemana: 'antecipar_sexta' }));
  assert.deepStrictEqual(r('2027-02-26'), ['2027-02-26', '2027-02-27', '2027-02-28']); // sexta
  assert.deepStrictEqual(r('2027-02-27'), []); // sábado: já saiu na sexta
  assert.deepStrictEqual(r('2027-02-28'), []); // domingo
  assert.deepStrictEqual(r('2027-02-25'), ['2027-02-25']); // quinta
});

test("fim de semana 'adiar_segunda': segunda leva o fim de semana (defeito 3)", () => {
  const r = (d) => simples(bot.datasDoEnvio(d, { fimDeSemana: 'adiar_segunda' }));
  assert.deepStrictEqual(r('2027-03-01'), ['2027-02-27', '2027-02-28', '2027-03-01']); // segunda
  assert.deepStrictEqual(r('2027-02-27'), []);
  assert.deepStrictEqual(r('2027-03-02'), ['2027-03-02']); // terça
});

test('feriado conta como fim de semana (defeito 3)', () => {
  const feriados = simples(bot.normalizarFeriados(['2026-12-25']).datas); // sexta-feira
  const r = (d, regra, f = feriados) => simples(bot.datasDoEnvio(d, { fimDeSemana: regra, feriados: f }));
  assert.deepStrictEqual(r('2026-12-24', 'antecipar_sexta'), ['2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27']);
  assert.deepStrictEqual(r('2026-12-25', 'antecipar_sexta'), []);
  assert.deepStrictEqual(r('2026-12-28', 'adiar_segunda'), ['2026-12-25', '2026-12-26', '2026-12-27', '2026-12-28']);
  assert.deepStrictEqual(r('2026-12-25', 'enviar'), ['2026-12-25'], "'enviar' manda até no feriado");
  // 'DD/MM' sem ano vale todo ano
  const todoAno = simples(bot.normalizarFeriados(['25/12', '2026-13-01', 'Natal', '25/12/26']));
  assert.deepStrictEqual(todoAno, { datas: ['12-25'], invalidos: ['2026-13-01', 'Natal', '25/12/26'] });
  assert.deepStrictEqual(r('2026-12-24', 'antecipar_sexta', todoAno.datas), ['2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27']);
});

test('normalizarCabecalho: acento, maiúscula, espaço e BOM não importam (defeito 12)', () => {
  assert.equal(bot.normalizarCabecalho('E-mail Corporativo '), 'e-mail corporativo');
  assert.equal(bot.normalizarCabecalho('﻿Profissional'), 'profissional');
  assert.equal(bot.normalizarCabecalho('Data  de   Desligamento'), 'data de desligamento');
  assert.equal(bot.normalizarCabecalho('SITUAÇÃO'), 'situacao');
  assert.equal(bot.normalizarCabecalho('Situação'), 'situacao', 'acento "solto" (forma decomposta)');
  const col = simples(bot.localizarColunas(['profissional', 'NASCIMENTO', ' e-mail  corporativo', 'data de desligamento'], COLUNAS));
  assert.deepStrictEqual(col, { idx: { nome: 0, dataNascimento: 1, email: 2, desligamento: 3 }, faltando: [] });
});

test('coluna de desligamento configurada mas ausente: erro, não ignora (defeito novo)', () => {
  const linhas = [['Profissional', 'Nascimento', 'E-mail corporativo'], ['Ana', '26/02/1991', 'ana@exemplo.com']];
  const r = bot.selecionarAniversariantes(linhas, { colunas: COLUNAS, datas: ['2027-02-26'] });
  assert.match(r.erro, /Data de Desligamento/);
  const semColuna = Object.assign({}, COLUNAS, { desligamento: '' });
  assert.equal(bot.selecionarAniversariantes(linhas, { colunas: semColuna, datas: ['2027-02-26'] }).pessoas.length, 1);
});

test('selecionarAniversariantes: Date passa sem virar texto; desligado só no dia dele (defeitos 1 e 14)', () => {
  const linhas = [
    CABECALHO,
    ['Ana Luiza Prado', new Date('1991-02-26T03:00:00Z'), 'ana.prado@exemplo.com', ''],
    ['Diego Fontes', new Date('1990-02-26T03:00:00Z'), 'diego@exemplo.com', new Date('2026-11-30T03:00:00Z')],
    ['Renata Siqueira', new Date('1992-07-15T03:00:00Z'), 'renata@exemplo.com', new Date('2020-01-10T03:00:00Z')],
    ['Sem E-mail', '26/02/1990', 'nao-e-email', ''],
    ['', '', '', ''],
  ];
  const r = simples(bot.selecionarAniversariantes(linhas, { colunas: COLUNAS, fuso: 'America/Sao_Paulo', datas: ['2027-02-26'] }));
  assert.deepStrictEqual(r.pessoas, [{ linha: 2, nome: 'Ana', email: 'ana.prado@exemplo.com', dataComemorada: '2027-02-26' }]);
  assert.deepStrictEqual(r.desligados.map((p) => p.linha), [3], 'Renata (desligada, outro dia) não aparece');
  assert.deepStrictEqual(r.invalidos.map((p) => p.motivo), ['e-mail vazio ou inválido']);
  assert.deepStrictEqual(r.contagem, { linhas: 4, comData: 4, dataIlegivel: 0 });
});

test('deduplicarPorEmail: mesmo e-mail com maiúscula e espaço conta uma vez (defeito 13)', () => {
  const r = bot.deduplicarPorEmail([{ email: 'Elisa.Moura@Exemplo.com' }, { email: ' elisa.moura@exemplo.com ' }, { email: 'bia@exemplo.com' }]);
  assert.equal(r.unicos.length, 2);
  assert.equal(r.repetidos.length, 1);
});

test('escaparHtml e corpo do e-mail: nome não vira HTML (defeito 10)', () => {
  assert.equal(bot.escaparHtml(`<b>"Tom" & 'Jerry'</b>`), '&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;');
  const corpo = bot.montarCorpoEmail({ nome: '<img src=x onerror=alert(1)>', textoAtivo: true,
    texto: '<h2>Parabéns, {{primeiroNome}}!</h2>', altText: 'Bolo "grande"', assinaturaHtml: '<i>RH</i>' });
  assert.ok(!corpo.includes('<img src=x'));
  assert.ok(corpo.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(corpo.includes('alt="Bolo &quot;grande&quot;"'));
  assert.ok(corpo.includes('src="cid:aniversario"'));
  assert.ok(corpo.endsWith('<div style="margin-top: 30px;"><i>RH</i></div>'), 'assinatura do Gmail entra como está');
  assert.equal(bot.substituirVariaveis('Oi, {{primeiroNome}}! {{outra}}', { primeiroNome: "Tomás D'Ávila" }, false),
    "Oi, Tomás D'Ávila! {{outra}}", 'no assunto o nome vai cru (não é HTML)');
});

test('mascararEmail: o log não guarda o e-mail inteiro (defeito 14)', () => {
  assert.equal(bot.mascararEmail('joao.silva@empresa.com'), 'jo***@empresa.com');
  assert.equal(bot.mascararEmail('ab@exemplo.com'), 'a***@exemplo.com');
  assert.equal(bot.mascararEmail('semarroba'), '***');
  assert.equal(bot.mascararEmail(''), '***');
});

test('chaveEnvio: data do aniversário + e-mail minúsculo (defeito 4)', () => {
  assert.equal(bot.chaveEnvio('2027-02-26', ' Ana.Prado@Exemplo.com '), '2027-02-26|ana.prado@exemplo.com');
});

test('CSV: separador ; do Excel em português e Smartsheet viram a mesma tabela', () => {
  assert.equal(bot.detectarSeparadorCsv('Profissional;Nascimento;E-mail\nAna;26/02/1991;ana@exemplo.com'), ';');
  assert.equal(bot.detectarSeparadorCsv('Profissional,Nascimento,E-mail'), ',');
  const linhas = simples(bot.smartsheetParaLinhas({
    columns: [{ id: 11, title: 'Profissional' }, { id: 22, title: 'Nascimento' }],
    rows: [{ cells: [{ columnId: 22, value: '1991-02-26' }, { columnId: 11, value: 'Ana' }] }, { cells: [{ columnId: 11, value: 'Bia' }] }],
  }));
  assert.deepStrictEqual(linhas, [['Profissional', 'Nascimento'], ['Ana', '1991-02-26'], ['Bia', '']]);
});

test('listarProblemasDeConfiguracao: CONFIG de fábrica aponta o que falta preencher', () => {
  const { config } = carregarBot();
  const problemas = bot.listarProblemasDeConfiguracao(config);
  assert.ok(problemas.some((p) => p.includes('googleSheets.spreadsheetId')));
  assert.ok(problemas.some((p) => p.includes('imagemPrincipal.driveId')));
  const errado = Object.assign({}, config, { fimDeSemana: 'pular', aniversario29Fev: '29fev', ccEmail: 'rh@empresa' });
  const p2 = bot.listarProblemasDeConfiguracao(errado);
  assert.ok(p2.some((p) => p.startsWith('fimDeSemana')));
  assert.ok(p2.some((p) => p.startsWith('aniversario29Fev')));
  assert.ok(p2.some((p) => p.startsWith('ccEmail')));
});
