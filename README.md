# LearnOS

Biblioteca pessoal para ler, pensar e lembrar. Consolida o protótipo do GitHub, o projeto Learning-Nexus e o estudo original de psicologia.

## Incluído

- Estante, temas, lista, busca, filtros e contadores derivados do acervo.
- Leitor editorial com papel/sépia/noite, tipografia, foco e voz do aparelho.
- Destaques persistidos e notas ancoradas aos parágrafos, com caderno por fonte.
- Notas com claims, comentários, perguntas e citações separados.
- Revisão com tentativa escrita, histórico e intervalos; conexões editáveis.
- Recortes, artigos públicos e arquivos PDF/EPUB/DOCX/texto/imagem/áudio/vídeo.
- Backup ZIP completo, migração dos dois formatos antigos e edição PDF.
- PWA, armazenamento local, sincronização privada e servidor MCP autenticado.
- IA real por Vercel AI Gateway; sem respostas de demonstração no lugar de uma chamada falha.

## Desenvolvimento

Node 22+ e npm. `npm ci`, `npm run build`, `npm test`.

O frontend usa Vite. Na Vercel, as funções em `api/` ficam no mesmo domínio. Para desenvolvimento integrado, vincule o projeto correto, configure as variáveis e execute `vercel dev`. O comando `npm run dev` abre só o frontend; as funções online ficam indisponíveis sem o servidor da Vercel.

## Serviços

O projeto usa Vercel Blob privado para espaços e arquivos, por `BLOB_STORE_ID` com OIDC ou `BLOB_READ_WRITE_TOKEN`. A IA usa OIDC da Vercel ou `AI_GATEWAY_API_KEY` local. A conta precisa permitir chamadas ao AI Gateway. Os modelos foram conferidos no catálogo ao implementar; estão em `server/assistant.ts`.

Em Meu espaço, crie um espaço privado ou conecte usando a chave de outro aparelho. A chave funciona como uma credencial; guarde-a em local seguro. Ela não é incluída no backup. O acervo continua disponível localmente quando a rede falha. Reabrir o app nunca grava os dados de exemplo antes da hidratação.

## MCP

Endpoint `/api/mcp`, transporte HTTP, protocolo 2025-03-26. Cabeçalho `Authorization: Bearer <chave privada do espaço>`.

Ferramentas: `list_sources`, `read_source`, `list_notes`, `add_source`, `add_note`. Operações de escrita usam ETags e rejeitam concorrência para preservar alterações. Adições de artigos são deduplicadas pelo endereço original. Não há integração implícita com bookmarks de redes sociais: o agente precisa ter seu próprio acesso à origem dos links.

## Limites explícitos

- PDFs escaneados ficam disponíveis como arquivo; OCR não é executado automaticamente.
- Extração de páginas depende do acesso permitido pela origem, sem contornar paywalls ou login.
- A leitura em voz alta usa a síntese do aparelho; não é um podcast gerado em arquivo.
- A edição exporta os textos disponíveis e as notas; não oferece compra/impressão física.
- IA: 4 solicitações/minuto e 30/dia por espaço; importação: 20/hora. Os limites são persistidos em Blob.
- Cadernos sincronizados têm limite de 3,5 MB de metadados/texto por solicitação. Arquivos de até 120 MB usam upload direto e privado.
- Um backup ZIP contém os arquivos acessíveis no aparelho, além do caderno. Falta de algum original é informada.

## Validação

`tests/model.test.ts` cobre preservação/migração de dados, retorno de cartões, mesclagem e remoções, além da proteção da ingestão de URLs. Os fluxos de navegador são verificados com dados locais de teste antes da publicação.
