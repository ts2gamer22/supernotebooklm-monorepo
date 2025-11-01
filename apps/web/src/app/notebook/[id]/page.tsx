import NavigationHeader from "@/components/sections/navigation-header";
import Image from "next/image";
import Link from "next/link";
import { Share, Copy, Download, Book, Calendar, User, Tag, ChevronRight, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock data - in real app, fetch based on params.id
const notebookData = {
  id: "1",
  title: "Introduction to Machine Learning",
  description: "A comprehensive guide covering the fundamentals of machine learning, including supervised learning, unsupervised learning, and reinforcement learning approaches.",
  author: {
    name: "Dr. Sarah Chen",
    avatar: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7d93639a-be78-4c30-9e82-9af5a1246090-cursor-directory/assets/images/images_21.png",
    bio: "AI Research Scientist at Stanford AI Lab",
    href: "/author/sarah-chen",
  },
  createdAt: "2024-01-15",
  updatedAt: "2024-02-20",
  views: 1247,
  likes: 89,
  tags: ["Machine Learning", "Neural Networks", "AI", "Deep Learning"],
  content: `# Machine Learning Fundamentals

This notebook covers the essential concepts of machine learning including supervised learning, unsupervised learning, and reinforcement learning. We explore various algorithms and their applications in real-world scenarios.

## What is Machine Learning?

Machine learning is a subset of artificial intelligence (AI) that provides systems the ability to automatically learn and improve from experience without being explicitly programmed. It focuses on the development of computer programs that can access data and use it to learn for themselves.

## Types of Machine Learning

### 1. Supervised Learning
Supervised learning is where you have input variables (x) and an output variable (Y) and you use an algorithm to learn the mapping function from the input to the output.

**Common Algorithms:**
- Linear Regression
- Logistic Regression
- Decision Trees
- Random Forests
- Support Vector Machines (SVM)
- Neural Networks

### 2. Unsupervised Learning
Unsupervised learning is where you only have input data (X) and no corresponding output variables. The goal is to model the underlying structure or distribution in the data.

**Common Algorithms:**
- K-Means Clustering
- Hierarchical Clustering
- Principal Component Analysis (PCA)
- Autoencoders

### 3. Reinforcement Learning
Reinforcement learning is an area of machine learning concerned with how software agents ought to take actions in an environment to maximize some notion of cumulative reward.

**Key Concepts:**
- Agent
- Environment
- State
- Action
- Reward
- Policy

## Neural Networks

Neural networks are computing systems inspired by biological neural networks that constitute animal brains. An artificial neural network is composed of artificial neurons or nodes.

### Architecture Components:
1. **Input Layer**: Receives the initial data
2. **Hidden Layers**: Process the information
3. **Output Layer**: Produces the final result

### Activation Functions:
- ReLU (Rectified Linear Unit)
- Sigmoid
- Tanh
- Softmax

## Deep Learning

Deep learning is part of a broader family of machine learning methods based on artificial neural networks with representation learning. Learning can be supervised, semi-supervised or unsupervised.

**Popular Architectures:**
- Convolutional Neural Networks (CNN)
- Recurrent Neural Networks (RNN)
- Long Short-Term Memory (LSTM)
- Transformer Models
- Generative Adversarial Networks (GAN)

## Practical Applications

Machine learning has numerous real-world applications across various industries:

1. **Healthcare**: Disease diagnosis, drug discovery, personalized medicine
2. **Finance**: Fraud detection, algorithmic trading, risk assessment
3. **Retail**: Recommendation systems, demand forecasting, customer segmentation
4. **Transportation**: Autonomous vehicles, route optimization, traffic prediction
5. **Natural Language Processing**: Chatbots, translation, sentiment analysis
6. **Computer Vision**: Face recognition, object detection, image classification

## Best Practices

When building machine learning models, consider these best practices:

- Start with simple models before moving to complex ones
- Split your data into training, validation, and test sets
- Use cross-validation to assess model performance
- Watch out for overfitting and underfitting
- Feature engineering is crucial for model performance
- Regularly evaluate and update your models
- Document your experiments and results

## Conclusion

Machine learning is a rapidly evolving field with endless possibilities. As you continue your journey, focus on understanding the fundamentals, practicing with real datasets, and staying updated with the latest research and techniques.`,
  relatedNotebooks: [
    {
      id: "2",
      title: "Large Language Models Explained",
      author: "Prof. Michael Torres",
      tags: ["LLM", "NLP"],
      href: "/notebook/2",
    },
    {
      id: "3",
      title: "Computer Vision Basics",
      author: "Dr. Emily Watson",
      tags: ["Computer Vision", "CNN"],
      href: "/notebook/3",
    },
    {
      id: "4",
      title: "Reinforcement Learning Deep Dive",
      author: "Dr. James Liu",
      tags: ["RL", "Deep Learning"],
      href: "/notebook/4",
    },
  ],
};

export default function NotebookPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavigationHeader />
      
      <main className="mx-auto max-w-6xl px-6 pt-24 pb-20">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 font-mono">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/notebooks" className="hover:text-foreground transition-colors">Notebooks</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{notebookData.title}</span>
          </div>

          <h1 className="text-xl font-normal mb-4">{notebookData.title}</h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-3xl">{notebookData.description}</p>

          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground font-mono mb-6">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <Link href={notebookData.author.href} className="hover:text-foreground transition-colors">
                {notebookData.author.name}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>Updated {new Date(notebookData.updatedAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-3 w-3" />
              <span>{notebookData.likes} likes</span>
            </div>
            <div className="flex items-center gap-2">
              <Book className="h-3 w-3" />
              <span>{notebookData.views} views</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {notebookData.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tag/${tag.toLowerCase().replace(/\s+/g, '-')}`}
                className="border border-border rounded-full px-4 py-1 text-xs font-mono text-muted-foreground hover:bg-accent transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="sm"
              className="rounded-full h-8 px-4 text-xs font-mono"
            >
              <Share className="h-3 w-3 mr-2" />
              Share
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="rounded-full h-8 px-4 text-xs font-mono"
            >
              <Copy className="h-3 w-3 mr-2" />
              Copy
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="rounded-full h-8 px-4 text-xs font-mono"
            >
              <Download className="h-3 w-3 mr-2" />
              Download
            </Button>
            <Button 
              size="sm"
              className="rounded-full h-8 px-4 text-xs font-mono bg-white text-black hover:bg-white/90"
            >
              <Heart className="h-3 w-3 mr-2" />
              Like
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="border border-border bg-card p-6 mb-8">
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                  {notebookData.content}
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <MessageCircle className="h-4 w-4" />
                <h3 className="text-base font-normal">Discussion</h3>
              </div>
              <div className="text-sm text-muted-foreground text-center py-8">
                <p>Be the first to share your thoughts about this notebook.</p>
                <Button className="mt-4 rounded-full h-8 px-4 text-xs font-mono bg-white text-black hover:bg-white/90">
                  Start Discussion
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Author Card */}
            <div className="border border-border bg-card p-6 mb-6">
              <h3 className="text-sm font-medium mb-4">About the Author</h3>
              <Link href={notebookData.author.href}>
                <div className="flex items-start gap-3 mb-4">
                  <Image
                    src={notebookData.author.avatar}
                    alt={notebookData.author.name}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div>
                    <h4 className="text-sm font-medium hover:underline">{notebookData.author.name}</h4>
                    <p className="text-xs text-muted-foreground">{notebookData.author.bio}</p>
                  </div>
                </div>
              </Link>
              <Button className="w-full rounded-full h-8 text-xs font-mono bg-secondary text-foreground hover:bg-accent">
                Follow
              </Button>
            </div>

            {/* Related Notebooks */}
            <div className="border border-border bg-card p-6">
              <h3 className="text-sm font-medium mb-4">Related Notebooks</h3>
              <div className="space-y-4">
                {notebookData.relatedNotebooks.map((notebook) => (
                  <Link key={notebook.id} href={notebook.href}>
                    <div className="border border-border p-3 hover:bg-accent transition-colors">
                      <h4 className="text-xs font-medium mb-2 line-clamp-2">{notebook.title}</h4>
                      <p className="text-[10px] text-muted-foreground font-mono mb-2">{notebook.author}</p>
                      <div className="flex gap-2 flex-wrap">
                        {notebook.tags.map((tag) => (
                          <span key={tag} className="text-[10px] font-mono text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p className="font-mono">© 2024 Supernotebooklm</p>
            <nav className="flex gap-6">
              <a href="/about" className="hover:text-foreground transition-colors">About</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="/contact" className="hover:text-foreground transition-colors">Contact</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
