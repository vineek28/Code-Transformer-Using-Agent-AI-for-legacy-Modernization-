# Code Transformer AI for Legacy Modernization

## 🚀 Overview

**Code Transformer AI** is a next-generation code modernization platform that leverages advanced AI agents to convert code from any programming language to any desired language within seconds, with minimal error rate. It is designed for:

- **Legacy code modernization**
- **Cross-language codebase migration**
- **Automated code translation and refactoring**
- **Seamless developer experience via chat or file upload**

## ✨ Features

- **Any-to-Any Language Conversion:** Instantly convert code between Python, JavaScript, Java, C++, C#, Go, Rust, PHP, Ruby, and more.
- **Modernization:** Update legacy code to use modern language features, best practices, and idioms.
- **Direct Chat Input:** Paste code directly into the chat for instant transformation.
- **Document Uploads:** Upload `.txt`, `.doc`, or `.pdf` files containing code snippets for extraction and conversion.
- **Automatic Language Detection:** No need to specify the source language—AI detects it for you.
- **Minimal Error Rate:** Designed for high accuracy and reliability.
- **Explanations:** Get a summary of changes and suggestions for further improvements.

## 🛠️ How It Works

1. **Paste code** or **upload a document** (.txt, .doc, .pdf) containing code.
2. **Specify the target language** and (optionally) any special instructions.
3. The AI agent analyzes, extracts, and transforms the code.
4. **Receive the transformed code** and a summary of changes in seconds.

## 📦 Usage

- **Chat-based:**
  - Paste your code and specify the target language.
  - Example: `Convert this Python code to JavaScript: ...`
- **File-based:**
  - Upload a `.txt`, `.doc`, or `.pdf` file with code.
  - Specify the target language in your message.

## 🧠 Technology
- Built on [Mastra](https://github.com/mastra-ai/mastra) agent framework
- Uses Claude 3.5 Sonnet for code understanding and generation
- Modular, extensible, and production-ready

## 📂 Project Structure
```
src/
  mastra/
    agents/
      code-transformer-agent.ts   # The main AI agent
    tools/
      archive.ts                 # Utility tools (if needed)
    workflows/
      code-transform-workflow.ts # Main workflow for code transformation
    index.ts                     # Mastra entry point
```

## 🤖 Example Prompt
```
Convert this legacy Perl script to modern Python 3:

sub greet {
  my $name = shift;
  print "Hello, $name!\n";
}
greet('Alice');
```

## 📜 License
MIT

---

> **Code Transformer AI**: Modernize your codebase, migrate with confidence, and unlock the power of AI-driven code transformation.
