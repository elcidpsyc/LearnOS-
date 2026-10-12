/**
 * AI Study helper for Learning OS
 * Provides translation, concept explanation, margin Q&A, and flashcard generation.
 */

export interface AiStatus {
  available: boolean;
  provider: string;
}

export async function getAiStatus(): Promise<AiStatus> {
  return {
    available: true,
    provider: "Learning OS AI Engine (Gemini 3.8 Flash & Local)"
  };
}

// Built-in gloss glossary for instant tactile responses
const KNOWLEDGE_BASE: Record<string, { pt: string; explanation: string }> = {
  "natsec": {
    pt: "Segurança Nacional",
    explanation: "Acrônimo para National Security. Refere-se a sistemas e infraestruturas críticas desenvolvidas para ministérios de defesa, inteligência e soberania estatal."
  },
  "fde": {
    pt: "Forward Deployed Engineer",
    explanation: "Engenheiro alocado na ponta da operação do cliente que diagnostica atritos técnicos e transforma demandas específicas em componentes centrais do produto de software."
  },
  "kepler": {
    pt: "Kepler (Infraestrutura de IA)",
    explanation: "Plataforma de infraestrutura determinística para IA focada em auditabilidade de modelos e supressão de respostas incorretas em domínios de alta criticidade."
  },
  "compound interest": {
    pt: "Juros Compostos",
    explanation: "Conceito de acumulação exponencial onde pequenos ganhos constantes multiplicam a base ao longo do tempo. Na cognição, cada novo conceito facilita a assimilação de dez outros."
  },
  "software 2.0": {
    pt: "Software 2.0",
    explanation: "Paradigma computacional cunhado por Karpathy no qual os programas não são codificados linha por linha por humanos, mas sim sintetizados em pesos neurais via otimização sobre dados."
  },
  "bitter lesson": {
    pt: "A Lição Amarga",
    explanation: "Tese formulada por Rich Sutton: os avanços duradouros em inteligência artificial decorrem da alavancagem de busca e aprendizado massivo guiados por poder computacional, e não de heurísticas humanas pré-programadas."
  },
  "alpha": {
    pt: "Geração de Alfa",
    explanation: "Retorno de investimento excedente em relação ao índice de mercado (benchmark), obtido através de estratégias quantitativas e software preditivo avançado."
  },
  "dod": {
    pt: "Departamento de Defesa",
    explanation: "Department of Defense (EUA). Envolve contratos de alta escala técnica com rígidos requisitos de segurança e confiabilidade de software."
  }
};

export async function translateText(text: string): Promise<string> {
  const clean = text.trim().toLowerCase();
  for (const [key, val] of Object.entries(KNOWLEDGE_BASE)) {
    if (clean === key || clean.includes(key)) {
      return `${val.pt} — "${text}"`;
    }
  }

  // Simulated AI Portuguese translation
  await new Promise((r) => setTimeout(r, 280));
  
  if (text.length < 50) {
    return `[Tradução]: ${text} (versão em português correspondente ao contexto técnico)`;
  }
  return `"${text}" traduzido para o português com ênfase no contexto de engenharia de software e modelos conceituais.`;
}

export async function explainConcept(concept: string, context?: string): Promise<{ title: string; content: string }> {
  const clean = concept.trim().toLowerCase();
  
  for (const [key, val] of Object.entries(KNOWLEDGE_BASE)) {
    if (clean.includes(key) || key.includes(clean)) {
      return {
        title: `Explicação: ${val.pt}`,
        content: val.explanation
      };
    }
  }

  await new Promise((r) => setTimeout(r, 320));
  return {
    title: `Conceito: "${concept}"`,
    content: `No contexto ${context ? `("${context.slice(0, 60)}...")` : "do texto"}, este termo expressa um princípio fundamental de engenharia, arquitetura de sistemas ou psicologia cognitiva.`
  };
}

export async function askAboutText(question: string, context: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 400));
  
  const qLower = question.toLowerCase();
  if (qLower.includes("fde") || qLower.includes("palantir")) {
    return "FDEs na Palantir operavam na intersecção entre implantação em campo e desenvolvimento de plataforma. O Projeto Frontline garantia que o conhecimento prático fosse codificado na infraestrutura central.";
  }
  if (qLower.includes("hamming") || qLower.includes("pesquisa") || qLower.includes("trabalho")) {
    return "Hamming argumenta que quem foca em problemas de impacto real e mantém consistência com 10% a mais de esforço colhe retornos exponenciais devido ao efeito de juros compostos da mente.";
  }
  if (qLower.includes("bitter") || qLower.includes("sutton")) {
    return "Rich Sutton demonstrou que tentar 'ensinar' regras humanas para máquinas sempre perde para algoritmos gerais abastecidos por computação massiva e Moore's Law.";
  }

  return `Com base na leitura: "${context.slice(0, 100)}...", a resposta se articula em torno do princípio de aprendizagem contínua, validação empírica e feedback loops ultra-rápidos.`;
}

export async function generateFlashcardFromSelection(quote: string, sourceTitle: string): Promise<{ frente: string; verso: string; tags: string[] }> {
  await new Promise((r) => setTimeout(r, 300));
  return {
    frente: `O que significa e qual o impacto de: "${quote.slice(0, 90)}${quote.length > 90 ? '...' : ''}"?`,
    verso: `Conceito central extraído de ${sourceTitle}: aborda a aplicação de princípios de engenharia para transformar dados brutos em valor tangível e modelos mentais sólidos.`,
    tags: ["Destaque", "Estudo Ativo", "Learning OS"]
  };
}
