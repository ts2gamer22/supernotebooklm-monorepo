import React from 'react';
import { Share, Copy, Download, ChevronDown } from 'lucide-react';

interface NotebookCardData {
  title: string;
  href: string;
  content: string;
  tags: string[];
  additionalTags?: number;
}

interface CategorySectionData {
  title: string;
  cards: NotebookCardData[];
}

const toSlug = (s: string) => s.toLowerCase().replace(/[\s_&/]+/g, '-').replace(/[^\w-]+/g, '');

const allCategoryData: CategorySectionData[] = [
    {
      title: 'Technology',
      cards: [
        { title: 'Web3 & Blockchain Fundamentals', content: '# Blockchain Technology\n\nA comprehensive exploration of blockchain technology, cryptocurrencies, smart contracts, and decentralized applications. Covers Ethereum, Solana, and emerging Web3 protocols...', tags: ['Blockchain', 'Smart Contracts'], additionalTags: 2 },
        { title: 'Cloud Computing Architecture', content: '# Cloud Computing\n\nUnderstanding cloud infrastructure, microservices architecture, containerization with Docker and Kubernetes, and serverless computing patterns...', tags: ['AWS', 'DevOps', 'Kubernetes'], additionalTags: 3 },
        { title: 'Cybersecurity Essentials', content: '# Cybersecurity Overview\n\nExploring security principles, encryption methods, threat detection, penetration testing, and best practices for securing applications and infrastructure...', tags: ['Security', 'Encryption'], additionalTags: 1 },
        { title: 'IoT and Edge Computing', content: '# Internet of Things\n\nIntroduction to IoT ecosystems, sensor networks, edge computing, MQTT protocols, and building connected device applications...', tags: ['IoT', 'Edge Computing'], additionalTags: 2 },
      ],
    },
    {
      title: 'Business',
      cards: [
        { title: 'Startup Strategy & Growth', content: '# Building Startups\n\nComprehensive guide to startup methodology, product-market fit, growth hacking, fundraising strategies, and scaling operations...', tags: ['Entrepreneurship', 'Growth'], additionalTags: 2 },
        { title: 'Digital Marketing Mastery', content: '# Marketing in the Digital Age\n\nExploring SEO, content marketing, social media strategies, email campaigns, and data-driven marketing analytics...', tags: ['Marketing', 'SEO', 'Analytics'], additionalTags: 1 },
        { title: 'Financial Analysis & Modeling', content: '# Finance Fundamentals\n\nUnderstanding financial statements, valuation methods, investment strategies, and building financial models for business decision-making...', tags: ['Finance', 'Valuation'], additionalTags: 2 },
        { title: 'Product Management Best Practices', content: '# Product Management\n\nLearn product discovery, roadmap planning, user research, agile methodologies, and effective stakeholder communication...', tags: ['Product', 'Agile', 'UX'], additionalTags: 1 },
      ],
    },
    {
      title: 'Health & Medicine',
      cards: [
        { title: 'Modern Pharmacology', content: '# Pharmaceutical Science\n\nExploring drug discovery, pharmacokinetics, clinical trials, personalized medicine, and the future of pharmaceutical innovation...', tags: ['Pharmacology', 'Medicine'], additionalTags: 1 },
        { title: 'Neuroscience & Brain Health', content: '# Understanding the Brain\n\nComprehensive overview of neuroscience, neural pathways, cognitive function, neuroplasticity, and brain-based learning...', tags: ['Neuroscience', 'Cognition'], additionalTags: 2 },
        { title: 'Public Health & Epidemiology', content: '# Public Health Systems\n\nStudying disease patterns, health policy, preventive medicine, global health challenges, and population health management...', tags: ['Public Health', 'Epidemiology'], additionalTags: 1 },
        { title: 'Mental Health & Psychology', content: '# Psychology Fundamentals\n\nExploring human behavior, cognitive psychology, mental health disorders, therapy approaches, and evidence-based treatments...', tags: ['Psychology', 'Mental Health'], additionalTags: 2 },
      ],
    },
    {
      title: 'History',
      cards: [
        { title: 'Ancient Civilizations', content: '# History of Ancient Worlds\n\nExploring ancient Egypt, Greece, Rome, and Mesopotamia. Understanding early human societies, governance, and cultural achievements...', tags: ['Ancient History', 'Archaeology'], additionalTags: 1 },
        { title: 'World War II Analysis', content: '# WWII Historical Overview\n\nComprehensive study of World War II causes, major battles, political dynamics, and lasting global impacts...', tags: ['WWII', 'Military History'], additionalTags: 2 },
        { title: 'Industrial Revolution', content: '# Age of Industry\n\nExamining technological advancement, social transformation, economic changes, and the birth of modern industrial society...', tags: ['Industrial Era', 'Economics'], additionalTags: 1 },
        { title: 'Cold War Era', content: '# Cold War Geopolitics\n\nAnalyzing the ideological conflict between capitalism and communism, nuclear tensions, proxy wars, and the eventual dissolution of the Soviet Union...', tags: ['Cold War', 'Geopolitics'], additionalTags: 2 },
      ],
    },
    {
      title: 'Philosophy',
      cards: [
        { title: 'Ancient Greek Philosophy', content: '# Classical Philosophy\n\nExploring the works of Socrates, Plato, and Aristotle. Understanding foundational concepts in ethics, metaphysics, and epistemology...', tags: ['Ancient Philosophy', 'Ethics'], additionalTags: 1 },
        { title: 'Modern Ethics & Moral Philosophy', content: '# Contemporary Ethics\n\nExamining utilitarian, deontological, and virtue ethics. Applied ethics in technology, medicine, and society...', tags: ['Ethics', 'Moral Philosophy'], additionalTags: 2 },
        { title: 'Existentialism & Phenomenology', content: '# Existential Thought\n\nStudying Kierkegaard, Nietzsche, Sartre, and Camus. Understanding existence, freedom, and the search for meaning...', tags: ['Existentialism', 'Philosophy'], additionalTags: 1 },
        { title: 'Philosophy of Mind', content: '# Consciousness & Mind\n\nExploring consciousness, free will, mental states, and the mind-body problem through philosophical inquiry...', tags: ['Philosophy of Mind', 'Consciousness'], additionalTags: 2 },
      ],
    },
    {
      title: 'Mathematics',
      cards: [
        { title: 'Calculus Fundamentals', content: '# Calculus Overview\n\nUnderstanding limits, derivatives, integrals, and their applications in physics, engineering, and economics...', tags: ['Calculus', 'Analysis'], additionalTags: 1 },
        { title: 'Linear Algebra Applications', content: '# Linear Algebra\n\nExploring vector spaces, matrices, eigenvalues, and applications in machine learning, graphics, and quantum mechanics...', tags: ['Linear Algebra', 'Matrices'], additionalTags: 2 },
        { title: 'Number Theory & Cryptography', content: '# Pure Mathematics\n\nStudying prime numbers, modular arithmetic, and their applications in modern cryptographic systems...', tags: ['Number Theory', 'Cryptography'], additionalTags: 1 },
        { title: 'Probability & Statistics', content: '# Statistical Methods\n\nUnderstanding probability distributions, hypothesis testing, regression analysis, and Bayesian inference...', tags: ['Statistics', 'Probability'], additionalTags: 2 },
      ],
    },
    {
      title: 'Literature',
      cards: [
        { title: 'Shakespeare Analysis', content: '# The Bard\'s Works\n\nComprehensive analysis of Shakespeare\'s plays and sonnets, exploring themes, language, and cultural impact...', tags: ['Shakespeare', 'Drama'], additionalTags: 1 },
        { title: 'Modern American Literature', content: '# 20th Century American Writers\n\nExploring works by Hemingway, Fitzgerald, Morrison, and others. Themes of identity, society, and the American experience...', tags: ['American Lit', 'Modern'], additionalTags: 2 },
        { title: 'Poetry Through the Ages', content: '# Poetic Forms & Analysis\n\nStudying poetry from ancient epics to contemporary verse. Understanding meter, form, symbolism, and interpretation...', tags: ['Poetry', 'Literary Analysis'], additionalTags: 1 },
        { title: 'World Literature Masterpieces', content: '# Global Literary Canon\n\nExploring influential works from diverse cultures and time periods. Understanding universal themes and cultural contexts...', tags: ['World Literature', 'Classics'], additionalTags: 2 },
      ],
    },
].map(category => ({
  ...category,
  cards: category.cards.map(card => ({
    ...card,
    href: `/notebook/${toSlug(card.title)}`
  }))
}));

