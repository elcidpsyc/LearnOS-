import { useSyncExternalStore } from 'react';

export type TabId = "estudar" | "notas" | "revisar" | "mapa" | "fontes";

export interface Card {
  id: string;
  frente: string;
  verso: string;
  proxima: string; // YYYY-MM-DD
  qualidade: number; // 0-5
  revisoes: number;
  fonte: string;
  tags: string[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  fonte: string;
  paginas: string | number;
  tags: string[];
  createdAt: string;
  highlights?: string[];
}

export interface Paragraph {
  id: number;
  text: string;
  firstLetterDrop?: boolean;
}

export interface MarginNote {
  id: string;
  sourceId: string;
  paragraphId: number;
  quote?: string;
  type: "explain" | "note" | "qa";
  title: string;
  content: string;
}

export interface Source {
  id: string;
  title: string;
  author: string;
  topic: "AI" | "Programming" | "Infrastructure" | "Data" | "Security" | "Product" | "Startups" | "Writing" | "Work & careers";
  readTime: string;
  pages: number;
  spineColor: string; // Hex or CSS gradient for shelf
  spineTextColor: string;
  spineHeight: number; // Height in px for dynamic shelf
  spineWidth: number; // Width in px
  publishedYear: string;
  progress: number;
  briefSummary: string;
  claims: string[];
  paragraphs: Paragraph[];
}

export interface TranslatorPopupState {
  open: boolean;
  text: string;
  translatedText?: string;
  explanation?: string;
  loading: boolean;
  left: number;
  top: number;
  width: number;
  mode: "translate" | "explain" | "ask";
  paragraphId?: number;
}

export interface VaultState {
  hydrated: boolean;
  tab: TabId;
  activeSourceId: string;
  selectedNoteId: string | null;
  shelfFilter: string; // "all" | topic
  shelfSort: "topic" | "recent" | "length";
  cards: Card[];
  notes: Note[];
  sources: Source[];
  marginNotes: MarginNote[];
  popup: TranslatorPopupState;
  
