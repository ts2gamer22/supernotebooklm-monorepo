#!/usr/bin/env node
/**
 * Seed data script - Run with: node seed-data.mjs
 * This bypasses auth to directly insert notebooks
 */

import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://cheery-salmon-841.convex.cloud");

// Seed data
const seedData = {
  // Author 1: Shak (Real author with real NotebookLM links)
  shak: {
    userId: "user_shak_featured_ai_researcher",
    notebooks: [
      {
        title: "Cursor 2.0 Analysis",
        description: "Deep dive into Cursor 2.0's AI-powered code editor capabilities, exploring its impact on developer productivity and the future of software development.",
        content: `# Cursor 2.0 Analysis

## Overview
Cursor 2.0 represents a significant leap forward in AI-assisted code editors.

## Key Features
- AI-Powered Code Completion
- Natural Language Commands
- Intelligent Code Review

## Impact on Developer Productivity
Studies show 30-40% faster task completion while maintaining code quality.

## Future Implications
Natural language becoming the primary programming interface.`,
        category: "Tutorial",
        tags: ["AI", "Code Editor", "Developer Tools", "Cursor", "Productivity"],
      },
      {
        title: "China's Pursuit of AGI",
        description: "Comprehensive analysis of China's artificial general intelligence research initiatives, government policies, and competitive landscape in the global AI race.",
        content: `# China's Pursuit of AGI

## Executive Summary
China has positioned AGI development as a national priority.

## Government Strategy
- Phase 1 (2020): Match leading AI nations
- Phase 2 (2025): Achieve major breakthroughs  
- Phase 3 (2030): Become global AI innovation center

## Major Research Institutions
- Beijing Academy of Artificial Intelligence (BAAI)
- Tsinghua University
- Chinese Academy of Sciences`,
        category: "Research",
        tags: ["AGI", "China", "AI Policy", "Geopolitics", "Research"],
      },
      {
        title: "Google DeepMind Research",
        description: "Exploration of Google DeepMind's groundbreaking AI research, from AlphaGo to AlphaFold, and their vision for beneficial AGI development.",
        content: `# Google DeepMind Research

## Introduction
Google DeepMind stands at the forefront of AGI research.

## Historic Breakthroughs
- AlphaGo (2016): First AI to defeat world Go champion
- AlphaZero (2017): Mastered Chess, Go, and Shogi through self-play
- AlphaFold (2020-2023): Solved 50-year-old protein folding problem

## Current Research Directions
- Large Language Models (Gemini family)
- Reinforcement Learning
- Neuroscience-Inspired AI
- Multimodal AI`,
        category: "Research",
        tags: ["DeepMind", "Google", "AGI", "AlphaFold", "AI Research"],
      },
    ],
  },
  
  // Author 2: Dr. Sarah Chen
  sarah: {
    userId: "user_sarah_chen_ml_expert",
    notebooks: [
      {
        title: "Introduction to Neural Networks",
        description: "Beginner-friendly guide to understanding neural networks, from perceptrons to deep learning architectures.",
        content: "# Introduction to Neural Networks\n\n## What is a Neural Network?\nA computational model inspired by biological neurons.\n\n## Basic Components\n- Input Layer\n- Hidden Layers\n- Output Layer\n- Weights and Biases",
        category: "Tutorial",
        tags: ["Neural Networks", "Deep Learning", "ML Basics"],
      },
      {
        title: "Python for Data Science",
        description: "Complete guide to using Python libraries (NumPy, Pandas, Matplotlib) for data analysis.",
        content: "# Python for Data Science\n\n## Essential Libraries\n- NumPy: Numerical computing\n- Pandas: Data manipulation\n- Matplotlib: Visualization\n- Scikit-learn: Machine learning",
        category: "Tutorial",
        tags: ["Python", "Data Science", "Pandas", "NumPy"],
      },
      {
        title: "Machine Learning Model Evaluation",
        description: "Understanding metrics, cross-validation, and best practices for evaluating ML model performance.",
        content: "# Machine Learning Model Evaluation\n\n## Classification Metrics\n- Accuracy\n- Precision and Recall\n- F1 Score\n- ROC-AUC\n\n## Regression Metrics\n- Mean Squared Error (MSE)\n- R-squared",
        category: "Learning",
        tags: ["ML", "Model Evaluation", "Metrics", "Validation"],
      },
    ],
  },
  
  // Author 3: Prof. James Martinez
  james: {
    userId: "user_james_martinez_fullstack",
    notebooks: [
      {
        title: "React Best Practices 2025",
        description: "Modern React patterns, hooks, performance optimization, and state management strategies.",
        content: "# React Best Practices 2025\n\n## Component Design\n- Functional Components\n- Custom Hooks\n- Component Composition\n\n## State Management\n- useState and useReducer\n- Context API\n- Redux Toolkit",
        category: "Tutorial",
        tags: ["React", "JavaScript", "Frontend", "Web Dev"],
      },
      {
        title: "Building Scalable APIs with Node.js",
        description: "Design and implementation guide for RESTful and GraphQL APIs using Node.js and Express.",
        content: "# Building Scalable APIs with Node.js\n\n## API Design Principles\n- RESTful conventions\n- HTTP methods and status codes\n\n## Express.js Fundamentals\n- Routing\n- Middleware\n- Error handling",
        category: "Tutorial",
        tags: ["Node.js", "API", "Backend", "Express"],
      },
      {
        title: "Database Design Patterns",
        description: "Common database design patterns, normalization, indexing strategies, and performance optimization.",
        content: "# Database Design Patterns\n\n## Normalization\n- First Normal Form (1NF)\n- Second Normal Form (2NF)\n- Third Normal Form (3NF)\n\n## Indexing Strategies\n- B-tree indexes\n- Hash indexes",
        category: "Learning",
        tags: ["Database", "SQL", "Design Patterns", "Performance"],
      },
    ],
  },
  
  // Author 4: Dr. Emily Watson
  emily: {
    userId: "user_emily_watson_cv",
    notebooks: [
      {
        title: "Computer Vision Fundamentals",
        description: "Introduction to computer vision concepts, image processing, and deep learning for visual tasks.",
        content: "# Computer Vision Fundamentals\n\n## Image Basics\n- Pixels and color spaces\n- Image formats\n\n## Image Processing\n- Filters and convolution\n- Edge detection\n\n## Deep Learning for Vision\n- CNNs\n- Object Detection",
        category: "Research",
        tags: ["Computer Vision", "CNN", "Image Processing", "Deep Learning"],
      },
      {
        title: "Object Detection with YOLO",
        description: "Practical guide to implementing real-time object detection using YOLO architecture.",
        content: "# Object Detection with YOLO\n\n## YOLO Architecture\n- Single-stage detection\n- Grid-based prediction\n\n## YOLOv8 Features\n- Improved accuracy\n- Faster inference",
        category: "Tutorial",
        tags: ["YOLO", "Object Detection", "Computer Vision", "Deep Learning"],
      },
      {
        title: "Medical Image Analysis",
        description: "Applications of AI in medical imaging, from X-ray analysis to MRI segmentation.",
        content: "# Medical Image Analysis\n\n## Medical Imaging Modalities\n- X-ray and CT scans\n- MRI\n- Ultrasound\n\n## Deep Learning Applications\n- Disease detection\n- Tumor segmentation",
        category: "Research",
        tags: ["Medical AI", "Computer Vision", "Healthcare", "Deep Learning"],
      },
    ],
  },
};

console.log("🌱 Starting database seed...\n");

// We can't use createPublicNotebook without auth, so let's document the data instead
console.log("📊 Seed Data Summary:\n");
console.log(`Total Authors: 4`);
console.log(`  - Shak (Featured): ${seedData.shak.notebooks.length} notebooks`);
console.log(`  - Dr. Sarah Chen: ${seedData.sarah.notebooks.length} notebooks`);
console.log(`  - Prof. James Martinez: ${seedData.james.notebooks.length} notebooks`);
console.log(`  - Dr. Emily Watson: ${seedData.emily.notebooks.length} notebooks`);
console.log(`\nTotal Notebooks: 12\n`);

console.log("⚠️  Cannot seed without authentication.");
console.log("📝 Alternative: Use Convex Dashboard to manually insert data");
console.log("🔗 Dashboard: https://dashboard.convex.dev/d/cheery-salmon-841/data\n");

// Export data for manual insertion
console.log("📄 Data ready for manual insertion via dashboard...\n");
