import type { SiteContent, Section, SectionKey } from "./schema";

const s = (p: Partial<Section>): Section => ({ visible: true, label: "", title: "", title2: "", text: "", cta: "", image: "", items: [], ...p });

/**
 * Conteúdo inicial = textos do protótipo aprovado.
 * É usado quando o Supabase ainda não está configurado e para gerar supabase/seed.sql.
 */
export const seedSections: Record<SectionKey, Section> = {
  hero: s({ label: "Projetos e produtos de iluminação", title: "Sua casa,", title2: "sua luz.", text: "Projeto e curadoria de iluminação, do seu jeito.", cta: "Saiba mais", image: "/img/hero.jpg" }),
  quem: s({
    label: "Quem somos",
    title: "Na Brasília Iluminação, a luz é sentida [foto:/img/pendentes.jpg|Projeto luminotécnico] antes de ser vista.",
    text: "Em uma só marca vivem duas paixões: um escritório de *projetos luminotécnicos* e uma *curadoria* dos melhores produtos [foto:/img/prod-3.jpg|Curadoria de produtos] de iluminação.",
    items: [
      { title: "17|anos", text: "Especialistas em luz — Uma arquiteta e designer de interiores, pós-graduada em cálculo luminotécnico, desenhando luz desde a faculdade." },
      { title: "1|só lugar", text: "Projeto e produto juntos — Do briefing à última lâmpada acesa, sem ruído entre quem projeta e quem fornece." },
      { title: "27|UFs", text: "Curadoria que viaja — Os melhores produtos do mercado, escolhidos a dedo e entregues para todo o Brasil." },
    ],
  }),
  formas: s({
    label: "Formas de trabalhar",
    title: "Você escolhe como quer a nossa presença.",
    text: "Do projeto completo à compra com consultoria: quatro jeitos de ter a luz certa em casa.",
    items: [
      { title: "Projeto completo", text: "Projeto luminotécnico, curadoria e venda dos produtos, com acompanhamento na obra." },
      { title: "Somente o projeto", text: "O projeto e a especificação. Você compra onde preferir." },
      { title: "Já tem projeto? Fornecemos os produtos", text: "Traga o projeto do seu arquiteto, e nós cuidamos da curadoria." },
      { title: "Compre online com nossos consultores", text: "Já sabe o que procura? Compre online, com a nossa curadoria." },
    ],
  }),
  camila: s({
    label: "A assinatura",
    title: "Camila de Lelis",
    text: "Há quase 17 anos, Camila desenha a luz de casas, salas e jardins. Arquiteta e designer de interiores, com pós-graduação em *cálculo luminotécnico*, ela transforma cada ambiente em *experiência*.\n\nTodo projeto nasce da rotina e do gosto de quem vai viver nele. É assim que a luz deixa de ser um detalhe e passa a ser uma assinatura.",
    image: "/img/camila.jpg",
    items: [{ title: "Arquiteta", text: "" }, { title: "Designer de interiores", text: "" }, { title: "Pós em cálculo luminotécnico", text: "" }],
  }),
  lumi: s({
    label: "O projeto luminotécnico",
    title: "O início de uma casa bem iluminada.",
    text: "Marcar pontos de luz na planta é só o começo: o projeto pensa a luz em cenas e entrega o executivo completo, para a obra sair certa e o orçamento não fugir.",
    cta: "Faça seu orçamento",
    items: [
      { title: "Briefing e leitura da rotina", text: "Entender o gosto e o dia a dia de quem vai viver ali, antes da luz." },
      { title: "Cenas de luz", text: "O comando de cada cena, pensando no seu dia, principalmente à noite." },
      { title: "Projeto executivo", text: "Três plantas que orientam toda a execução do luminotécnico na obra." },
      { title: "As peças certas", text: "A especificação e a lista pronta para a compra, com pós-venda até a última lâmpada." },
    ],
  }),
  loja: s({
    label: "A curadoria",
    title: "As peças certas, escolhidas por quem projeta.",
    text: "Luminárias, pendentes e peças decorativas selecionadas com o mesmo olhar dos nossos projetos. Compre na loja online ou com a ajuda de uma consultora.",
    cta: "Visite a loja",
  }),
  oferta: s({
    label: "Também oferecemos",
    title: "Mais caminhos para a luz certa.",
    items: [
      { title: "Orientação para compra", text: "Para quem quer só uma ajuda para escolher as peças certas, sem projeto completo." },
      { title: "Luz para paisagismo", text: "O jardim bonito de dia e à noite, com a iluminação certa." },
      { title: "Projetos comerciais", text: "Iluminação que valoriza lojas, escritórios e espaços de atendimento." },
    ],
  }),
  depoimentos: s({ label: "Depoimentos" }),
  faq: s({ label: "Dúvidas", title: "Perguntas frequentes" }),
  contato: s({ label: "Entre em contato", title: "Vamos dar luz ao seu", title2: "projeto?", text: "Preencha e receba um retorno rápido. Diga se quer o projeto, só os produtos, ou os dois.", cta: "Enviar" }),
};

