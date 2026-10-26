/**
 * BIRTHDAY BOT v2.0.0: e-mail de aniversário automático para colaboradores
 * Google Apps Script | https://github.com/FernandoTRecruiter/Automation.HappyBirthday.Static
 * Autor: Fernando Paoli (FernandoTRecruiter) | Licença MIT
 *
 * O QUE FAZ
 *   Todo dia, no horário escolhido, lê a lista de colaboradores (Google Sheets,
 *   Smartsheet ou CSV no Drive), acha quem faz aniversário e manda um e-mail com
 *   uma imagem fixa, com cópia opcional para o RH.
 *
 * INSTALAÇÃO (o passo a passo completo está no README)
 *   1. Cole ESTE arquivo inteiro no editor do Apps Script e salve.
 *   2. Serviços (+) > Gmail API > Adicionar (usado só para puxar a sua assinatura).
 *   3. Preencha o bloco CONFIG logo abaixo. Deixe modoTeste: true por enquanto.
 *   4. Rode EnvioManual: os e-mails de teste chegam no adminEmail, ninguém mais recebe.
 *   5. Rode instalarAcionador uma vez. Com o teste aprovado, mude modoTeste para false.
 *
 * FUNÇÕES QUE VOCÊ PODE RODAR (lista de funções no topo do editor)
 *   EnvioManual             roda agora, com as mesmas regras do envio automático
 *   instalarAcionador       cria o envio diário no horário de CONFIG.horaDoEnvio
 *   removerAcionadores      desliga o envio diário
 *   salvarTokenSmartsheet   guarda o token do Smartsheet fora do código (uso único)
 */


// =============================================================================
// CONFIGURAÇÕES: EDITE APENAS ESTE BLOCO
// =============================================================================