  // Actions
  setTab: (tab: TabId) => void;
  setActiveSourceId: (id: string) => void;
  selectNote: (id: string | null) => void;
  setShelfFilter: (filter: string) => void;
  setShelfSort: (sort: "topic" | "recent" | "length") => void;
  reviewCard: (cardId: string, rating: number) => void;
  addCard: (card: Omit<Card, "id">) => void;
  deleteCard: (id: string) => void;
  addNote: (note: Omit<Note, "id">) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addSource: (source: Omit<Source, "id">) => void;
  addMarginNote: (note: Omit<MarginNote, "id">) => void;
  deleteMarginNote: (id: string) => void;
  openPopup: (data: Partial<TranslatorPopupState>) => void;
  closePopup: () => void;
}

export const FONTE_LABEL: Record<string, string> = {
  fde_guide: "The Rise of the Forward Deployed Engineer",
  hamming: "You and Your Research (R. Hamming)",
  graham: "How to Do Great Work (P. Graham)",
  bitter_lesson: "The Bitter Lesson (R. Sutton)",
  software_2: "Software 2.0 (A. Karpathy)",
  cargo_cult: "Cargo Cult Science (R. Feynman)",
};

const INITIAL_SOURCES: Source[] = [
  {
    id: "fde_guide",
    title: "The Rise of the Forward Deployed Engineer – and How to Do the Job Right",
    author: "Vinoo Ganesh",
    topic: "Work & careers",
    readTime: "16 min read",
    pages: 38,
    spineColor: "linear-gradient(180deg, #6b21a8 0%, #4c1d95 100%)",
    spineTextColor: "#faf5ff",
    spineHeight: 184,
    spineWidth: 32,
    publishedYear: "2026",
    progress: 42,
    briefSummary: "O papel do FDE não é fazer consultoria sob encomenda, mas resolver atritos de última milha com clientes reais para retroalimentar insights no produto de plataforma escalável.",
    claims: [
      "FDEs resolvem desafios reais de produção inseridos dentro do fluxo operacional do cliente.",
      "A rotação entre FDE e Core Eng impede o isolamento dos desenvolvedores e acelera o feedback loop.",
      "O código gerado como FDE deve convergir em APIs reutilizáveis, não customizações descartáveis."
    ],
    paragraphs: [
      {
        id: 1,
        firstLetterDrop: true,
        text: "FDEs have the hottest job in AI Labs, startups and PE firms are all hiring engineers to sit inside their customers' operations and solve their problems. Almost none of them agree on what those engineers are supposed to accomplish, or what the strategy underneath the hiring actually is."
      },
      {
        id: 2,
        text: "I'm Vinoo, CEO of Kepler, the deterministic infrastructure for AI. I've built pieces of the forward deployed function three times, at three different institutions, over the course of over a decade. Here's what I've seen work, what I've seen fail, and where I think this goes."
      },
      {
        id: 3,
        text: "The first was Palantir. I started there on product development, building storage and retrieval systems, and was later deployed as an FDE across commercial, DoD and NatSec, healthcare, and oil and gas. I also led Project Frontline, the rotation that took our software engineers and turned them into forward deployed engineers. Around 250 people went through this program, and a lot of them run forward deployed teams now at companies like OpenAI, Anthropic, xAI and Anduril."
      },
      {
        id: 4,
        text: "The second was Citadel, where I ran business engineering. Our customers were portfolio managers, and the only question that mattered was whether the data and software products we built helped them generate alpha."
      },
      {
        id: 5,
        text: "The third is Kepler, where the forward deployed function sits inside product rather than sales, in a domain where a plausible wrong answer is worse than no answer at all."
      },
      {
        id: 6,
        text: "A few months ago, a16z launched the Forward Deployed Engineer Fellowship and I was nominated as one of the fellows, alongside a handful of people I used to work with. It's a great program and I've enjoyed so many of the conversations. Last week I went to my first fellow dinner in SF."
      },
      {
        id: 7,
        text: "Around the table were FDEs from Snowflake, Anthropic, and a number of startups I'd been reading about, and over the course of the evening it became clear that we were all using the same two words (forward deployed) to describe jobs that had almost nothing in common. In one part of the conversation an FDE was a sales engineer who joined the 'second call'; elsewhere it was a quota-carrying rep who could write Python, and a few seats down it was closer to a consultant with a laptop and a statement of work, brought in to deliver something the product couldn't."
      }
    ]
  },
  {
    id: "hamming",
    title: "You and Your Research",
    author: "Richard Hamming",
    topic: "Work & careers",
    readTime: "24 min read",
    pages: 42,
    spineColor: "linear-gradient(180deg, #1e3a8a 0%, #172554 100%)",
    spineTextColor: "#eff6ff",
    spineHeight: 196,
    spineWidth: 34,
    publishedYear: "1986",
    progress: 78,
    briefSummary: "Palestras icônicas nos Bell Labs sobre coragem intelectual, foco em problemas fundamentais e como o conhecimento acumulado age como juros compostos.",
    claims: [
      "Se o que você está trabalhando não é importante, por que você está trabalhando nisso?",
      "Conhecimento e produtividade funcionam como juros compostos: pequenas vantagens diárias geram saltos monumentais ao longo de décadas.",
      "A coragem para encarar problemas difíceis e a clareza de comunicação definem cientistas de primeiro nível."
    ],
    paragraphs: [
      {
        id: 1,
        firstLetterDrop: true,
        text: "At a seminar in the Bell Communications Research Colloquia Series, Dr. Richard W. Hamming, a Professor at the Naval Postgraduate School, gave a very interesting and stimulating talk, 'You and Your Research' to an audience of about 200 Bellcore staff members and visitors."
      },
      {
        id: 2,
        text: "Knowledge and productivity are like compound interest. Given two people of approximately the same ability and one person who works ten percent more than the other, the latter will more than twice outproduce the former. The more you know, the more you learn; the more you learn, the more you can do; the more you can do, the more the opportunity."
      },
      {
        id: 3,
        text: "Most people like to believe it will just happen by luck. But luck favors the prepared mind, as Pasteur observed. You have to plant the thoughts and work on them day after day."
      }
    ]
  },
  {
    id: "bitter_lesson",
    title: "The Bitter Lesson",
    author: "Rich Sutton",
    topic: "AI",
    readTime: "10 min read",
    pages: 14,
    spineColor: "linear-gradient(180deg, #701a75 0%, #4a044e 100%)",
    spineTextColor: "#fdf4ff",
    spineHeight: 165,
    spineWidth: 26,
    publishedYear: "2019",
    progress: 100,
    briefSummary: "A lição amarga da história da IA: métodos gerais baseados em busca e aprendizado turbinados por poder computacional sempre superam métodos construídos com conhecimento humano manual.",
    claims: [
      "A intuição humana tenta colocar conhecimento prévio na máquina, mas isso trava a escalabilidade.",
      "A computação massiva aliada a princípios simples (aprendizado profundo e busca) vence invariavelmente no longo prazo."
    ],
    paragraphs: [
      {
        id: 1,
        firstLetterDrop: true,
        text: "The biggest lesson that can be read from 70 years of AI research is that general methods that leverage computation are ultimately the most effective, and by a large margin. The ultimate reason for this is Moore's law, or rather its continued generalization of continued exponentially falling cost per unit of computation."
      },
      {
        id: 2,
        text: "Most AI research has been conducted as if the computation available to the agent were constant (in which case leveraging human knowledge would be one of the only ways to improve performance) but, over a slightly longer time than a typical research project, massively more computation inevitably becomes available."
      }
    ]
  },
  {
    id: "software_2",
    title: "Software 2.0",
    author: "Andrej Karpathy",
    topic: "Programming",
    readTime: "12 min read",
    pages: 20,
    spineColor: "linear-gradient(180deg, #065f46 0%, #064e3b 100%)",
    spineTextColor: "#ecfdf5",
    spineHeight: 172,
    spineWidth: 28,
    publishedYear: "2017",
    progress: 55,
    briefSummary: "A transição do Software 1.0 (código explícito em C++/Python escrito por humanos) para o Software 2.0 (pesos e tensores treinados por otimização a partir de dados).",
    claims: [
      "No Software 2.0, nós acumulamos dados e o gradiente descendente escreve o código no espaço de parâmetros de redes neurais.",
      "Sistemas 2.0 são computacionalmente homogêneos, paralelizáveis e constantes em uso de memória."
    ],
    paragraphs: [
      {
        id: 1,
        firstLetterDrop: true,
        text: "Sometimes we see people refer to neural networks as just 'another tool in your machine learning toolbox'. They have some pros and cons, they work here and there, and sometimes you can use them to win Kaggle competitions. Unfortunately, this interpretation completely misses the forest for the trees. Neural networks are not just another classifier, they represent the beginning of a fundamental shift in how we write software. They are Software 2.0."
      },
      {
        id: 2,
        text: "The 'classical stack' of Software 1.0 is written in languages like Python, C++, etc. It consists of explicit instructions to the computer written by a programmer. By contrast, Software 2.0 is written in much more abstract, human-unfriendly language, such as the weights of a neural network."
      }
    ]
  },
  {
    id: "graham",
    title: "How to Do Great Work",
    author: "Paul Graham",
    topic: "Writing",
    readTime: "40 min read",
    pages: 64,
    spineColor: "linear-gradient(180deg, #7c2d12 0%, #431407 100%)",
    spineTextColor: "#fff7ed",
    spineHeight: 200,
    spineWidth: 40,
    publishedYear: "2023",
    progress: 30,
    briefSummary: "O guia abrangente de Paul Graham sobre curiosidade obsessiva, escolha de terrenos férteis, paciência para construir projetos originais e o hábito de terminar o que começou.",
    claims: [
      "O primeiro passo é decidir em que trabalhar. O trabalho deve ter três qualidades: você deve ter aptidão natural, um interesse profundo e campo para fazer grandes coisas.",
      "Grandes obras vêm de seguir o fio de uma curiosidade obsessiva onde outros veem detalhes triviais."
    ],
    paragraphs: [
      {
        id: 1,
        firstLetterDrop: true,
        text: "If you wanted to collect recipes for doing great work in a lot of different fields, what would they have in common? I decided to find out. My goal was to create a guide that would apply to any field: science, math, art, history, business, or anything else."
      },
      {
        id: 2,
        text: "The first step is to decide what to work on. The work you choose should have three qualities: it has to be something you have a natural aptitude for, that you have a deep interest in, and that offers scope to do great work."
      }
    ]
  }
];

const INITIAL_CARDS: Card[] = [
  {
    id: "card-1",
    frente: "Qual é o objetivo central de um FDE (Forward Deployed Engineer) segundo Vinoo Ganesh?",
    verso: "Resolver gargalos e operações reais dentro dos clientes de forma a retroalimentar o produto principal com abstrações e APIs escaláveis, em vez de atuar como consultoria customizada pontual.",
    proxima: "2026-10-12",
    qualidade: 1,
    revisoes: 2,
    fonte: "fde_guide",
    tags: ["Engenharia", "Produto", "FDE"]
  },
  {
    id: "card-2",
    frente: "Como Richard Hamming compara conhecimento e produtividade aos juros compostos?",
    verso: "Pequenos incrementos contínuos de dedicação diária (ex: 10% a mais) acumulam-se exponencialmente: quanto mais você sabe, mais rápido assimila novos conceitos e mais conexões mentais consegue criar.",
    proxima: "2026-10-12",
    qualidade: 2,
    revisoes: 1,
    fonte: "hamming",
    tags: ["Produtividade", "Modelos Mentais"]
  },
  {
    id: "card-3",
    frente: "O que diz a tese central de 'The Bitter Lesson' de Rich Sutton?",
    verso: "Métodos que alavancam poder computacional em larga escala (busca e aprendizado estatístico) inevitavelmente superam soluções baseadas na introdução manual de conhecimento humano e regras heurísticas pré-fabricadas.",
    proxima: "2026-10-12",
    qualidade: 2,
    revisoes: 3,
    fonte: "bitter_lesson",
    tags: ["AI", "Sutton", "Computação"]
  },
  {
    id: "card-4",
    frente: "Qual a diferença estrutural entre Software 1.0 e Software 2.0 definida por Karpathy?",
    verso: "O Software 1.0 é composto por instruções procedurais explícitas (Python, C++). O Software 2.0 é escrito no espaço de pesos de redes neurais otimizados via gradiente descendente sobre grandes volumes de dados.",
    proxima: "2026-10-15",
    qualidade: 4,
    revisoes: 5,
    fonte: "software_2",
    tags: ["Software 2.0", "Machine Learning"]
  }
];

const INITIAL_NOTES: Note[] = [
  {
    id: "note-1",
    title: "O Loop Virtuoso entre FDE e Core Engineering",
    content: "A grande armadilha das startups que vendem para grandes empresas é transformar seus melhores engenheiros em consultores de suporte. O programa Frontline da Palantir evitava isso forçando uma rotação: os engenheiros iam para o cliente por 6 meses para sentir a dor real, voltavam para a infraestrutura central e codificavam as soluções nas plataformas centrais.",
    fonte: "fde_guide",
    paginas: "p. 3-4",
    tags: ["Engenharia", "Cultura", "Palantir"],
    createdAt: "2026-10-11",
    highlights: ["sit inside their customers' operations", "rotation that took our software engineers"]
  },
  {
    id: "note-2",
    title: "Juros Compostos da Mente (Hamming)",
    content: "Hamming notou que cientistas que trabalhavam 10% a mais produziam mais do que o dobro. A chave é a reutilização de abstrações: quem domina os primeiros princípios resolve problemas novos em minutos, enquanto outros precisam reaprender do zero.",
    fonte: "hamming",
    paginas: "p. 2",
    tags: ["Modelos Mentais", "Carreira"],
    createdAt: "2026-10-10",
    highlights: ["Knowledge and productivity are like compound interest"]
  },
  {
    id: "note-3",
    title: "Software 2.0 e Homogeneidade de Execução",
    content: "Diferente de pilhas de software legadas com milhares de bifurcações if/else e dependências frágeis, redes neurais rodam matrizes regulares em silício especializado (GPUs/TPUs). O código fica mais estável e uniforme em tempo de execução.",
    fonte: "software_2",
    paginas: "p. 1-2",
    tags: ["Arquitetura", "AI"],
    createdAt: "2026-10-09",
    highlights: ["Neural networks are not just another classifier"]
  }
];

const INITIAL_MARGIN_NOTES: MarginNote[] = [
  {
    id: "mn-1",
    sourceId: "fde_guide",
    paragraphId: 3,
    quote: "NatSec",
    type: "explain",
    title: "Explicação: 'NatSec'",
    content: "Abreviação para 'National Security' (Segurança Nacional), referindo-se a contratos de defesa e inteligência governamentais nos EUA onde a confiabilidade do software é crítica."
  },
  {
    id: "mn-2",
    sourceId: "fde_guide",
    paragraphId: 5,
    quote: "Kepler",
    type: "qa",
    title: "O que é Kepler?",
    content: "Kepler é a infraestrutura determinística para IA fundada por Vinoo Ganesh. Seu foco é garantir rastreabilidade exata e ausência de alucinações em setores regulados (hedge funds, finanças, saúde)."
  }
];

// Persistent state store
let state: VaultState = {
  hydrated: false,
  tab: "estudar",
  activeSourceId: "fde_guide",
  selectedNoteId: null,
  shelfFilter: "all",
  shelfSort: "topic",
  cards: INITIAL_CARDS,
  notes: INITIAL_NOTES,
  sources: INITIAL_SOURCES,
  marginNotes: INITIAL_MARGIN_NOTES,
  popup: {
    open: false,
    text: "",
    loading: false,
    left: 0,
    top: 0,
    width: 320,
    mode: "translate"
  },
  setTab: (tab) => updateState({ tab }),
  setActiveSourceId: (id) => updateState({ activeSourceId: id }),
  selectNote: (id) => updateState({ selectedNoteId: id }),
  setShelfFilter: (shelfFilter) => updateState({ shelfFilter }),
  setShelfSort: (shelfSort) => updateState({ shelfSort }),
  reviewCard: (cardId, rating) => {
    const today = new Date();
    // Spaced repetition schedule based on rating (0-5)
    const daysToAdd = rating >= 4 ? 7 : rating === 3 ? 3 : 1;
    const nextDate = new Date(today.getTime() + daysToAdd * 86400000).toISOString().slice(0, 10);
    
    updateState({
      cards: state.cards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              qualidade: rating,
              revisoes: c.revisoes + 1,
              proxima: nextDate
            }
          : c
      )
    });
  },
  addCard: (cardData) => {
    const newCard: Card = {
      ...cardData,
      id: `card-${Date.now()}`
    };
    updateState({ cards: [newCard, ...state.cards] });
  },
  deleteCard: (id) => {
    updateState({ cards: state.cards.filter((c) => c.id !== id) });
  },
  addNote: (noteData) => {
    const newNote: Note = {
      ...noteData,
      id: `note-${Date.now()}`
    };
    updateState({ notes: [newNote, ...state.notes], selectedNoteId: newNote.id });
  },
  updateNote: (id, updates) => {
    updateState({
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n))
    });
  },
  deleteNote: (id) => {
    updateState({
      notes: state.notes.filter((n) => n.id !== id),
      selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId
    });
  },
  addSource: (sourceData) => {
    const newSource: Source = {
      ...sourceData,
      id: `src-${Date.now()}`
    };
    updateState({ sources: [newSource, ...state.sources], activeSourceId: newSource.id });
  },
  addMarginNote: (noteData) => {
    const newNote: MarginNote = {
      ...noteData,
      id: `mn-${Date.now()}`
    };
    updateState({ marginNotes: [...state.marginNotes, newNote] });
  },
  deleteMarginNote: (id) => {
    updateState({ marginNotes: state.marginNotes.filter((m) => m.id !== id) });
  },
  openPopup: (data) => {
    updateState({
      popup: {
        ...state.popup,
        ...data,
        open: true
      }
    });
  },
  closePopup: () => {
    updateState({
      popup: {
        ...state.popup,
        open: false
      }
    });
  }
};

