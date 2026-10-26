'use strict';
// Gera as duas páginas de prévia em docs/ a partir do BirthdayBot.gs de verdade:
//   docs/previa-email.html         o e-mail como o destinatário vê (corpo montado por montarCorpoEmail)
//   docs/execucao-modo-teste.html  o registro de uma execução em modo teste (linhas do Logger.log)
// Roda no Node com os serviços do Google falsos de tests/apoio (nenhum e-mail sai),
// com a lista fictícia de exemplos/ e "hoje" fixo na sexta 26/02/2027.
// Uso: npm run previas   (as fotos em docs/img são tiradas depois, ver README)

const fs = require('node:fs');
const path = require('node:path');
const { prepararExecucao } = require('../tests/apoio/ambiente-falso');
const { RAIZ } = require('../tests/apoio/carregar-bot');

const SEXTA = '2027-02-26T09:00:00-03:00';
const DOCS = path.join(RAIZ, 'docs');
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ASSINATURA = '<div style="font-family: Arial, sans-serif; font-size: 13px; color: #555; line-height: 1.5;">' +
  '<strong style="color: #2c3e50;">Equipe de Gente &amp; Gestão</strong><br>Empresa Exemplo</div>';

// 1) O e-mail de verdade (modo teste desligado; o MailApp é falso, nada sai)
const real = prepararExecucao({
  hoje: SEXTA,
  assinatura: ASSINATURA,
  config: { modoTeste: false, fimDeSemana: 'antecipar_sexta', ccEmail: 'rh@empresa.com' },
});
real.config.email.textoPersonalizado.ativo = true;
real.bot.EnvioManual();
const email = real.estado.emails.find((e) => e.para === 'ana.prado@exemplo.com');
const corpo = email.opcoes.htmlBody.replace('cid:aniversario', 'img/cartao-modelo.png');

fs.writeFileSync(path.join(DOCS, 'previa-email.html'), `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Prévia do e-mail</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; background: #eef1f5; font-family: "Segoe UI", Arial, sans-serif; color: #1f2933; }
  .janela { width: 860px; margin: 0 auto; background: #fff; border-radius: 14px; box-shadow: 0 6px 24px rgba(20, 36, 61, .12); overflow: hidden; }
  .topo { padding: 26px 34px 18px; border-bottom: 1px solid #e3e8ef; }
  .assunto { font-size: 24px; font-weight: 600; margin: 0 0 18px; }
  .de { display: flex; gap: 14px; align-items: center; }
  .avatar { width: 44px; height: 44px; border-radius: 50%; background: #2b4c7e; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
  .nome { font-weight: 600; }
  .det { font-size: 14px; color: #52606d; font-weight: 400; }
  .corpo { padding: 28px 34px 36px; }
  .legenda { width: 860px; margin: 14px auto; font-size: 13px; color: #52606d; }
</style></head>
<body>
  <div class="janela">
    <div class="topo">
      <p class="assunto">${esc(email.assunto)}</p>
      <div class="de">
        <div class="avatar">GG</div>
        <div>
          <div class="nome">${esc(email.opcoes.name)} <span class="det">&lt;gente.gestao@empresa.com&gt;</span></div>
          <div class="det">para ${esc(email.para)}, cc ${esc(email.opcoes.cc)}</div>
        </div>
      </div>
    </div>
    <div class="corpo">${corpo}</div>
  </div>
  <p class="legenda">Corpo montado pela função montarCorpoEmail do BirthdayBot.gs (scripts/gerar-previas.js), com textoPersonalizado ativo. Pessoa e endereços fictícios.</p>
</body></html>
`);

// 2) Uma execução em modo teste, como o arquivo vem de fábrica (e-mails vão para o admin)
const teste = prepararExecucao({ hoje: SEXTA, config: { fimDeSemana: 'antecipar_sexta' } });
teste.bot.EnvioManual();
const linhas = ['Execução iniciada'].concat(teste.logs, ['Execução concluída']);

fs.writeFileSync(path.join(DOCS, 'execucao-modo-teste.html'), `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Execução em modo teste</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; background: #f1f3f4; font-family: "Segoe UI", Arial, sans-serif; color: #202124; }
  .painel { width: 1080px; margin: 0 auto; background: #fff; border: 1px solid #dadce0; border-radius: 10px; overflow: hidden; }
  .titulo { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid #dadce0; font-size: 16px; font-weight: 600; }
  .selo { font-size: 12px; font-weight: 600; color: #8a4b00; background: #fff4e0; border: 1px solid #f2c27b; border-radius: 999px; padding: 2px 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  td { padding: 7px 20px; border-bottom: 1px solid #f1f3f4; vertical-align: top; }
  td.nivel { width: 110px; color: #5f6368; white-space: nowrap; }
  td.msg { font-family: Consolas, "Courier New", monospace; font-size: 13.5px; white-space: pre-wrap; }
  tr.extremo td.msg { font-family: "Segoe UI", Arial, sans-serif; color: #5f6368; }
  .legenda { width: 1080px; margin: 14px auto; font-size: 13px; color: #5f6368; }
</style></head>
<body>
  <div class="painel">
    <div class="titulo">Registro de execução: EnvioManual <span class="selo">ilustração</span></div>
    <table>
${linhas.map((l, i) => {
  const extremo = i === 0 || i === linhas.length - 1;
  return `      <tr${extremo ? ' class="extremo"' : ''}><td class="nivel">${extremo ? 'Notificação' : 'Informação'}</td><td class="msg">${esc(l)}</td></tr>`;
}).join('\n')}
    </table>
  </div>
  <p class="legenda">Ilustração: as linhas são a saída real do BirthdayBot.gs rodando no Node com serviços falsos (npm run previas), em modo teste, com a lista fictícia de exemplos/ e "hoje" = sexta, 26/02/2027. O desenho imita o painel de execuções do Apps Script; não é captura de tela do Google.</p>
</body></html>
`);

console.log('Gerado: docs/previa-email.html (para ' + email.para + ')');
console.log('Gerado: docs/execucao-modo-teste.html (' + teste.logs.length + ' linhas de log)');