const CONFIG = {

  // ---------------------------------------------------------------------------
  // MODO TESTE (comece SEMPRE com true)
  //   true  -> nenhum colaborador recebe nada; veja modoTesteDestino
  //   false -> envio de verdade para os aniversariantes
  // ---------------------------------------------------------------------------
  modoTeste: true,

  // Só vale com modoTeste: true
  //   'admin' -> cada e-mail vai para o adminEmail, com o destinatário real no assunto
  //   'log'   -> nenhum e-mail sai; o script só escreve no registro de execução
  modoTesteDestino: 'admin',

  // Quem recebe os e-mails do modo teste e o resumo quando alguma coisa falha.
  // Deixe '' para usar o e-mail da conta Google que roda o script.
  adminEmail: '',

  // ---------------------------------------------------------------------------
  // FONTE DE DADOS: 'google_sheets' | 'smartsheet' | 'csv_drive'
  // Preencha só o bloco da fonte escolhida.
  // ---------------------------------------------------------------------------
  fonteDados: 'google_sheets',

  // ID na URL: https://docs.google.com/spreadsheets/d/ >>ID<< /edit
  googleSheets: {
    spreadsheetId: 'COLE_AQUI_O_ID_DA_SUA_PLANILHA',
    sheetName:     'Planilha1',   // nome da aba, como aparece embaixo da planilha
  },

  // sheetId: número no fim da URL do Smartsheet.
  // O TOKEN NÃO VAI AQUI: guarde em Configurações do projeto > Propriedades do
  // script, com o nome SMARTSHEET_TOKEN (ou rode salvarTokenSmartsheet uma vez).
  smartsheet: {
    sheetId:  'COLE_AQUI_O_SHEET_ID',
    apiToken: '',   // alternativa INSEGURA: quem abrir o código vê o token
  },

  // ID na URL do arquivo: https://drive.google.com/file/d/ >>ID<< /view
  // Linha 1 = cabeçalhos. Aceita separador , ou ; e o CSV salvo pelo Excel.
  csv: {
    driveFileId: 'COLE_AQUI_O_ID_DO_ARQUIVO_CSV',
  },

  // ---------------------------------------------------------------------------
  // NOMES DAS COLUNAS
  // Maiúscula, acento e espaço sobrando NÃO importam ('E-mail Corporativo '
  // acha 'e-mail corporativo'). Sem coluna de desligamento? Deixe desligamento: ''.
  // ---------------------------------------------------------------------------
  colunas: {
    nome:           'Profissional',
    dataNascimento: 'Nascimento',            // data da planilha, AAAA-MM-DD, DD/MM/AAAA ou só DD/MM
    email:          'E-mail corporativo',
    desligamento:   'Data de Desligamento',  // preenchida = não recebe
  },

  // false -> só o primeiro nome (Maria) | true -> nome completo (Maria Souza)
  usarNomeCompleto: false,

  // Cópia para o RH. Vazio = sem cópia. Vários: 'rh@empresa.com, gestor@empresa.com'.
  // No modo teste a cópia nunca sai.
  ccEmail: '',

  // ---------------------------------------------------------------------------
  // REMETENTE: o e-mail que envia é sempre o da conta Google que roda o script
  // ---------------------------------------------------------------------------
  remetente: {
    nomeExibicao:      'Equipe de Gente & Gestão',  // '' = nome da conta Google
    incluirAssinatura: true,                        // usa a assinatura do Gmail
  },

  // ---------------------------------------------------------------------------
  // CONTEÚDO DO E-MAIL: {{primeiroNome}} vira o nome do aniversariante
  // ---------------------------------------------------------------------------
  email: {
    titulo: 'Feliz aniversário, {{primeiroNome}}! 🥳',

    // Texto opcional acima da imagem (HTML)
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
      `,
    },
  },

  // ---------------------------------------------------------------------------
  // CALENDÁRIO
  // fimDeSemana: o que fazer com aniversário em sábado, domingo ou feriado
  //   'enviar'          -> manda no próprio dia (padrão)
  //   'antecipar_sexta' -> manda no último dia útil ANTES (normalmente a sexta)
  //   'adiar_segunda'   -> manda no primeiro dia útil DEPOIS (normalmente a segunda)
  // ---------------------------------------------------------------------------
  fimDeSemana: 'enviar',

  // Feriados contam como fim de semana nas regras acima.
  // 'AAAA-MM-DD' ou 'DD/MM/AAAA' vale só naquele ano; 'DD/MM' vale todo ano.
  feriados: [
    // '01/01', '21/04', '01/05', '07/09', '12/10', '02/11', '15/11', '20/11', '25/12',
    // '2027-02-08',
  ],

  // Quem nasceu em 29/02, em ano que não é bissexto: '28fev' ou '01mar'
  aniversario29Fev: '28fev',

  // Hora do envio diário (0 a 23), usada por instalarAcionador
  horaDoEnvio: 8,

  // ---------------------------------------------------------------------------
  // IMAGEM: ID do arquivo no Drive. Não precisa compartilhar: o script anexa a
  // imagem dentro do e-mail.
  // ---------------------------------------------------------------------------
  imagemPrincipal: {
    driveId: 'COLE_AQUI_O_ID_DA_IMAGEM_NO_DRIVE',
    altText: 'Imagem de parabéns de aniversário',
  },
};


// =============================================================================
// DAQUI PARA BAIXO NÃO É PRECISO EDITAR
// =============================================================================

const VERSAO = '2.0.0';
const FUNCAO_DO_ACIONADOR = 'EnvioAutomatico_Acionador';
const NOME_ABA_ENVIOS = 'Envios';          // aba de registro quando a fonte é Google Sheets
const PREFIXO_REGISTRO = 'envio|';         // registro nas Propriedades do script (outras fontes)
const DIAS_GUARDANDO_REGISTRO = 60;        // registros mais velhos são apagados das Propriedades
const ID_IMAGEM_NO_EMAIL = 'aniversario';  // nome interno da imagem anexada (cid:aniversario)


// =============================================================================
// FUNÇÕES PARA RODAR
// =============================================================================

/**
 * Chamada pelo acionador diário (crie com instalarAcionador).
 * Por que existe separada do EnvioManual: no registro fica claro quem disparou.
 */
function EnvioAutomatico_Acionador() {
  return _executarEnvio('acionador');
}

/**
 * Roda agora, com as mesmas regras do envio automático.
 * Pode rodar de novo sem medo: quem já recebeu hoje é pulado.
 */
function EnvioManual() {
  return _executarEnvio('manual');
}

/**
 * Cria o envio diário no horário de CONFIG.horaDoEnvio.
 * Por quê: evita o passo a passo de cliques e o acionador duplicado (que
 * mandava dois e-mails). Apaga os acionadores antigos deste robô antes de criar.
 */
function instalarAcionador() {
  const hora = Number(CONFIG.horaDoEnvio);
  if (!(Math.floor(hora) === hora && hora >= 0 && hora <= 23)) {
    throw new Error('CONFIG.horaDoEnvio precisa ser um número inteiro de 0 a 23.');
  }
  removerAcionadores();
  ScriptApp.newTrigger(FUNCAO_DO_ACIONADOR).timeBased().everyDays(1).atHour(hora).create();
  Logger.log(`Acionador criado: ${FUNCAO_DO_ACIONADOR} todo dia entre ${hora}h e ${hora + 1}h ` +
             `(fuso do projeto: ${Session.getScriptTimeZone()}).`);
}

/**
 * Apaga os acionadores deste robô (e só os dele). Devolve quantos apagou.
 */
function removerAcionadores() {
  let apagados = 0;
  ScriptApp.getProjectTriggers().forEach(function (acionador) {
    if (acionador.getHandlerFunction() === FUNCAO_DO_ACIONADOR) {
      ScriptApp.deleteTrigger(acionador);
      apagados++;
    }
  });
  Logger.log(`${apagados} acionador(es) do Birthday Bot removido(s).`);
  return apagados;
}

/**
 * USO ÚNICO: guarda o token do Smartsheet nas Propriedades do script.
 * Por quê: token escrito no código vaza para quem abrir ou copiar o projeto.
 * Como: cole o token entre as aspas abaixo, rode esta função UMA vez, apague
 * o token daqui e salve. (Ou crie a propriedade SMARTSHEET_TOKEN direto em
 * Configurações do projeto > Propriedades do script, sem mexer no código.)
 */
function salvarTokenSmartsheet() {
  const token = '';   // <- cole aqui, rode, e depois APAGUE
  const valor = String(token || CONFIG.smartsheet.apiToken || '').trim();
  if (!valor) {
    throw new Error('Cole o token entre as aspas da linha "const token" desta função e rode de novo.');
  }
  PropertiesService.getScriptProperties().setProperty('SMARTSHEET_TOKEN', valor);
  Logger.log(`Token salvo (termina em ...${valor.slice(-4)}). Agora APAGUE o token do código ` +
             '(e de CONFIG.smartsheet.apiToken) e salve o arquivo.');
}


// =============================================================================
// FLUXO PRINCIPAL
// =============================================================================

/**
 * Coração do robô. Passo a passo:
 *   1. trava: duas execuções ao mesmo tempo não podem mandar em dobro
 *   2. descobre quais datas de aniversário saem hoje (fim de semana, feriado, 29/02)
 *   3. lê a fonte e separa os aniversariantes (desligado e e-mail repetido ficam fora)
 *   4. para cada um: já recebeu? pula. Senão envia (ou simula no modo teste) e registra
 *   5. escreve o resumo no log e, se algo falhou, manda o resumo para o adminEmail
 * Devolve o resumo (enviados, pulados, falhas).
 */
function _executarEnvio(origem) {
  const resumo = novoResumo(origem, CONFIG.modoTeste, CONFIG.modoTesteDestino);

  const trava = LockService.getScriptLock();
  if (!trava.tryLock(60 * 1000)) {
    resumo.situacao = 'ocupado';
    Logger.log('Outra execução do Birthday Bot ainda está rodando. Esta parou sem enviar nada.');
    return resumo;
  }

  try {
    _enviarDoDia(resumo);
    resumo.situacao = resumo.falhas.length ? 'concluída com falhas' : 'concluída';
  } catch (erro) {
    resumo.situacao = 'interrompida';
    resumo.falhas.push({ motivo: erro.message });
  } finally {
    trava.releaseLock();
  }

  Logger.log(textoDoResumo(resumo));
  if (resumo.falhas.length) _avisarAdmin(resumo);
  return resumo;
}

/** Passos 2 a 4 do fluxo. Lança erro quando não dá para continuar. */
function _enviarDoDia(resumo) {
  const problemas = listarProblemasDeConfiguracao(CONFIG);
  if (problemas.length) throw new Error('Corrija o CONFIG:\n  - ' + problemas.join('\n  - '));

  // 2. "Hoje" no fuso do projeto (Configurações do projeto > Fuso horário)
  const hoje = Utilities.formatDate(_agora(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  resumo.data = hoje;

  const feriados = normalizarFeriados(CONFIG.feriados);
  feriados.invalidos.forEach(function (f) {
    resumo.avisos.push(`Feriado ignorado, formato não reconhecido: "${f}"`);
  });

  const datas = datasDoEnvio(hoje, { fimDeSemana: CONFIG.fimDeSemana, feriados: feriados.datas });
  resumo.datasCobertas = datas;
  if (datas.length === 0) {
    const quando = CONFIG.fimDeSemana === 'antecipar_sexta' ? 'no dia útil anterior' : 'no próximo dia útil';
    Logger.log(`Hoje (${hoje}) não é dia de envio pela regra fimDeSemana = '${CONFIG.fimDeSemana}': ` +
               `os aniversários de hoje saem ${quando}.`);
    return;
  }

  // 3. Lê a fonte e separa quem faz aniversário nas datas de hoje
  const fonte = _lerFonte();
  const sel = selecionarAniversariantes(fonte.linhas, {
    colunas: CONFIG.colunas,
    fuso: fonte.fuso,
    datas: datas,
    regra29: CONFIG.aniversario29Fev,
    usarNomeCompleto: CONFIG.usarNomeCompleto,
    deslocamentoLinha: fonte.deslocamentoLinha,
  });
  if (sel.erro) throw new Error(sel.erro);

  resumo.linhasLidas = sel.contagem.linhas;
  resumo.datasIlegiveis = sel.contagem.dataIlegivel;
  if (sel.contagem.comData > 0 && sel.contagem.dataIlegivel === sel.contagem.comData) {
    throw new Error(`Nenhuma das ${sel.contagem.comData} datas de nascimento pôde ser lida. Confira a ` +
                    `coluna "${CONFIG.colunas.dataNascimento}" (aceita data da planilha, AAAA-MM-DD, ` +
                    'DD/MM/AAAA ou DD/MM).');
  }

  // Desligado só aparece no log se hoje fosse o aniversário dele, e mascarado
  sel.desligados.forEach(function (p) {
    resumo.pulados.desligado++;
    Logger.log(`Pulado (desligado): linha ${p.linha}, ${mascararEmail(p.email)}`);
  });
  sel.invalidos.forEach(function (p) {
    resumo.falhas.push({ linha: p.linha, email: mascararEmail(p.email), motivo: p.motivo });
  });

  const dedup = deduplicarPorEmail(sel.pessoas);
  dedup.repetidos.forEach(function (p) {
    resumo.pulados.repetido++;
    Logger.log(`Pulado (e-mail repetido na fonte): linha ${p.linha}, ${mascararEmail(p.email)}`);
  });

  if (dedup.unicos.length === 0) {
    Logger.log(`Nenhum aniversariante para ${datas.join(', ')}.`);
    return;
  }

  // 4. O que é igual para todos sai UMA vez: registro, imagem, assinatura, admin
  const preparo = {
    registro:   _abrirRegistro(fonte.planilha, hoje, resumo),
    imagem:     DriveApp.getFileById(CONFIG.imagemPrincipal.driveId).getBlob(),
    assinatura: _obterAssinatura(resumo),
    admin:      CONFIG.modoTeste && CONFIG.modoTesteDestino === 'admin' ? _emailDoAdmin() : '',
  };
  dedup.unicos.forEach(function (pessoa) {
    _enviarUm(pessoa, preparo, resumo);
  });
}

/**
 * Envia (ou simula) o e-mail de UMA pessoa.
 * Por que MailApp: ele cuida sozinho de acento no nome do remetente e no
 * assunto, da imagem anexada e da cópia, e só pede permissão para ENVIAR
 * (o GmailApp pediria acesso a toda a caixa de e-mail).
 */
function _enviarUm(pessoa, preparo, resumo) {
  const quem = `linha ${pessoa.linha}, ${mascararEmail(pessoa.email)}`;
  const chave = chaveEnvio(pessoa.dataComemorada, pessoa.email);

  if (preparo.registro.jaEnviado(chave)) {
    resumo.pulados.jaEnviado++;
    Logger.log(`Pulado (já recebeu o de ${pessoa.dataComemorada}): ${quem}`);
    return;
  }

  const assunto = substituirVariaveis(CONFIG.email.titulo, { primeiroNome: pessoa.nome }, false);
  const opcoes = {
    htmlBody: montarCorpoEmail({
      nome: pessoa.nome,
      textoAtivo: CONFIG.email.textoPersonalizado.ativo,
      texto: CONFIG.email.textoPersonalizado.conteudo,
      altText: CONFIG.imagemPrincipal.altText,
      assinaturaHtml: preparo.assinatura,
    }),
    inlineImages: {},
  };
  opcoes.inlineImages[ID_IMAGEM_NO_EMAIL] = preparo.imagem.copyBlob();
  if (CONFIG.remetente.nomeExibicao) opcoes.name = CONFIG.remetente.nomeExibicao;

  try {
    if (CONFIG.modoTeste && CONFIG.modoTesteDestino === 'log') {
      resumo.simulados++;
      Logger.log(`[TESTE] Seria enviado: ${quem} (aniversário de ${pessoa.dataComemorada})`);
      return;
    }
    if (CONFIG.modoTeste) {
      MailApp.sendEmail(preparo.admin, `[TESTE para ${pessoa.email}] ${assunto}`, assunto, opcoes);
      resumo.enviados++;
      Logger.log(`[TESTE] Enviado ao admin no lugar de: ${quem}`);
      return;   // teste não registra: o envio de verdade ainda vai acontecer
    }
    if (CONFIG.ccEmail) opcoes.cc = CONFIG.ccEmail;
    MailApp.sendEmail(pessoa.email, assunto, assunto, opcoes);
    resumo.enviados++;
    Logger.log(`Enviado: ${quem}`);
  } catch (erro) {
    resumo.falhas.push({ linha: pessoa.linha, email: mascararEmail(pessoa.email), motivo: erro.message });
    Logger.log(`Falha: ${quem}: ${erro.message}`);
    return;
  }

  try {
    preparo.registro.registrar(chave);
  } catch (erro) {
    resumo.falhas.push({ linha: pessoa.linha, email: mascararEmail(pessoa.email),
                         motivo: 'o e-mail saiu, mas não consegui registrar o envio: ' + erro.message });
  }
}

/** Separado só para os testes poderem fixar o "hoje". */
function _agora() {
  return new Date();
}


// =============================================================================
// FONTES DE DADOS: todas viram a mesma tabela (linha 0 = cabeçalhos)
// =============================================================================

/**
 * Lê a fonte configurada e devolve:
 *   linhas: tabela (linha 0 = cabeçalhos)
 *   fuso: fuso da planilha (só Google Sheets; as datas de lá vêm como objeto Date)
 *   planilha: a planilha aberta (para a aba "Envios"), ou null
 *   deslocamentoLinha: soma ao índice para dar o número da linha que a pessoa vê
 */
function _lerFonte() {
  if (CONFIG.fonteDados === 'google_sheets') {
    const planilha = SpreadsheetApp.openById(CONFIG.googleSheets.spreadsheetId);
    const aba = planilha.getSheetByName(CONFIG.googleSheets.sheetName);
    if (!aba) throw new Error(`Aba "${CONFIG.googleSheets.sheetName}" não encontrada na planilha.`);
    return {
      linhas: aba.getDataRange().getValues(),
      fuso: planilha.getSpreadsheetTimeZone(),
      planilha: planilha,
      deslocamentoLinha: 1,
    };
  }

  if (CONFIG.fonteDados === 'smartsheet') {
    return { linhas: _lerSmartsheet(), fuso: null, planilha: null, deslocamentoLinha: 0 };
  }

  // csv_drive. O Excel em português salva com ";" e, fora do modo "CSV UTF-8",
  // em Windows-1252: sem esta conversão os acentos dos nomes viram lixo.
  const blob = DriveApp.getFileById(CONFIG.csv.driveFileId).getBlob();
  let texto = blob.getDataAsString('UTF-8');
  if (texto.indexOf('�') !== -1) texto = blob.getDataAsString('windows-1252');
  texto = texto.replace(/^﻿/, '');
  return {
    linhas: Utilities.parseCsv(texto, detectarSeparadorCsv(texto)),
    fuso: null,
    planilha: null,
    deslocamentoLinha: 1,
  };
}

/** Busca a planilha no Smartsheet e converte para tabela. */
function _lerSmartsheet() {
  const resposta = UrlFetchApp.fetch(
    'https://api.smartsheet.com/2.0/sheets/' + encodeURIComponent(CONFIG.smartsheet.sheetId),
    { headers: { Authorization: 'Bearer ' + _tokenSmartsheet() }, muteHttpExceptions: true }
  );
  const codigo = resposta.getResponseCode();
  if (codigo === 401 || codigo === 403) {
    throw new Error(`O Smartsheet recusou o token (HTTP ${codigo}). Gere um novo e rode salvarTokenSmartsheet.`);
  }
  if (codigo !== 200) {
    throw new Error(`O Smartsheet respondeu HTTP ${codigo}. Confira CONFIG.smartsheet.sheetId.`);
  }
  return smartsheetParaLinhas(JSON.parse(resposta.getContentText()));
}

/** Token: primeiro das Propriedades do script; o do CONFIG só como alternativa insegura. */
function _tokenSmartsheet() {
  const salvo = PropertiesService.getScriptProperties().getProperty('SMARTSHEET_TOKEN');
  if (salvo) return salvo;
  if (!ehModelo(CONFIG.smartsheet.apiToken)) {
    Logger.log('Aviso: token do Smartsheet lido do código (inseguro). Rode salvarTokenSmartsheet.');
    return String(CONFIG.smartsheet.apiToken).trim();
  }
  throw new Error('Token do Smartsheet não encontrado. Rode salvarTokenSmartsheet ou crie a ' +
                  'propriedade SMARTSHEET_TOKEN em Configurações do projeto > Propriedades do script.');
}


// =============================================================================
// REGISTRO DE ENVIOS (para não mandar duas vezes)
// =============================================================================

/**
 * Abre o registro de quem já recebeu. Chave = 'AAAA-MM-DD|email', onde a data
 * é a do aniversário neste ano (não a do envio): mudar a regra de fim de
 * semana no meio do caminho não faz ninguém receber duas vezes.
 *   Fonte Google Sheets -> aba "Envios" na própria planilha
 *   Outras fontes (ou sem permissão de edição) -> Propriedades do script
 */
function _abrirRegistro(planilha, hoje, resumo) {
  if (planilha) {
    try {
      let aba = planilha.getSheetByName(NOME_ABA_ENVIOS);
      if (!aba) {
        aba = planilha.insertSheet(NOME_ABA_ENVIOS);
        aba.appendRow(['Chave (aniversário|e-mail)', 'Enviado em']);
      }
      const total = aba.getLastRow();
      const chaves = {};
      if (total > 1) {
        aba.getRange(2, 1, total - 1, 1).getValues().forEach(function (l) { chaves[String(l[0])] = true; });
      }
      return {
        jaEnviado: function (chave) { return chaves[chave] === true; },
        registrar: function (chave) { aba.appendRow([chave, new Date()]); chaves[chave] = true; },
      };
    } catch (erro) {
      resumo.avisos.push(`Não consegui usar a aba "${NOME_ABA_ENVIOS}" (${erro.message}). ` +
                         'Registro feito nas Propriedades do script.');
    }
  }

  const props = PropertiesService.getScriptProperties();
  const limite = somarDias(hoje, -DIAS_GUARDANDO_REGISTRO);
  props.getKeys().forEach(function (k) {
    if (k.indexOf(PREFIXO_REGISTRO) === 0 && k.substr(PREFIXO_REGISTRO.length, 10) < limite) {
      props.deleteProperty(k);
    }
  });
  return {
    jaEnviado: function (chave) { return props.getProperty(PREFIXO_REGISTRO + chave) !== null; },
    registrar: function (chave) { props.setProperty(PREFIXO_REGISTRO + chave, new Date().toISOString()); },
  };
}


// =============================================================================
// ASSINATURA, ADMIN E AVISO DE FALHA
// =============================================================================

/**
 * Assinatura padrão do Gmail da conta (serviço avançado Gmail, só leitura das
 * configurações). Sem o serviço ou sem assinatura: segue sem, com aviso.
 */
function _obterAssinatura(resumo) {
  if (!CONFIG.remetente.incluirAssinatura) return '';
  if (typeof Gmail === 'undefined') {
    resumo.avisos.push('Serviço Gmail não adicionado (Serviços > Gmail API): e-mail vai sem assinatura.');
    return '';
  }
  try {
    const lista = Gmail.Users.Settings.SendAs.list('me');
    const principal = ((lista && lista.sendAs) || []).filter(function (s) { return s.isPrimary; })[0];
    if (principal && principal.signature) return principal.signature;
    resumo.avisos.push('A conta não tem assinatura no Gmail: e-mail vai sem assinatura.');
  } catch (erro) {
    resumo.avisos.push('Não consegui ler a assinatura do Gmail: ' + erro.message);
  }
  return '';
}

/**
 * E-mail de quem cuida do robô: CONFIG.adminEmail ou a própria conta.
 * Sem nenhum dos dois, para com mensagem clara (nada de remetente inventado).
 */
function _emailDoAdmin() {
  if (CONFIG.adminEmail) return String(CONFIG.adminEmail).trim();
  let email = '';
  try {
    email = Session.getEffectiveUser().getEmail();
  } catch (erro) {
    // segue para a mensagem abaixo
  }
  if (!email) throw new Error('Não consegui descobrir o e-mail desta conta. Preencha CONFIG.adminEmail.');
  return email;
}

/** Manda o resumo para o admin. Só é chamada quando houve falha. */
function _avisarAdmin(resumo) {
  try {
    MailApp.sendEmail(_emailDoAdmin(),
      `[Birthday Bot] ${resumo.falhas.length} falha(s) em ${resumo.data || 'execução'}`,
      textoDoResumo(resumo));
  } catch (erro) {
    Logger.log('Não consegui mandar o resumo de falhas para o admin: ' + erro.message);
  }
}


// =============================================================================
// REGRAS PURAS: recebem tudo por parâmetro, não leem CONFIG nem chamam serviço
// do Google (exceto Utilities.formatDate). Por isso dá para testar fora do
// Apps Script (pasta tests/ do repositório).
// =============================================================================

// ----- datas -----------------------------------------------------------------

/** É um objeto Date? (funciona mesmo com Date criado em outro contexto) */
function ehData(valor) {
  return Object.prototype.toString.call(valor) === '[object Date]';
}

function ehBissexto(ano) {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

/** Monta 'AAAA-MM-DD'. */
function dataISO(ano, mes, dia) {
  return ano + '-' + (mes < 10 ? '0' : '') + mes + '-' + (dia < 10 ? '0' : '') + dia;
}

function _partesISO(iso) {
  const p = String(iso).split('-');
  return { ano: Number(p[0]), mes: Number(p[1]), dia: Number(p[2]) };
}

/** Soma dias a uma data 'AAAA-MM-DD' (conta em UTC: horário de verão não atrapalha). */
function somarDias(iso, dias) {
  const p = _partesISO(iso);
  const d = new Date(Date.UTC(p.ano, p.mes - 1, p.dia + dias));
  return dataISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function ehFimDeSemana(iso) {
  const p = _partesISO(iso);
  const diaDaSemana = new Date(Date.UTC(p.ano, p.mes - 1, p.dia)).getUTCDay();
  return diaDaSemana === 0 || diaDaSemana === 6;
}

/**
 * Lê uma data escrita como texto. Aceita AAAA-MM-DD, DD/MM/AAAA, DD-MM-AAAA,
 * DD.MM.AAAA, ano com 2 dígitos e também só DD/MM (sem ano).
 * Devolve { ano, mes, dia } (ano = null quando não veio) ou null se não for data.
 */
function lerDataTexto(texto) {
  const s = String(texto === null || texto === undefined ? '' : texto).trim();
  let ano = null;
  let mes;
  let dia;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/);
  if (m) {
    ano = Number(m[1]); mes = Number(m[2]); dia = Number(m[3]);
  } else {
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{4}|\d{2}))?(?:$|\s)/);
    if (!m) return null;
    dia = Number(m[1]); mes = Number(m[2]); ano = m[3] ? Number(m[3]) : null;
  }
  if (mes < 1 || mes > 12) return null;
  const maximo = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
  if (dia < 1 || dia > maximo) return null;
  if (ano !== null && ano >= 1000 && mes === 2 && dia === 29 && !ehBissexto(ano)) return null;
  return { ano: ano, mes: mes, dia: dia };
}

/**
 * Dia e mês do nascimento, venha a célula como Date (Google Sheets) ou texto.
 * fuso: fuso da PLANILHA. O Sheets entrega a data como meia-noite no fuso dela;
 * lida em outro fuso, ela pode cair no dia anterior.
 * Devolve { dia, mes } ou null.
 */
function extrairDiaMes(valor, fuso) {
  if (vazio(valor)) return null;
  let texto;
  if (ehData(valor)) {
    if (isNaN(valor.getTime())) return null;
    texto = fuso
      ? Utilities.formatDate(valor, fuso, 'yyyy-MM-dd')
      : dataISO(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
  } else {
    texto = String(valor).trim();
  }
  const d = lerDataTexto(texto);
  return d ? { dia: d.dia, mes: d.mes } : null;
}

/**
 * Em que data do ano `ano` se comemora quem nasceu em dia/mes.
 * 29/02 em ano não bissexto: regra29 = '28fev' (padrão) ou '01mar'.
 */
function dataComemoradaNoAno(dia, mes, ano, regra29) {
  if (dia === 29 && mes === 2 && !ehBissexto(ano)) {
    return regra29 === '01mar' ? dataISO(ano, 3, 1) : dataISO(ano, 2, 28);
  }
  return dataISO(ano, mes, dia);
}

/**
 * Converte a lista de feriados do CONFIG.
 * Devolve { datas: ['AAAA-MM-DD' (só naquele ano) ou 'MM-DD' (todo ano)], invalidos: [...] }
 */
function normalizarFeriados(lista) {
  const r = { datas: [], invalidos: [] };
  (Array.isArray(lista) ? lista : []).forEach(function (item) {
    const d = lerDataTexto(item);
    if (!d || (d.ano !== null && d.ano < 1000)) {
      r.invalidos.push(String(item));
      return;
    }
    r.datas.push(d.ano !== null ? dataISO(d.ano, d.mes, d.dia) : dataISO(2000, d.mes, d.dia).slice(5));
  });
  return r;
}

function ehFeriado(iso, feriados) {
  return feriados.indexOf(iso) !== -1 || feriados.indexOf(String(iso).slice(5)) !== -1;
}

/**
 * Quais datas de aniversário saem no envio de hoje.
 *   'enviar'          -> só hoje
 *   'antecipar_sexta' -> num dia útil: hoje + os dias sem expediente logo DEPOIS
 *                        (sexta leva sábado e domingo); em dia sem expediente: nada
 *   'adiar_segunda'   -> num dia útil: hoje + os dias sem expediente logo ANTES
 *                        (segunda leva sábado e domingo); em dia sem expediente: nada
 * Sem expediente = sábado, domingo ou feriado. Devolve datas em ordem.
 */
function datasDoEnvio(hoje, regras) {
  const regra = regras.fimDeSemana || 'enviar';
  const feriados = regras.feriados || [];
  if (regra === 'enviar') return [hoje];
  if (regra !== 'antecipar_sexta' && regra !== 'adiar_segunda') {
    throw new Error(`fimDeSemana inválido: "${regra}"`);
  }
  const diaUtil = function (d) { return !ehFimDeSemana(d) && !ehFeriado(d, feriados); };
  if (!diaUtil(hoje)) return [];

  const passo = regra === 'antecipar_sexta' ? 1 : -1;
  const datas = [hoje];
  let d = somarDias(hoje, passo);
  for (let i = 0; i < 31 && !diaUtil(d); i++) {
    datas.push(d);
    d = somarDias(d, passo);
  }
  return datas.sort();
}


// ----- texto, colunas e seleção ----------------------------------------------

function vazio(valor) {
  return valor === null || valor === undefined || String(valor).trim() === '';
}

/** Texto sem espaço sobrando (inclui quebra de linha no meio do nome). */
function textoLimpo(valor) {
  return vazio(valor) ? '' : String(valor).replace(/\s+/g, ' ').trim();
}

/**
 * Cabeçalho comparável: sem BOM, sem acento, minúsculo, um espaço só.
 * Por quê: 'E-mail Corporativo ' e 'e-mail corporativo' são a mesma coluna.
 */
function normalizarCabecalho(texto) {
  const semAcento = { á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e',
                      í: 'i', ì: 'i', î: 'i', ï: 'i', ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o',
                      ú: 'u', ù: 'u', û: 'u', ü: 'u', ç: 'c', ñ: 'n' };
  return String(texto === null || texto === undefined ? '' : texto)
    .replace(/^﻿/, '')
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .replace(/[áàâãäéèêëíìîïóòôõöúùûüçñ]/g, function (c) { return semAcento[c]; })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Acha cada coluna do CONFIG no cabeçalho da fonte.
 * A de desligamento, se configurada, é OBRIGATÓRIA: com o nome errado, os
 * desligados receberiam e-mail sem ninguém perceber.
 */
function localizarColunas(cabecalho, colunas) {
  const normalizados = (cabecalho || []).map(normalizarCabecalho);
  const achar = function (nome) { return vazio(nome) ? -1 : normalizados.indexOf(normalizarCabecalho(nome)); };
  const idx = {
    nome: achar(colunas.nome),
    dataNascimento: achar(colunas.dataNascimento),
    email: achar(colunas.email),
    desligamento: achar(colunas.desligamento),
  };
  const faltando = [];
  ['nome', 'dataNascimento', 'email', 'desligamento'].forEach(function (k) {
    if (idx[k] === -1 && !vazio(colunas[k])) faltando.push(colunas[k]);
  });
  ['nome', 'dataNascimento', 'email'].forEach(function (k) {
    if (vazio(colunas[k])) faltando.push(`(colunas.${k} vazio no CONFIG)`);
  });
  return { idx: idx, faltando: faltando };
}

/** Coluna de desligamento preenchida = desligado. Caixa de seleção desmarcada (false) não conta. */
function estaDesligado(valor) {
  if (valor === false) return false;
  return !vazio(valor);
}

/** Primeiro nome, ou o nome completo sem espaços sobrando. */
function resolverNome(nomeCompleto, usarNomeCompleto) {
  const limpo = textoLimpo(nomeCompleto);
  return usarNomeCompleto ? limpo : limpo.split(' ')[0];
}

/**
 * Separa, da tabela inteira, quem faz aniversário nas `datas` de hoje.
 * op = { colunas, fuso, datas, regra29, usarNomeCompleto, deslocamentoLinha }
 * Devolve { pessoas, desligados, invalidos, contagem, erro }.
 * Quem não faz aniversário hoje não aparece em lista nenhuma (nem no log).
 */
function selecionarAniversariantes(linhas, op) {
  const r = { pessoas: [], desligados: [], invalidos: [], contagem: { linhas: 0, comData: 0, dataIlegivel: 0 }, erro: '' };
  if (!linhas || !linhas.length) {
    r.erro = 'A fonte de dados veio vazia.';
    return r;
  }
  const col = localizarColunas(linhas[0], op.colunas);
  if (col.faltando.length) {
    r.erro = 'Coluna(s) não encontrada(s): "' + col.faltando.join('", "') + '". Cabeçalhos da fonte: "' +
             linhas[0].map(textoLimpo).join('", "') + '".';
    if (col.faltando.indexOf(op.colunas.desligamento) !== -1) {
      r.erro += ' A fonte não tem coluna de desligamento? Use colunas.desligamento: \'\' no CONFIG.';
    }
    return r;
  }
  const idx = col.idx;
  const deslocamento = op.deslocamentoLinha === undefined ? 1 : op.deslocamentoLinha;

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i] || [];
    const nome = textoLimpo(linha[idx.nome]);
    const email = textoLimpo(linha[idx.email]);
    const nascimento = linha[idx.dataNascimento];
    if (!nome && !email && vazio(nascimento)) continue;   // linha em branco
    r.contagem.linhas++;
    if (vazio(nascimento)) continue;
    r.contagem.comData++;

    // A data é lida ANTES de virar texto: o Date do Sheets não pode passar por toString()
    const dm = extrairDiaMes(nascimento, op.fuso);
    if (!dm) {
      r.contagem.dataIlegivel++;
      continue;
    }
    const comemorada = (op.datas || []).filter(function (d) {
      return dataComemoradaNoAno(dm.dia, dm.mes, Number(d.slice(0, 4)), op.regra29) === d;
    })[0];
    if (!comemorada) continue;

    const pessoa = { linha: i + deslocamento, nome: resolverNome(nome, op.usarNomeCompleto), email: email, dataComemorada: comemorada };
    if (idx.desligamento !== -1 && estaDesligado(linha[idx.desligamento])) {
      r.desligados.push(pessoa);
    } else if (!pessoa.nome) {
      pessoa.motivo = 'nome vazio';
      r.invalidos.push(pessoa);
    } else if (!emailValido(email)) {
      pessoa.motivo = 'e-mail vazio ou inválido';
      r.invalidos.push(pessoa);
    } else {
      r.pessoas.push(pessoa);
    }
  }
  return r;
}

/** Mesmo e-mail em duas linhas = um e-mail só (fica a primeira linha). */
function deduplicarPorEmail(pessoas) {
  const vistos = {};
  const r = { unicos: [], repetidos: [] };
  (pessoas || []).forEach(function (p) {
    const k = String(p.email || '').trim().toLowerCase();
    if (vistos[k]) {
      r.repetidos.push(p);
    } else {
      vistos[k] = true;
      r.unicos.push(p);
    }
  });
  return r;
}

/** Converte a resposta da API do Smartsheet em tabela (linha 0 = títulos das colunas). */
function smartsheetParaLinhas(dados) {
  const colunas = (dados && dados.columns) || [];
  const linhas = [colunas.map(function (c) { return c.title; })];
  ((dados && dados.rows) || []).forEach(function (row) {
    const porId = {};
    (row.cells || []).forEach(function (c) { porId[c.columnId] = c.value; });
    linhas.push(colunas.map(function (c) { return porId[c.id] === undefined ? '' : porId[c.id]; }));
  });
  return linhas;
}

/** CSV com mais ";" que "," na primeira linha usa ";" (padrão do Excel em português). */
function detectarSeparadorCsv(texto) {
  const primeira = String(texto || '').split(/\r?\n/)[0];
  const contar = function (c) { return primeira.split(c).length - 1; };
  return contar(';') > contar(',') ? ';' : ',';
}


// ----- e-mail ------------------------------------------------------------------

function emailValido(email) {
  return /^[^\s@<>(),;:"\[\]]+@[^\s@<>(),;:"\[\]]+\.[A-Za-z]{2,}$/.test(String(email || '').trim());
}

/** 'joao.silva@empresa.com' -> 'jo***@empresa.com' (o log não guarda o e-mail inteiro). */
function mascararEmail(email) {
  const s = String(email || '').trim();
  const arroba = s.lastIndexOf('@');
  if (arroba < 1) return '***';
  const local = s.slice(0, arroba);
  return (local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2)) + '***' + s.slice(arroba);
}

/** Chave do registro de envios: 'AAAA-MM-DD|email-em-minusculas'. */
function chaveEnvio(dataISOComemorada, email) {
  return dataISOComemorada + '|' + String(email || '').trim().toLowerCase();
}

/** Escapa & < > " ' para o nome não quebrar (nem injetar) o HTML do e-mail. */
function escaparHtml(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Troca {{variavel}} pelo valor. escapar = true no HTML, false no assunto. */
function substituirVariaveis(texto, variaveis, escapar) {
  if (!texto) return '';
  return String(texto).replace(/\{\{\s*(\w+)\s*\}\}/g, function (marca, chave) {
    if (!Object.prototype.hasOwnProperty.call(variaveis, chave)) return marca;
    return escapar ? escaparHtml(variaveis[chave]) : String(variaveis[chave]);
  });
}

/**
 * Corpo HTML do e-mail: texto opcional + imagem anexada (cid) + assinatura.
 * p = { nome, textoAtivo, texto, altText, assinaturaHtml }
 * A assinatura vem do Gmail da própria conta e entra como está.
 */
function montarCorpoEmail(p) {
  let corpo = '';
  if (p.textoAtivo) corpo += substituirVariaveis(p.texto, { primeiroNome: p.nome }, true);
  corpo += '<div style="text-align: center;">' +
           '<img src="cid:' + ID_IMAGEM_NO_EMAIL + '" alt="' + escaparHtml(p.altText) + '"' +
           ' style="max-width: 400px; width: 100%; height: auto; display: block; margin: 0 auto;">' +
           '</div>';
  if (p.assinaturaHtml) corpo += '<div style="margin-top: 30px;">' + p.assinaturaHtml + '</div>';
  return corpo;
}


// ----- resumo e validação ------------------------------------------------------

function novoResumo(origem, modoTeste, destinoTeste) {
  return {
    versao: VERSAO,
    origem: origem,
    modo: !modoTeste ? 'real' : (destinoTeste === 'log' ? 'teste, só log' : 'teste, e-mails para o admin'),
    data: '',
    datasCobertas: [],
    linhasLidas: 0,
    datasIlegiveis: 0,
    enviados: 0,
    simulados: 0,
    pulados: { jaEnviado: 0, desligado: 0, repetido: 0 },
    falhas: [],
    avisos: [],
    situacao: 'em andamento',
  };
}

/** Resumo em texto: vai para o log e, quando há falha, para o adminEmail. */
function textoDoResumo(r) {
  const l = [];
  l.push(`Birthday Bot ${r.versao}: resumo de ${r.data || '(data não calculada)'} (${r.origem}, modo ${r.modo})`);
  l.push(`Situação: ${r.situacao}`);
  if (r.datasCobertas.length) l.push(`Aniversários cobertos: ${r.datasCobertas.join(', ')}`);
  l.push(`Linhas lidas: ${r.linhasLidas} (datas que não consegui ler: ${r.datasIlegiveis})`);
  l.push(`Enviados: ${r.enviados}` + (r.simulados ? ` | Simulados (só log): ${r.simulados}` : ''));
  l.push(`Pulados: já tinham recebido ${r.pulados.jaEnviado}, desligados ${r.pulados.desligado}, ` +
         `e-mail repetido ${r.pulados.repetido}`);
  l.push(`Falhas: ${r.falhas.length}`);
  r.falhas.forEach(function (f) {
    l.push('  - ' + (f.linha ? `linha ${f.linha} (${f.email}): ` : '') + f.motivo);
  });
  if (r.avisos.length) {
    l.push('Avisos:');
    r.avisos.forEach(function (a) { l.push('  - ' + a); });
  }
  return l.join('\n');
}

/** Campo vazio ou ainda com o texto de modelo 'COLE_AQUI...'. */
function ehModelo(valor) {
  return vazio(valor) || /^COLE_AQUI/.test(String(valor).trim());
}

/** Lista o que está errado no CONFIG (vazia = tudo certo). */
function listarProblemasDeConfiguracao(cfg) {
  const p = [];
  const umDe = function (valor, opcoes, nome) {
    if (opcoes.indexOf(valor) === -1) p.push(`${nome} = "${valor}" não existe. Use: '${opcoes.join("', '")}'.`);
  };
  const listaDeEmails = function (texto) {
    return String(texto).split(',').map(function (e) { return e.trim(); }).filter(Boolean);
  };

  umDe(cfg.fonteDados, ['google_sheets', 'smartsheet', 'csv_drive'], 'fonteDados');
  if (cfg.fonteDados === 'google_sheets' && (ehModelo(cfg.googleSheets.spreadsheetId) || ehModelo(cfg.googleSheets.sheetName))) {
    p.push('Preencha googleSheets.spreadsheetId e googleSheets.sheetName.');
  }
  if (cfg.fonteDados === 'smartsheet' && ehModelo(cfg.smartsheet.sheetId)) p.push('Preencha smartsheet.sheetId.');
  if (cfg.fonteDados === 'csv_drive' && ehModelo(cfg.csv.driveFileId)) p.push('Preencha csv.driveFileId.');
  if (ehModelo(cfg.imagemPrincipal.driveId)) p.push('Preencha imagemPrincipal.driveId.');
  umDe(cfg.fimDeSemana, ['enviar', 'antecipar_sexta', 'adiar_segunda'], 'fimDeSemana');
  umDe(cfg.aniversario29Fev, ['28fev', '01mar'], 'aniversario29Fev');
  if (cfg.modoTeste) umDe(cfg.modoTesteDestino, ['admin', 'log'], 'modoTesteDestino');
  if (!Array.isArray(cfg.feriados)) p.push("feriados precisa ser uma lista, ex.: ['25/12', '2027-02-08'].");
  if (!vazio(cfg.adminEmail) && !emailValido(cfg.adminEmail)) p.push(`adminEmail inválido: "${cfg.adminEmail}".`);
  if (!vazio(cfg.ccEmail) && !listaDeEmails(cfg.ccEmail).every(emailValido)) p.push(`ccEmail inválido: "${cfg.ccEmail}".`);
  return p;
}