const listeners = new Set<() => void>();

function updateState(partial: Partial<VaultState>) {
  state = { ...state, ...partial };
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem("learning_os_vault", JSON.stringify({
        cards: state.cards,
        notes: state.notes,
        sources: state.sources,
        marginNotes: state.marginNotes,
        activeSourceId: state.activeSourceId
      }));
    }
  } catch {
    // Ignore storage errors
  }
  listeners.forEach((listener) => listener());
}

export function hydrateVault() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("learning_os_vault");
    if (raw) {
      const parsed = JSON.parse(raw);
      state = {
        ...state,
        cards: parsed.cards || state.cards,
        notes: parsed.notes || state.notes,
        sources: parsed.sources || state.sources,
        marginNotes: parsed.marginNotes || state.marginNotes,
        activeSourceId: parsed.activeSourceId || state.activeSourceId,
        hydrated: true
      };
      listeners.forEach((l) => l());
    } else {
      state = { ...state, hydrated: true };
      listeners.forEach((l) => l());
    }
  } catch {
    state = { ...state, hydrated: true };
    listeners.forEach((l) => l());
  }
}

export function useVault<T>(selector: (state: VaultState) => T): T {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    () => selector(state),
    () => selector(state)
  );
}

useVault.setState = (partial: Partial<VaultState>) => {
  updateState(partial);
};
