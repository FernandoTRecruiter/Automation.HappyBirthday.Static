# Changelog

## [2.0.0] - 2026-10-21

A instalação continua a mesma: um arquivo só (`BirthdayBot.gs`), colado no editor, com o bloco `CONFIG` no topo. O comportamento só mudou onde a v1 mandava errado, deixava de mandar ou expunha dado. Cada item abaixo tem teste em `tests/` (`npm test`).

### Corrigido

1. **Ninguém recebia quando a coluna de nascimento era data no Google Sheets** (o caso mais comum). O Sheets entrega a célula como objeto de data; a v1 virava isso em texto ("Thu Mar 15 1990 00:00:00 GMT-0300...") antes de ler o dia e o mês, e esse texto não batia com nenhum formato. Agora a data é lida antes de virar texto, no fuso da **planilha**, e o "hoje" segue o fuso do **projeto** (`timeZone` no `appsscript.json`).
2. **Quem nasceu em 29/02 só era lembrado em ano bissexto.** Nova opção `aniversario29Fev`: `'28fev'` (padrão) ou `'01mar'`.
3. **Com `enviarFinsDeSemana: false`, quem fazia aniversário no sábado ou domingo nunca recebia.** A opção virou `fimDeSemana`: `'enviar'` (padrão, igual à v1), `'antecipar_sexta'` (a sexta leva sábado e domingo) ou `'adiar_segunda'` (a segunda leva o fim de semana). Nova lista `feriados`, tratada igual a fim de semana.
4. **Rodar duas vezes mandava em dobro** (acionador repetido, ou alguém rodando `EnvioManual` depois). Agora cada envio fica registrado com a chave `AAAA-MM-DD|email` (a data é a do aniversário neste ano), na aba `Envios` da planilha quando a fonte é o Google Sheets, senão nas Propriedades do script. Quem já recebeu é pulado. Uma trava (`LockService`) impede duas execuções ao mesmo tempo.
5. **A primeira execução já mandava para a empresa inteira.** Novo `modoTeste`, ligado de fábrica: cada e-mail vai para o `adminEmail` com o destinatário real no assunto (`modoTesteDestino: 'admin'`), ou nada sai e só o log registra (`'log'`). O teste não marca ninguém como enviado.
6. **O envio diário dependia de um passo a passo de cliques**, e era fácil criar o acionador duas vezes. Novas funções `instalarAcionador()` (cria o diário no horário de `horaDoEnvio`, apagando os anteriores) e `removerAcionadores()`.
7. **Erro só ia para o log, que ninguém lê.** Ao fim de cada execução sai um resumo (enviados, pulados, falhas) no log e, se houve falha, por e-mail para o `adminEmail`. As funções devolvem esse resumo.
8. **A imagem era baixada do Drive uma vez por aniversariante.** Agora é baixada uma vez por execução (a assinatura também).
9. **Nome do remetente com acento ia cru no cabeçalho "De"** (ex.: "Gente & Gestão" podia chegar quebrado). O envio trocou o e-mail montado à mão (Gmail API) pelo `MailApp.sendEmail` com `name`, `cc`, `htmlBody` e `inlineImages`. Por quê:
   - ele codifica sozinho acento no nome e no assunto, e monta a imagem anexada: some o código de MIME feito à mão, onde estavam esse defeito e o risco de um e-mail malformado na planilha virar cabeçalho extra;
   - pede só a permissão de **enviar** e-mail (`script.send_mail`). O `GmailApp`, com as mesmas opções, pediria acesso a **toda** a caixa de e-mail;
   - a cota diária de destinatários do Apps Script sobra para aniversários (poucos por dia).

   O serviço avançado Gmail continua, só para ler a assinatura (permissão `gmail.settings.basic`). Sem ele, o e-mail sai sem assinatura e o resumo avisa.
