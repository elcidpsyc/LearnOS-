# Leitura de arquivos e objetos da biblioteca

Ao importar PDF, EPUB, DOCX ou texto, confira a prévia antes de guardar. A fila aceita vários arquivos e pede confirmação de cada material. Na biblioteca, abra os detalhes da fonte e escolha **Organizar texto do material**; o mesmo comando fica no leitor, no botão com ícone de digitalização.

## Organização

- PDF: a posição física dos fragmentos determina linhas e ordem de leitura. Espaços vazios do OCR são ignorados na geometria. O leitor agrupa parágrafos por recuo e espaçamento, recoloca capitulares no começo da frase, reúne títulos em várias linhas, remove cabeçalhos recorrentes nas margens e recompõe palavras partidas. Compostos com prefixos frequentes, como `half-century`, conservam o hífen. As opções permitem uma ou duas colunas, detecção automática e desativar cada limpeza. São heurísticas: confira materiais com tabelas, notas extensas ou diagramação incomum.
- EPUB: a sequência vem do `spine` da publicação, com caminhos relativos resolvidos no ZIP. Títulos, listas, citações, código e tabelas mantêm tipos distintos, sem repetir o texto dos elementos internos. Metadados fornecem título, autoria, idioma e ano; a capa original vira uma miniatura raster local. O sumário do leitor vem dos títulos encontrados no arquivo e funciona sem IA.
- O idioma original é preservado. Nenhum texto é enviado à IA para esta organização. O relatório informa páginas sem texto e caracteres ilegíveis; OCR novo e correção de erros já presentes na digitalização não foram implementados.

## Aplicar em um material existente

A prévia compara texto atual e nova organização, com totais de referências localizadas e referências para conferir. A aplicação atualiza o mesmo material e seu caderno, em uma única alteração do estado mais recente. O arquivo original não é modificado.

Parágrafos idênticos e únicos conservam o identificador. Parágrafos alterados recebem identificadores novos, acima dos antigos, para que citações anteriores não apontem silenciosamente a outro conteúdo. Seleções são buscadas com tolerância a espaços, com offsets exatos na nova redação; ocorrências ambíguas ou ausentes não são adivinhadas. Elas permanecem no caderno como **Trecho da versão anterior**, com conteúdo, citação e conversa preservados. Cartões e notas também são conservados. A visão geral gerada anteriormente é invalidada, pois suas referências podem ter mudado. A posição de leitura é remapeada pelo parágrafo preservado ou página correspondente.

## Biblioteca

Capas e lombadas modeladas em DOM/CSS, arte vetorial original como alternativa, capas reais do EPUB, documentos com páginas em camadas e formatos de mídia identificados. As pastas mostram papéis, contagem real de materiais, subpastas e caminho de navegação. A organização continua baseada no campo Pasta de cada fonte; não há arrastar e soltar nem editor separado de pastas vazias.

Os títulos completos continuam visíveis nas legendas e nas ações acessíveis. Hover é complementar; abrir, organizar e navegar funcionam com clique, teclado e toque. As animações respeitam a preferência por movimento reduzido. Não foi adicionada dependência de Three.js, canvas contínuo ou geração remota. A tentativa de gerar arte com Higgsfield foi recusada pelo requisito de plano Basic ou superior, sem tarefa de geração criada; nenhuma imagem dessa tentativa foi utilizada.

## Verificação reproduzível

`npm test`, `npm run build` e `npx tsc --noEmit -p api/tsconfig.json`.

Para conferir um arquivo real sem adicioná-lo ao repositório: `node --import tsx scripts/check-document.ts /caminho/livro.pdf` (também aceita EPUB). O diagnóstico imprime metadados, relatório, amostras e páginas identificadas como duas colunas. Não inclui os livros no Git.

## Refinamento da conferência

A prévia agora agrupa PDF por página física e divide seções longas de EPUB em lotes legíveis. O cabeçalho aparece uma vez, há salto direto de página/seção e um acesso ao original. Páginas sem texto são listadas em um aviso expansível; folhas vazias não são automaticamente classificadas como erro de OCR.

No lápis de cada bloco é possível corrigir texto, mudar entre título/parágrafo/citação/lista/código/tabela, unir ao próximo bloco da mesma página/seção ou ignorar um ruído. Essas alterações permanecem na prévia até guardar/aplicar. **Restaurar extração** desfaz todas as correções dessa sessão. O arquivo original é preservado; textos antigos com notas passam pelo mesmo remapeamento e sinalização de referências não localizadas.