const ViewAllArrow = () => (
    <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 11.5L3.295 10.795L7.585 6.5L3.295 2.205L4 1.5L9 6.5L4 11.5Z" fill="#878787"/>
    </svg>
);

const NotebookCard: React.FC<NotebookCardData> = ({ title, href, content, tags, additionalTags }) => (
    <div className="border border-border bg-background flex flex-col p-2 h-[240px]">
      <div className="flex-grow bg-card h-full mb-2 font-mono text-sm opacity-50 hover:opacity-100 transition-opacity group relative p-2 overflow-hidden">
        <div className="group-hover:flex hidden absolute z-10 space-x-2 right-2 bottom-2">
          <button className="bg-white text-black rounded-full flex items-center justify-center p-1.5 size-7 hover:bg-gray-200" aria-label="Share">
            <Share className="w-3 h-3" />
          </button>
          <button className="bg-white text-black rounded-full flex items-center justify-center p-1.5 size-7 hover:bg-gray-200" aria-label="Copy">
            <Copy className="w-3 h-3" />
          </button>
          <button className="bg-white text-black rounded-full flex items-center justify-center p-1.5 size-7 hover:bg-gray-200" aria-label="Download">
            <Download className="size-3" />
          </button>
        </div>
        <a href={href}>
          <div className="h-full overflow-y-auto hide-scrollbar">
            <code className="block whitespace-pre-wrap pr-3 text-xs text-muted-foreground">{content}</code>
          </div>
        </a>
      </div>
      <div className="flex flex-col p-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold tracking-tight truncate text-xs text-foreground">{title}</h3>
        </div>
        <div className="flex gap-2 items-center overflow-x-auto whitespace-nowrap cursor-pointer h-4 hide-scrollbar">
          {tags.map((tag, index) => (
            <span key={index} className="text-muted-foreground font-mono flex-shrink-0 text-[10px]">{tag}</span>
          ))}
          {additionalTags && (
            <span className="text-muted-foreground font-mono flex gap-1 items-center text-[10px]">
              <span>+{additionalTags} more</span>
              <ChevronDown className="w-2 h-2" />
            </span>
          )}
        </div>
      </div>
    </div>
);

const CategorySection: React.FC<{data: CategorySectionData}> = ({ data }) => (
  <section id={toSlug(data.title)} className="mt-10">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-normal text-foreground">{data.title}</h3>
      <a className="text-sm text-muted-foreground flex items-center gap-1" href={`/category/${toSlug(data.title)}`}>
        <span>View all</span>
        <ViewAllArrow />
      </a>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {data.cards.map((card, index) => <NotebookCard key={index} {...card} />)}
    </div>
  </section>
);

export default function AdditionalCategories() {
  return (
    <div className="mt-10">
      {allCategoryData.map(category => <CategorySection key={category.title} data={category} />)}
    </div>
  );
}