10. **O nome entrava no HTML sem escapar:** um nome com `<`, `&` ou apóstrofo quebrava o e-mail ou injetava HTML. Agora `& < > " '` são escapados no corpo; no assunto (texto puro) o nome vai como está.
11. **Token do Smartsheet escrito no código.** Agora o robô lê primeiro das Propriedades do script (`SMARTSHEET_TOKEN`). A função `salvarTokenSmartsheet()` guarda o token uma vez. O campo `smartsheet.apiToken` ficou só como alternativa, marcada como insegura.
12. **O título da coluna tinha de ser idêntico** (acento, maiúscula, espaço). Agora os dois lados são comparados sem acento, em minúsculas e sem espaço sobrando (inclui o caractere invisível BOM do início de CSV).
13. **O mesmo e-mail em duas linhas recebia duas vezes.** Agora conta uma vez (fica a primeira linha).
14. **O log listava nome e e-mail de todo mundo, e cada desligado todo dia** (data de nascimento é dado pessoal, LGPD). Agora o log mostra o número da linha e o e-mail mascarado (`jo***@empresa.com`); desligado só aparece no dia do aniversário dele.
15. **Remetente inventado de reserva (`noreply@empresa.com`).** Saiu. O remetente é sempre a conta que roda o script; se o robô precisar do e-mail do admin e não conseguir descobrir, para com uma mensagem clara pedindo o `adminEmail`.

### Outros defeitos encontrados e corrigidos

16. **Coluna de desligamento com nome errado era ignorada em silêncio, e os desligados recebiam.** Agora, se `colunas.desligamento` está preenchida e a coluna não existe na fonte, o robô para e avisa. Fonte sem essa coluna: `desligamento: ''`.
17. **CSV salvo pelo Excel em português não era lido:** ele usa `;` como separador (a v1 só entendia `,`), pode começar com o caractere invisível BOM e, fora do modo "CSV UTF-8", grava os acentos em Windows-1252 ("Otávio" chegava como "Ot�vio"). Os três casos são tratados.
18. **A cópia de fábrica ia para um endereço de exemplo num domínio de terceiros**: quem esquecesse de trocar mandava cópia de cada parabéns para fora da empresa. O padrão agora é `ccEmail: ''`.
19. **O README mandava compartilhar a imagem com "qualquer pessoa com o link"**, o que não é necessário: o robô anexa a imagem dentro do e-mail. A instrução saiu.

### Novo

- A coluna de nascimento também aceita `DD/MM` sem ano (guarda menos dado pessoal), dia ou mês com um dígito e data com horário. Data impossível (31/02) é recusada.
- Se nenhuma data da fonte puder ser lida, o robô trata como falha e avisa o admin, em vez de dizer "nenhum aniversariante" para sempre (foi assim que o defeito 1 passou despercebido).
- Linha com nome vazio ou e-mail inválido no dia do aniversário entra no resumo de falhas, com o número da linha.
- Validação do `CONFIG` no início, com a lista do que corrigir.
- `appsscript.json` (fuso `America/Sao_Paulo`, V8, serviço Gmail, permissões mínimas), `.claspignore` para quem usa clasp, testes no Node (`npm test`), cartão-modelo genérico em `docs/` e lista fictícia em `exemplos/`.

### Pequenos ajustes

- A imagem ganhou `width: 100%` além do `max-width: 400px`, para não estourar a tela do celular.

### Como atualizar da v1

1. Anote os valores do seu `CONFIG` antigo, cole o `BirthdayBot.gs` novo por cima de tudo e preencha o bloco novo.
2. `email.enviarFinsDeSemana: false` virou `fimDeSemana: 'antecipar_sexta'` ou `'adiar_segunda'` (escolha). `true` virou `'enviar'`.
3. Token do Smartsheet: rode `salvarTokenSmartsheet` e deixe `apiToken: ''`.
4. Apague o acionador antigo (ícone do relógio) ou rode `instalarAcionador`, que apaga os acionadores do robô e cria um só.
5. Rode `EnvioManual` em `modoTeste: true`, confira o e-mail de teste e só então mude para `false`.

## [1.x]

Versão original: envio pela Gmail API com o e-mail montado à mão, leitura de Google Sheets, Smartsheet e CSV no Drive.
