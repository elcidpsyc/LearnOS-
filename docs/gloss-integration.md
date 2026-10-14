# Gloss → LearnOS

Referências solicitadas: https://usegloss.io e https://github.com/Nutlope/gloss.
Repositório de referência examinado em 14/10/2026: `54b13b8882d8a109132c5b2045acd6b45628563d`.
Base LearnOS: `c308082e889736592dc882115a7bd7b924f54a3d`.

## Origem e abordagem

O comportamento público do site e o inventário do repositório orientaram esta adaptação. Nenhum arquivo LICENSE ou declaração de licença foi localizado na revisão examinada; o metadado GitHub também não indicava licença. O código foi implementado no LearnOS de forma independente, sem transplantar código, identidade visual ou assets do Gloss. O fork solicitado é uma referência separada; não substitui o repositório LearnOS.

## Funções adaptadas

| Referência             | Implementação LearnOS                                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leitura com margem     | Texto original e anotações/conversas ao lado; painel inferior no celular; foco sem margem.                                                                                                                      |
| Seleção de trechos     | Âncoras com offsets e verificação de texto; uma seleção pode atravessar vários parágrafos.                                                                                                                      |
| Menu contextual        | Perguntar, explicar, definir, simplificar, destacar em quatro cores, copiar, anotar, guardar dúvida, traduzir, comparar, verificar fontes, criar cartões e lembrar depois.                                      |
| Conversas no texto     | Histórico persistido por trecho, continuação, regeneração, cópia e exclusão. Perguntas sobre o documento também entram no caderno.                                                                              |
| Contexto de leitura    | Contexto limitado com preferência pelo trecho selecionado. Documentos grandes informam explicitamente quando o contexto fornecido é parcial.                                                                    |
| Referências            | Links para parágrafos válidos; comparação entre fontes usa A/B; fontes externas são exclusivamente resultados recuperados.                                                                                      |
| Visão geral            | Síntese, afirmações atribuídas e mapa de seções com referências; resultado estruturado e salvo com o material.                                                                                                  |
| Aparência e respostas  | Papel, sépia, branco, noite, tinta e sistema; Newsreader, Literata, Inter e Atkinson Hyperlegible; tamanho, entrelinha, largura, alinhamento, recuo; resposta curta/equilibrada/detalhada e rápida/aprofundada. |
| Mapa e retomada        | Minimap com posição/destaques no desktop, mapa em painel no celular, progresso e último parágrafo.                                                                                                              |
| Atalhos                | J/K, Enter, /, N, F, B, [ e ], ?; seleção seguida de digitação abre uma pergunta.                                                                                                                               |
| Caderno                | Um por material, com filtros/busca; notas vinculadas não são duplicadas; Markdown individual e ZIP da coleção.                                                                                                  |
| Biblioteca             | Estante com nomes legíveis, capas, lista/temas, retomada, pastas/tags, metadados editáveis, organização sugerida por IA e busca em conversas.                                                                   |
| Entrada de conteúdo    | Links, texto colado, PDF/EPUB/DOCX e formatos existentes; exports HTML/CSV/JSON/texto de bookmarks; importação em lote com resultado por link.                                                                  |
| Artigos                | Extração de títulos, texto, listas, citações, código, tabelas em texto e imagens disponíveis; capa original quando informada pela página.                                                                       |
| Revisão de destaques   | Explicação escrita, retorno ao contexto e agenda manual de revisão. Complementa os cartões existentes; não equivale a avaliação automática da resposta.                                                         |
| Leitura em voz alta    | Vozes do navegador, pausa/retomada e velocidade; conteúdo mantém o idioma original.                                                                                                                             |
| Integração com agentes | MCP autenticado ganha busca na biblioteca, temas, texto e lote de até cinco artigos, mantendo ETags e deduplicação.                                                                                             |

## Melhorias próprias preservadas

Tradução somente quando solicitada; comparação de dois materiais; anotação canônica com claims/comentários/perguntas; revisão com histórico; conexões editáveis; arquivos locais e nuvem privada; backup/migração; leitura em português ou no idioma original do material.

## Dependências e limites

- IA requer acesso válido ao Vercel AI Gateway. Configuração de credencial não comprova que o provedor autoriza a geração. A interface exibe erros reais e não os substitui por respostas fictícias.
- Web requer `EXA_API_KEY` no servidor. São recuperadas até cinco fontes; isso não garante revisão científica nem cobertura completa do assunto.
- Respostas usam uma chamada JSON, com skeleton enquanto aguardam. Streaming incremental de tokens não foi adicionado.
- OCR de PDFs escaneados, capas geradas por IA, áudio de alta fidelidade em arquivo e impressão física não foram adicionados. PDFs sem texto continuam disponíveis como arquivo original.
- Bookmarks do X dependem de links/exports fornecidos e do acesso permitido ao conteúdo; nenhuma conta social é conectada automaticamente.
- Pastas são caminhos textuais com filtro; ainda não há arrastar e soltar nem editor de árvore de pastas.
- A aba de projetos, notificações do sistema sete vezes ao dia e progressão gamificada continuam no roteiro da entrevista; esta mudança concentra-se em biblioteca/leitor/caderno.
- O leitor adapta a apresentação ao celular via layout responsivo. Isso não cria um aplicativo nativo separado.
- Metadados/textos sincronizados continuam limitados a 3,5 MB por solicitação, e arquivos a 120 MB; preservados os limites de IA/importação.

## Verificação

Testes de regressão cobrem âncoras/sobreposições, migração de configurações, conversas nos backups, deduplicação de notas, contexto parcial, importação de bookmarks, URLs renderizadas e mesclagem com exclusões. Os resultados de compilação e navegador serão registrados após a verificação da prévia desta branch.