export const seedContent: SiteContent = {
  sections: seedSections,
  settings: {
    hero: "cobogo",
    whatsapp: "(61) 98358-3129",
    email: "contato@brasiliailuminacao.com.br",
    instagram: "@brasilia_iluminacao",
    shopUrl: "https://shop.brasiliailuminacao.com.br/",
    seoTitle: "Brasília Iluminação — Projetos e produtos de iluminação",
    seoDescription: "Projeto luminotécnico e curadoria de iluminação em Brasília, com entrega para todo o Brasil.",
  },
  projects: [
    {
      id: "bento", slug: "galeria-bento-viana", title: "Galeria Bento Viana", category: "Comercial", location: "Brasília, DF", year: "2021", status: "publicado", cover: "/img/bento.jpg",
      summary: "Cada obra ganha sua própria luz. Um foco museológico, com trilhos e spots precisos, que valoriza a arte sem ofuscar quem a contempla.",
      scope: ["Projeto luminotécnico", "Iluminação de destaque", "Trilhos e focos"],
      gallery: ["bento-2", "bento-3", "bento-5", "bento-4", "bento-noite"].map((f, i) => ({ url: `/img/${f}.jpg`, alt: "Galeria Bento Viana", layout: i === 0 ? "cheia" : i < 3 ? "par" : "faixa" })),
    },
    {
      id: "vip", slug: "sala-vip-brb", title: "Sala VIP BRB", category: "Comercial", location: "Aeroporto JK, Brasília", year: "2022", status: "publicado", cover: "/img/vip.jpg",
      summary: "Ripado iluminado em perspectiva: linhas de luz que guiam o olhar e dão calor a um espaço de espera.",
      scope: ["Projeto luminotécnico", "Iluminação linear", "Cenografia de luz"],
      gallery: ["vip-lounge", "vip-2", "vip-3", "vip-4", "vip-5"].map((f, i) => ({ url: `/img/${f}.jpg`, alt: "Sala VIP BRB", layout: i === 0 ? "cheia" : i < 3 ? "par" : "faixa" })),
    },
    {
      id: "apt", slug: "apartamento-jr", title: "Apartamento J|R", category: "Residencial", location: "Brasília, DF", year: "2023", status: "publicado", cover: "/img/apt-sala.jpg",
      summary: "Luz indireta e pontos de leitura precisos compõem uma casa que respira aconchego do entardecer à noite.",
      scope: ["Projeto luminotécnico", "Especificação de luminárias", "Acompanhamento de obra"],
      gallery: ["hero", "apt-2", "apt-cozinha", "apt-3", "apt-4", "apt-5"].map((f, i) => ({ url: `/img/${f}.jpg`, alt: "Apartamento J|R", layout: i === 0 ? "cheia" : i < 3 ? "par" : "faixa" })),
    },
  ],
  testimonials: [
    { id: "t1", quote: "Além de técnica, muito humana. Me senti ouvida, cuidada e compreendida.", author: "Tatiana Murta", location: "Lago Norte / DF", visible: true },
    { id: "t2", quote: "Me senti acolhido em todo o processo e indicaria com certeza.", author: "Vitor", location: "Jardim Botânico / DF", visible: true },
    { id: "t3", quote: "Materiais bem especificados e soluções para melhorar o custo-benefício. Pós-venda dentro do esperado.", author: "Hugo Affonso", location: "Sudoeste / DF", visible: true },
  ],
  faqs: [
    { id: "f1", question: "Preciso contratar o projeto para comprar os produtos?", answer: "Não. Você pode comprar apenas os produtos, com o seu projeto ou com um projeto desenvolvido por nós. A curadoria é a mesma.", visible: true },
    { id: "f2", question: "Posso trazer o meu próprio projeto?", answer: "Sim. Se você ou o seu arquiteto já têm o projeto, cuidamos da curadoria e da compra das peças certas.", visible: true },
    { id: "f3", question: "Vale a pena o projeto luminotécnico?", answer: "Muito. É o que garante a luz certa desde o começo, evita desperdício e traz emoção a cada ambiente.", visible: true },
    { id: "f4", question: "Vocês atendem fora de Brasília?", answer: "Sim. Somos de Brasília e entregamos para todo o Brasil, com atendimento online.", visible: true },
  ],
};
