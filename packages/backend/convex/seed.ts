/**
 * Seed Script for SuperNotebookLM
 * Populates the database with initial notebooks and users
 * 
 * ADMIN ONLY - Bypasses authentication for initial setup
 */

import { mutation, internalMutation } from "./_generated/server";

/**
 * Seed notebooks with realistic data
 * Run this once to populate the database
 * 
 * Use: npx convex run seed:adminSeedNotebooks
 */
export const adminSeedNotebooks = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if data already exists
    const existing = await ctx.db
      .query("publicNotebooks")
      .first();
    
    if (existing) {
      return {
        success: false,
        message: "Database already has notebooks. Skipping seed.",
      };
    }

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // ============================================================================
    // AUTHOR 1: Shak (Real author with real NotebookLM links)
    // ============================================================================
    const shakId = "user_shak_featured_ai_researcher";
    
    const shakNotebooks = [
      {
        title: "Cursor 2.0 Analysis",
        description: "Deep dive into Cursor 2.0's AI-powered code editor capabilities, exploring its impact on developer productivity and the future of software development.",
        content: `# Cursor 2.0 Analysis

## Overview
Cursor 2.0 represents a significant leap forward in AI-assisted code editors, integrating advanced language models directly into the development workflow.

## Key Features

### 1. AI-Powered Code Completion
- Context-aware suggestions that understand your entire codebase
- Multi-line completions that predict your coding patterns
- Automatic refactoring suggestions

### 2. Natural Language Commands
- Write code by describing what you want in plain English
- Generate entire functions from comments
- Explain complex code in simple terms

### 3. Intelligent Code Review
- Automatic bug detection and security vulnerability scanning
- Performance optimization suggestions
- Best practice recommendations

## Impact on Developer Productivity
Studies show developers using Cursor 2.0 complete tasks 30-40% faster while maintaining code quality.

## Future Implications
As AI code editors evolve, we're moving towards a future where:
- Natural language becomes the primary programming interface
- AI handles boilerplate and repetitive patterns
- Developers focus on architecture and creative problem-solving

## Comparison with GitHub Copilot
While both use AI, Cursor provides deeper IDE integration and more contextual awareness of your entire project.

## Conclusion
Cursor 2.0 isn't just a tool—it's a glimpse into the future of software development where humans and AI collaborate seamlessly.`,
        category: "Tutorial",
        tags: ["AI", "Code Editor", "Developer Tools", "Cursor", "Productivity"],
        shareLink: "https://notebooklm.google.com/notebook/44ce32b0-cf18-409c-be6c-aaafb5fb03cc",
        userId: shakId,
        viewCount: 2847,
        bookmarkCount: 234,
        isPublic: true,
        featured: true,
        createdAt: now - 15 * dayMs,
        updatedAt: now - 8 * dayMs,
      },
      {
        title: "China's Pursuit of AGI",
        description: "Comprehensive analysis of China's artificial general intelligence research initiatives, government policies, and competitive landscape in the global AI race.",
        content: `# China's Pursuit of AGI

## Executive Summary
China has positioned AGI development as a national priority, investing billions in research, talent acquisition, and infrastructure.

## Government Strategy

### National AI Plan (2017-2030)
- Phase 1 (2020): Match leading AI nations
- Phase 2 (2025): Achieve major breakthroughs
- Phase 3 (2030): Become global AI innovation center

### Key Funding Initiatives
- $150B+ in AI investments announced
- Special economic zones for AI research
- Tax incentives for AI companies

## Major Research Institutions

### 1. Beijing Academy of Artificial Intelligence (BAAI)
- Focus: Large language models and AGI foundations
- Notable: Wu Dao 2.0 (1.75 trillion parameters)

### 2. Tsinghua University
- Leading AGI theoretical research
- Partnerships with major tech companies

### 3. Chinese Academy of Sciences
- Fundamental AI research
- Focus on neuroscience-inspired AGI

## Private Sector Leaders

### Baidu
- ERNIE language models
- Quantum computing initiatives
- Self-driving technology

### Alibaba
- Alibaba DAMO Academy
- Multi-modal AI research
- Cloud AI infrastructure

### Tencent
- Robotics and embodied AI
- Gaming AI research
- Social media ML systems

## International Collaboration vs Competition
China balances open research collaboration with strategic autonomy in critical technologies.

## Challenges
- Access to cutting-edge chips (export controls)
- Brain drain to Western tech companies
- Ethical AI governance frameworks

## Implications for Global AI Landscape
China's AGI pursuit is reshaping:
- Global talent competition
- International AI governance discussions
- Technology supply chains
- Geopolitical power dynamics

## Conclusion
China's systematic approach to AGI development represents one of the most ambitious national AI strategies in history.`,
        category: "Research",
        tags: ["AGI", "China", "AI Policy", "Geopolitics", "Research"],
        shareLink: "https://notebooklm.google.com/notebook/aca3374e-c4f8-48d6-ab57-fa763254661b",
        userId: shakId,
        viewCount: 4521,
        bookmarkCount: 389,
        isPublic: true,
        featured: true,
        createdAt: now - 22 * dayMs,
        updatedAt: now - 5 * dayMs,
      },
      {
        title: "Google DeepMind Research",
        description: "Exploration of Google DeepMind's groundbreaking AI research, from AlphaGo to AlphaFold, and their vision for beneficial AGI development.",
        content: `# Google DeepMind Research

## Introduction
Google DeepMind stands at the forefront of AGI research, combining neuroscience insights with cutting-edge machine learning.

## Historic Breakthroughs

### AlphaGo (2016)
- First AI to defeat world Go champion
- Demonstrated intuitive pattern recognition
- Combined deep learning with tree search

### AlphaZero (2017)
- Mastered Chess, Go, and Shogi through self-play
- No human knowledge required
- Discovered novel strategies

### AlphaFold (2020-2023)
- Solved 50-year-old protein folding problem
- Predicted structures for 200M+ proteins
- Accelerating drug discovery and biology research

## Current Research Directions

### 1. Large Language Models
- Gemini model family (multimodal capabilities)
- Context understanding and reasoning
- Safe and aligned AI systems

### 2. Reinforcement Learning
- General-purpose learning algorithms
- Transfer learning across domains
- Real-world robotic applications

### 3. Neuroscience-Inspired AI
- Memory systems based on hippocampus
- Attention mechanisms from visual cortex
- Meta-learning from human cognitive development

### 4. Multimodal AI
- Flamingo (visual language understanding)
- Gato (generalist agent)
- Video generation and understanding

## Research Philosophy

### Safety First
- AI alignment research
- Interpretability and explainability
- Robust testing before deployment

### Open Science
- Publishing research papers
- Sharing datasets and benchmarks
- Collaborating with academia

### Long-term Vision
- Building AGI that benefits humanity
- Solving scientific challenges
- Ethical AI development

## Organizational Structure

### Research Teams
- Algorithms & Theory
- Neuroscience
- Applied Research
- AI Safety

### Partnerships
- Google Brain merger (2023)
- Academic collaborations
- Healthcare institutions

## Impact Metrics
- 1000+ research papers published
- 50+ Nature/Science publications
- Billions in societal value from AlphaFold

## Challenges and Criticisms
- Compute resource requirements
- Reproducibility concerns
- Deployment vs research tension

## Future Roadmap
DeepMind aims to:
- Develop more general AI systems
- Solve major scientific problems
- Ensure AI safety and alignment
- Make AI accessible and beneficial globally

## Key Personnel
- Demis Hassabis (CEO & Co-founder)
- Shane Legg (Chief AGI Scientist)
- Pushmeet Kohli (VP of Research)

## Conclusion
DeepMind's systematic approach to AGI—combining empirical breakthroughs with theoretical rigor—positions them as a leader in safe, beneficial AI development.`,
        category: "Research",
        tags: ["DeepMind", "Google", "AGI", "AlphaFold", "AI Research"],
        shareLink: "https://notebooklm.google.com/notebook/9522a9e2-e034-4b52-8bef-e43486e8fb28",
        userId: shakId,
        viewCount: 5834,
        bookmarkCount: 467,
        isPublic: true,
        featured: true,
        createdAt: now - 18 * dayMs,
        updatedAt: now - 3 * dayMs,
      },
    ];

    // ============================================================================
    // AUTHOR 2: Dr. Sarah Chen (Mock - Machine Learning Expert)
    // ============================================================================
    const sarahId = "user_sarah_chen_ml_expert";
    
    const sarahNotebooks = [
      {
        title: "Introduction to Neural Networks",
        description: "Beginner-friendly guide to understanding neural networks, from perceptrons to deep learning architectures.",
        content: `# Introduction to Neural Networks

## What is a Neural Network?
A neural network is a computational model inspired by biological neurons in the brain.

## Basic Components
- Input Layer
- Hidden Layers
- Output Layer
- Weights and Biases
- Activation Functions

## Common Architectures
1. Feedforward Networks
2. Convolutional Neural Networks (CNN)
3. Recurrent Neural Networks (RNN)
4. Transformers

## Training Process
- Forward Propagation
- Loss Calculation
- Backpropagation
- Gradient Descent

## Applications
- Image Classification
- Natural Language Processing
- Speech Recognition
- Game Playing AI`,
        category: "Tutorial",
        tags: ["Neural Networks", "Deep Learning", "ML Basics"],
        userId: sarahId,
        viewCount: 3241,
        bookmarkCount: 178,
        isPublic: true,
        featured: false,
        createdAt: now - 30 * dayMs,
      },
      {
        title: "Python for Data Science",
        description: "Complete guide to using Python libraries (NumPy, Pandas, Matplotlib) for data analysis and visualization.",
        content: `# Python for Data Science

## Essential Libraries
- NumPy: Numerical computing
- Pandas: Data manipulation
- Matplotlib: Visualization
- Scikit-learn: Machine learning

## Data Loading
\`\`\`python
import pandas as pd
df = pd.read_csv('data.csv')
\`\`\`

## Data Cleaning
- Handling missing values
- Data type conversion
- Outlier detection

## Exploratory Data Analysis
- Statistical summaries
- Distribution plots
- Correlation analysis

## Best Practices
- Code organization
- Version control
- Documentation`,
        category: "Tutorial",
        tags: ["Python", "Data Science", "Pandas", "NumPy"],
        userId: sarahId,
        viewCount: 2876,
        bookmarkCount: 145,
        isPublic: true,
        featured: false,
        createdAt: now - 25 * dayMs,
      },
      {
        title: "Machine Learning Model Evaluation",
        description: "Understanding metrics, cross-validation, and best practices for evaluating ML model performance.",
        content: `# Machine Learning Model Evaluation

## Classification Metrics
- Accuracy
- Precision and Recall
- F1 Score
- ROC-AUC

## Regression Metrics
- Mean Squared Error (MSE)
- Root Mean Squared Error (RMSE)
- R-squared
- Mean Absolute Error (MAE)

## Cross-Validation
- K-Fold Cross-Validation
- Stratified K-Fold
- Time Series Split

## Overfitting vs Underfitting
- Training vs Validation Performance
- Learning Curves
- Regularization Techniques

## Model Selection
- Comparing multiple models
- Hyperparameter tuning
- Ensemble methods`,
        category: "Learning",
        tags: ["ML", "Model Evaluation", "Metrics", "Validation"],
        userId: sarahId,
        viewCount: 1923,
        bookmarkCount: 98,
        isPublic: true,
        featured: false,
        createdAt: now - 12 * dayMs,
      },
    ];

    // ============================================================================
    // AUTHOR 3: Prof. James Martinez (Mock - Full Stack Developer)
    // ============================================================================
    const jamesId = "user_james_martinez_fullstack";
    
    const jamesNotebooks = [
      {
        title: "React Best Practices 2025",
        description: "Modern React patterns, hooks, performance optimization, and state management strategies for production applications.",
        content: `# React Best Practices 2025

## Component Design
- Functional Components
- Custom Hooks
- Component Composition
- Props vs State

## State Management
- useState and useReducer
- Context API
- Redux Toolkit
- Zustand

## Performance Optimization
- React.memo
- useMemo and useCallback
- Code Splitting
- Lazy Loading

## Modern Patterns
- Server Components
- Concurrent Features
- Suspense
- Error Boundaries

## Testing
- Jest and React Testing Library
- E2E with Playwright
- Component Testing`,
        category: "Tutorial",
        tags: ["React", "JavaScript", "Frontend", "Web Dev"],
        userId: jamesId,
        viewCount: 4521,
        bookmarkCount: 287,
        isPublic: true,
        featured: false,
        createdAt: now - 20 * dayMs,
      },
      {
        title: "Building Scalable APIs with Node.js",
        description: "Design and implementation guide for RESTful and GraphQL APIs using Node.js, Express, and modern backend technologies.",
        content: `# Building Scalable APIs with Node.js

## API Design Principles
- RESTful conventions
- Resource naming
- HTTP methods and status codes
- Versioning strategies

## Express.js Fundamentals
- Routing
- Middleware
- Error handling
- Request validation

## Database Integration
- MongoDB with Mongoose
- PostgreSQL with Prisma
- Connection pooling
- Query optimization

## Authentication & Security
- JWT tokens
- OAuth 2.0
- Rate limiting
- Input sanitization

## Performance
- Caching strategies
- Load balancing
- Database indexing
- Monitoring and logging`,
        category: "Tutorial",
        tags: ["Node.js", "API", "Backend", "Express"],
        userId: jamesId,
        viewCount: 3654,
        bookmarkCount: 201,
        isPublic: true,
        featured: false,
        createdAt: now - 28 * dayMs,
      },
      {
        title: "Database Design Patterns",
        description: "Common database design patterns, normalization, indexing strategies, and performance optimization techniques.",
        content: `# Database Design Patterns

## Normalization
- First Normal Form (1NF)
- Second Normal Form (2NF)
- Third Normal Form (3NF)
- When to denormalize

## Indexing Strategies
- B-tree indexes
- Hash indexes
- Full-text indexes
- Composite indexes

## Common Patterns
- One-to-Many relationships
- Many-to-Many with junction tables
- Polymorphic associations
- Soft deletes

## Performance Optimization
- Query optimization
- Connection pooling
- Read replicas
- Partitioning

## Schema Migration
- Version control for schemas
- Zero-downtime migrations
- Rollback strategies`,
        category: "Learning",
        tags: ["Database", "SQL", "Design Patterns", "Performance"],
        userId: jamesId,
        viewCount: 2134,
        bookmarkCount: 134,
        isPublic: true,
        featured: false,
        createdAt: now - 14 * dayMs,
      },
    ];

    // ============================================================================
    // AUTHOR 4: Dr. Emily Watson (Mock - Computer Vision Researcher)
    // ============================================================================
    const emilyId = "user_emily_watson_cv";
    
    const emilyNotebooks = [
      {
        title: "Computer Vision Fundamentals",
        description: "Introduction to computer vision concepts, image processing, and deep learning for visual tasks.",
        content: `# Computer Vision Fundamentals

## Image Basics
- Pixels and color spaces
- Image formats
- Resolution and dimensions

## Image Processing
- Filters and convolution
- Edge detection
- Image transformations
- Histogram equalization

## Feature Detection
- SIFT and SURF
- ORB features
- Corner detection
- Feature matching

## Deep Learning for Vision
- Convolutional Neural Networks
- Object Detection (YOLO, R-CNN)
- Image Segmentation
- Transfer Learning

## Applications
- Face recognition
- Medical imaging
- Autonomous vehicles
- Augmented reality`,
        category: "Research",
        tags: ["Computer Vision", "CNN", "Image Processing", "Deep Learning"],
        userId: emilyId,
        viewCount: 2987,
        bookmarkCount: 167,
        isPublic: true,
        featured: false,
        createdAt: now - 35 * dayMs,
      },
      {
        title: "Object Detection with YOLO",
        description: "Practical guide to implementing real-time object detection using YOLO (You Only Look Once) architecture.",
        content: `# Object Detection with YOLO

## YOLO Architecture
- Single-stage detection
- Grid-based prediction
- Anchor boxes
- Non-max suppression

## YOLOv8 Features
- Improved accuracy
- Faster inference
- Better small object detection

## Training Custom Models
- Dataset preparation
- Annotation tools
- Transfer learning
- Hyperparameter tuning

## Deployment
- ONNX export
- TensorRT optimization
- Mobile deployment
- Edge devices

## Real-world Applications
- Surveillance systems
- Retail analytics
- Manufacturing QA
- Sports analytics`,
        category: "Tutorial",
        tags: ["YOLO", "Object Detection", "Computer Vision", "Deep Learning"],
        userId: emilyId,
        viewCount: 3456,
        bookmarkCount: 223,
        isPublic: true,
        featured: false,
        createdAt: now - 19 * dayMs,
      },
      {
        title: "Medical Image Analysis",
        description: "Applications of AI in medical imaging, from X-ray analysis to MRI segmentation and diagnostic assistance.",
        content: `# Medical Image Analysis

## Medical Imaging Modalities
- X-ray and CT scans
- MRI and fMRI
- Ultrasound
- PET scans

## Deep Learning Applications
- Disease detection
- Tumor segmentation
- Organ localization
- Treatment planning

## Challenges
- Limited labeled data
- Class imbalance
- Regulatory compliance
- Interpretability requirements

## U-Net for Segmentation
- Architecture overview
- Training strategies
- Post-processing
- Performance metrics

## Ethical Considerations
- Patient privacy
- Bias in training data
- Clinical validation
- Human-in-the-loop systems`,
        category: "Research",
        tags: ["Medical AI", "Computer Vision", "Healthcare", "Deep Learning"],
        userId: emilyId,
        viewCount: 1876,
        bookmarkCount: 112,
        isPublic: true,
        featured: false,
        createdAt: now - 8 * dayMs,
      },
    ];

    // Insert all notebooks
    const allNotebooks = [
      ...shakNotebooks,
      ...sarahNotebooks,
      ...jamesNotebooks,
      ...emilyNotebooks,
    ];

    const insertedIds = [];
    for (const notebook of allNotebooks) {
      const id = await ctx.db.insert("publicNotebooks", notebook);
      insertedIds.push(id);
    }

    return {
      success: true,
      message: `Successfully seeded ${insertedIds.length} notebooks`,
      details: {
        total: insertedIds.length,
        authors: {
          shak: shakNotebooks.length,
          sarah: sarahNotebooks.length,
          james: jamesNotebooks.length,
          emily: emilyNotebooks.length,
        },
        featured: shakNotebooks.length,
        categories: {
          Research: allNotebooks.filter(n => n.category === "Research").length,
          Tutorial: allNotebooks.filter(n => n.category === "Tutorial").length,
          Learning: allNotebooks.filter(n => n.category === "Learning").length,
        },
      },
      insertedIds,
    };
  },
});

/**
 * Clear all notebooks (use with caution!)
 */
export const clearNotebooks = mutation({
  args: {},
  handler: async (ctx) => {
    const notebooks = await ctx.db.query("publicNotebooks").collect();
    
    for (const notebook of notebooks) {
      await ctx.db.delete(notebook._id);
    }
    
    return {
      success: true,
      message: `Deleted ${notebooks.length} notebooks`,
      count: notebooks.length,
    };
  },
});
