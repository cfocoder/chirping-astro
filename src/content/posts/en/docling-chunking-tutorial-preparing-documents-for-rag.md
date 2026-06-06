---
title: 'Docling Chunking Tutorial: Preparing Documents for RAG'
description: 'Docling Chunkers: Overview and Comparison'
pubDate: 2025-11-02
heroImage: '/images/2025/11/Docling_Chunking.png'
heroImageAlt: 'Docling Chunking'
categories: ['AI']
tags: []
toc: true
---

## Table of Contents

- Docling Chunkers: Overview and Comparison

1. BaseChunker

- 2. HierarchicalChunker

- 3. HybridChunker

- What is Document Chunking?

- Why Docling’s HierarchicalChunker?

- Tutorial Structure

- Section 1: Setup and Prerequisites

- Section 2: Basic Chunking with Default Settings

- Section 3: Advanced Chunking with Custom Parameters

- Section 4: Understanding Chunk Metadata and Structure

- Section 5: Exporting Chunks for RAG Applications

- Section 6: Best Practices for Legal Documents

  6.1 Chunking Strategy Guidelines

Chunk Size Selection:

- Overlap Considerations:

- Legal Document Specifics:

- RAG Pipeline Integration:

- Performance Tips:

- Section 7: Chunking Strategy Comparison

- Section 8: Real-World RAG Integration Patterns

  8.1 Integration Example: ChromaDB

- 8.2 Integration Example: Pinecone

- 8.3 Integration Example: LangChain

- 8.4 Integration Example: LlamaIndex

- Section 9: Summary and Key Takeaways

What We’ve Covered:

- Key Parameters:

- Chunking Strategy Decision Tree:

- Next Steps:

- Additional Resources:

Docling Chunkers: Overview and Comparison

Docling provides several chunkers for splitting documents into semantically meaningful pieces, each with different strategies and sophistication:

## 1. BaseChunker

- Description: The most basic chunker. It splits documents into chunks based on a fixed number of tokens or characters, without considering document structure or semantics.

- Use case: Simple, fast, but may break sentences or paragraphs.

## 2. HierarchicalChunker

- Description: The default and most commonly used chunker. It leverages the document’s hierarchical structure (sections, headings, paragraphs) to create coherent chunks, preserving context and meaning.

- Use case: Legal, academic, or structured documents where context and section boundaries matter.

- Sophistication: More advanced than BaseChunker; maintains semantic coherence.

## 3. HybridChunker

- Description: Combines hierarchical and sliding window approaches. It first tries to chunk by structure (like HierarchicalChunker), but if a section is too large, it applies a sliding window to further split it.

- Use case: Very large or unevenly structured documents, or when you want both structure and size control.

- Sophistication: The most advanced and flexible; adapts to both structure and token limits.

**Summary Table:**

| Chunker             | Structure-Aware | Sliding Window | Semantic Coherence | Use Case                         | Sophistication |
| ------------------- | --------------- | -------------- | ------------------ | -------------------------------- | -------------- |
| BaseChunker         | No              | No             | Low                | Simple, unstructured docs        | Basic          |
| HierarchicalChunker | Yes             | No             | High               | Legal, academic, structured docs | Advanced       |
| HybridChunker       | Yes             | Yes            | Very High          | Large/complex docs, RAG          | Most Advanced  |

**Recommendation:**
For most legal/fiscal documents, use `HierarchicalChunker` for semantic coherence. For very large or complex documents, or when you need strict chunk size control, use `HybridChunker`—it is the most sophisticated and advanced option.

For more details, see the [Docling Chunking Documentation](https://docling-project.github.io/docling/concepts/chunking/#base-chunker).

This tutorial focuses specifically on **document chunking** using Docling’s `HierarchicalChunker`. We’ll use the Mexican Constitution (CPEUM) as our case study to demonstrate how to intelligently split documents for Retrieval-Augmented Generation (RAG) applications.

## What is Document Chunking?

Document chunking is the process of breaking large documents into smaller, semantically meaningful pieces. This is essential for:

- RAG Systems: Creating chunks for vector embeddings and retrieval

- LLM Context Windows: Managing token limits when feeding text to language models

- Semantic Search: Enabling more precise information retrieval

- Performance: Balancing between context preservation and retrieval accuracy

## Why Docling’s HierarchicalChunker?

Unlike simple text splitting (e.g., splitting every N characters), Docling’s chunker:

- ✓ Respects Document Structure: Preserves sections, paragraphs, and logical boundaries

- ✓ Semantic Coherence: Doesn’t split mid-sentence or mid-thought

- ✓ Configurable: Control chunk size, overlap, and tokenization

- ✓ Metadata Rich: Each chunk includes structural information

- ✓ Table-Aware: Keeps tables intact when possible

## Tutorial Structure

- Setup and document conversion

- Basic chunking with default settings

- Advanced chunking with custom parameters

- Chunk metadata and structure analysis

- Exporting chunks for RAG pipelines

- Best practices for legal documents

- Chunking strategy comparison

- Real-world RAG integration patterns

## Section 1: Setup and Prerequisites

Before we start chunking, we need to:

- Install Docling and its dependencies

- Convert our source document (CPEUM) to a Docling document

- Verify the document structure

**Prerequisites:**

```bash
pip install docling docling-core
```

```python
import os
import json
from pathlib import Path
from pprint import pprint

# Import Docling components
from docling.document_converter import DocumentConverter
from docling.chunking import HierarchicalChunker

print("✓ Dependencies imported successfully!")
print(f"✓ Ready to convert and chunk documents")
```

```text
### 1.1 Convert the CPEUM PDF to Docling Document

# Define paths
pdf_path = Path("CPEUM.pdf")
output_dir = Path("chunks")
output_dir.mkdir(exist_ok=True)

# Verify file exists
if pdf_path.exists():
    print(f"✓ PDF file found: {pdf_path.name}")
    print(f"  File size: {pdf_path.stat().st_size / (1024*1024):.2f} MB")
else:
    print(f"✗ PDF file not found at {pdf_path}")

# Initialize converter and convert
print("\n" + "=" * 70)
print("CONVERTING CPEUM PDF")
print("=" * 70)

converter = DocumentConverter()
result = converter.convert(str(pdf_path))
doc = result.document

print(f"\n✓ Conversion Status: {result.status}")
print(f"✓ Number of pages: {len(result.pages)}")
print(f"✓ Document ready for chunking!")
```

## Section 2: Basic Chunking with Default Settings

Let’s start with the simplest approach – using `HierarchicalChunker` with its default parameters.

```text
### 2.1 Create Chunks with Default Parameters

print("=" * 70)
print("BASIC CHUNKING - DEFAULT PARAMETERS")
print("=" * 70)

# Initialize the chunker with default settings
chunker = HierarchicalChunker()

# Chunk the CPEUM document
chunks = list(chunker.chunk(doc))

print(f"\n✓ Total chunks created: {len(chunks)}")
print(f"✓ Chunker initialized with default parameters")

# Analyze the chunks
if chunks:
    chunk_lengths = [len(chunk.text) for chunk in chunks]
    avg_length = sum(chunk_lengths) / len(chunk_lengths)

    print(f"\n📊 Chunk Statistics:")
    print(f"  - Average chunk length: {avg_length:.0f} characters")
    print(f"  - Shortest chunk: {min(chunk_lengths)} characters")
    print(f"  - Longest chunk: {max(chunk_lengths)} characters")

    # Show the first chunk
    print(f"\n📄 First Chunk Preview:")
    first_chunk = chunks[0]
    print(f"  - Text length: {len(first_chunk.text)} characters")
    print(f"  - Text preview: {first_chunk.text[:200]}...")

    # Show chunk metadata
    if hasattr(first_chunk, 'meta'):
        print(f"\n🏷️  First Chunk Metadata:")
        print(f"  - Metadata: {first_chunk.meta}")
```

## Section 3: Advanced Chunking with Custom Parameters

Now let’s explore how to fine-tune the chunking process with custom parameters to better suit your specific use case.

```text
### 3.1 Custom Chunker Configuration

print("=" * 70)
print("ADVANCED CHUNKING - CUSTOM PARAMETERS")
print("=" * 70)

# Create a chunker with custom parameters
# These parameters control how the document is split
custom_chunker = HierarchicalChunker(
    max_tokens=512,           # Maximum tokens per chunk
    min_tokens=64,            # Minimum tokens per chunk (avoid tiny chunks)
    overlap_tokens=50,        # Overlap between chunks for context continuity
    tokenizer="text"          # Use simple whitespace tokenization
)

# Chunk the document with custom settings
custom_chunks = list(custom_chunker.chunk(doc))

print(f"\n✓ Chunks created with custom parameters: {len(custom_chunks)}")
print(f"\n⚙️  Custom Chunker Configuration:")
print(f"  - Max tokens: 512")
print(f"  - Min tokens: 64")
print(f"  - Overlap tokens: 50")
print(f"  - Tokenizer: text (whitespace-based)")

# Compare with default chunking
print(f"\n📊 Comparison:")
print(f"  - Default chunker: {len(chunks)} chunks")
print(f"  - Custom chunker: {len(custom_chunks)} chunks")
print(f"  - Difference: {abs(len(chunks) - len(custom_chunks))} chunks")

# Analyze custom chunks
if custom_chunks:
    custom_lengths = [len(chunk.text) for chunk in custom_chunks]
    avg_custom = sum(custom_lengths) / len(custom_lengths)

    print(f"\n📐 Custom Chunk Statistics:")
    print(f"  - Average length: {avg_custom:.0f} characters")
    print(f"  - Shortest: {min(custom_lengths)} characters")
    print(f"  - Longest: {max(custom_lengths)} characters")

    # Show a sample chunk
    print(f"\n📄 Sample Custom Chunk (chunk #5):")
    if len(custom_chunks) > 4:
        sample_chunk = custom_chunks[4]
        print(f"  - Length: {len(sample_chunk.text)} characters")
        print(f"  - Preview: {sample_chunk.text[:300]}...")
```

## Section 4: Understanding Chunk Metadata and Structure

Each chunk created by Docling contains rich metadata about its position and structure in the original document. This is crucial for maintaining context in RAG applications.

```text
### 4.1 Detailed Chunk Analysis

print("=" * 70)
print("CHUNK METADATA ANALYSIS")
print("=" * 70)

# Let's examine the structure and metadata of chunks in detail
print("\n🔍 Detailed Analysis of First 3 Chunks:")

for i, chunk in enumerate(custom_chunks[:3], 1):
    print(f"\n--- Chunk {i} ---")
    print(f"Text length: {len(chunk.text)} characters")
    print(f"Word count: {len(chunk.text.split())} words")

    # Show metadata if available
    if hasattr(chunk, 'meta'):
        print(f"Metadata: {chunk.meta}")

    # Show document location information if available
    if hasattr(chunk, 'dl_doc_hash'):
        print(f"Document hash: {chunk.dl_doc_hash}")

    if hasattr(chunk, 'page'):
        print(f"Page number: {chunk.page}")

    # Show text preview
    preview_length = min(150, len(chunk.text))
    print(f"Preview: {chunk.text[:preview_length]}...")

    # Show path information (hierarchical structure)
    if hasattr(chunk, 'path'):
        print(f"Path: {chunk.path}")

print("\n" + "=" * 70)
```

## Section 5: Exporting Chunks for RAG Applications

Now let’s prepare our chunks in a format suitable for vector databases and RAG pipelines. This includes packaging the text with metadata in a structured JSON format.

```sql
### 5.1 Prepare Chunks for Vector Database Ingestion

print("=" * 70)
print("EXPORTING CHUNKS FOR RAG")
print("=" * 70)

# Prepare chunks for embedding and vector database storage
# This is the format typically used for RAG pipelines

chunks_for_rag = []

for i, chunk in enumerate(custom_chunks):
    chunk_data = {
        "chunk_id": i,
        "text": chunk.text,
        "char_count": len(chunk.text),
        "word_count": len(chunk.text.split()),
        "metadata": {
            "source": "CPEUM",
            "document_name": pdf_path.name,
        }
    }

    # Add optional metadata if available
    if hasattr(chunk, 'meta'):
        chunk_data["metadata"]["chunk_meta"] = str(chunk.meta)

    if hasattr(chunk, 'page'):
        chunk_data["metadata"]["page"] = chunk.page

    if hasattr(chunk, 'path'):
        chunk_data["metadata"]["path"] = str(chunk.path)

    chunks_for_rag.append(chunk_data)

print(f"\n✓ Prepared {len(chunks_for_rag)} chunks for RAG pipeline")

# Save chunks to JSON file (ready for vector database ingestion)
chunks_output_path = output_dir / "CPEUM_chunks_for_rag.json"
with open(chunks_output_path, "w", encoding="utf-8") as f:
    json.dump(chunks_for_rag, f, indent=2, ensure_ascii=False)

print(f"✓ Chunks saved to: {chunks_output_path}")

# Show statistics
total_chars = sum(c["char_count"] for c in chunks_for_rag)
total_words = sum(c["word_count"] for c in chunks_for_rag)

print(f"\n📊 RAG Chunk Statistics:")
print(f"  - Total chunks: {len(chunks_for_rag)}")
print(f"  - Total characters: {total_chars:,}")
print(f"  - Total words: {total_words:,}")
print(f"  - Average words per chunk: {total_words/len(chunks_for_rag):.0f}")

# Show sample chunk in RAG format
print(f"\n📄 Sample Chunk in RAG Format:")
print(json.dumps(chunks_for_rag[0], indent=2, ensure_ascii=False)[:500] + "...")
```

## Section 6: Best Practices for Legal Documents

When working with legal documents like the Mexican Constitution, specific considerations apply to ensure optimal chunking for retrieval and comprehension.

### 6.1 Chunking Strategy Guidelines

#### Chunk Size Selection:

- Small chunks (128-256 tokens): Better for precise retrieval, but may lose context

- Medium chunks (256-512 tokens): Good balance for most RAG applications ✓

- Large chunks (512-1024 tokens): More context, but less precise retrieval

#### Overlap Considerations:

- No overlap: Clean boundaries, no duplication

- Small overlap (32-64 tokens): Helps with context continuity ✓

- Large overlap (128+ tokens): Better for cross-boundary concepts, but more storage

#### Legal Document Specifics:

- Article Boundaries: Try to keep legal articles intact when possible

- Hierarchical Structure: Preserve section/subsection relationships in metadata

- Cross-References: Consider overlap to maintain references to other articles

- Tables and Lists: Keep structured content together in single chunks

#### RAG Pipeline Integration:

```text
# Typical RAG workflow with Docling chunks:
# 1. Convert document
doc = converter.convert("legal_doc.pdf").document

# 2. Chunk with appropriate settings
chunker = HierarchicalChunker(max_tokens=512, overlap_tokens=64)
chunks = list(chunker.chunk(doc))

# 3. Generate embeddings (with your embedding model)
# embeddings = embedding_model.embed([chunk.text for chunk in chunks])

# 4. Store in vector database
# vector_db.insert(chunks, embeddings, metadata)

# 5. Query and retrieve relevant chunks
# results = vector_db.search(query_embedding, top_k=5)
```

#### Performance Tips:

- Use tokenizer="text" for faster processing with simple documents

- Adjust min_tokens to avoid creating tiny, unhelpful chunks

- Test different chunk sizes with your specific retrieval task

- Monitor chunk distribution to ensure even coverage

## Section 7: Chunking Strategy Comparison

Let’s compare different chunking strategies side-by-side to understand their impact on the final output.

````json
### 7.1 Compare Multiple Chunking Strategies

print("=" * 70)
print("CHUNKING STRATEGY COMPARISON")
print("=" * 70)

# Let's compare different chunking strategies for the CPEUM

strategies = [
    {"name": "Small Chunks", "max_tokens": 256, "min_tokens": 32, "overlap": 32},
    {"name": "Medium Chunks", "max_tokens": 512, "min_tokens": 64, "overlap": 64},
    {"name": "Large Chunks", "max_tokens": 1024, "min_tokens": 128, "overlap": 128},
    {"name": "No Overlap", "max_tokens": 512, "min_tokens": 64, "overlap": 0},
]

comparison_results = []

for strategy in strategies:
    chunker = HierarchicalChunker(
        max_tokens=strategy["max_tokens"],
        min_tokens=strategy["min_tokens"],
        overlap_tokens=strategy["overlap"],
        tokenizer="text"
    )

    strategy_chunks = list(chunker.chunk(doc))

    # Calculate statistics
    chunk_lengths = [len(chunk.text) for chunk in strategy_chunks]
    avg_length = sum(chunk_lengths) / len(chunk_lengths) if chunk_lengths else 0

    result = {
        "strategy": strategy["name"],
        "config": f"max:{strategy['max_tokens']}, min:{strategy['min_tokens']}, overlap:{strategy['overlap']}",
        "total_chunks": len(strategy_chunks),
        "avg_chars": int(avg_length),
        "min_chars": min(chunk_lengths) if chunk_lengths else 0,
        "max_chars": max(chunk_lengths) if chunk_lengths else 0,
    }

    comparison_results.append(result)

# Display comparison table
print("\n📊 Chunking Strategy Comparison Results:\n")
print(f"{'Strategy':Let’s explore practical examples of how to integrate Docling chunks into real RAG pipelines with popular vector databases and embedding models.

### 8.1 Integration Example: ChromaDB

```python
# Example: Using Docling chunks with ChromaDB
import chromadb
from chromadb.utils import embedding_functions

# Initialize ChromaDB client
client = chromadb.Client()

# Create or get collection
collection = client.create_collection(
    name="cpeum_legal_docs",
    embedding_function=embedding_functions.SentenceTransformerEmbeddingFunction()
)

# Add chunks to ChromaDB
for i, chunk_data in enumerate(chunks_for_rag):
    collection.add(
        documents=[chunk_data["text"]],
        metadatas=[chunk_data["metadata"]],
        ids=[f"chunk_{i}"]
    )

# Query the collection
results = collection.query(
    query_texts=["¿Cuáles son los derechos humanos en México?"],
    n_results=5
)
````

### 8.2 Integration Example: Pinecone

```python
# Example: Using Docling chunks with Pinecone
import pinecone
from sentence_transformers import SentenceTransformer

# Initialize Pinecone
pinecone.init(api_key="your-api-key", environment="your-environment")
index = pinecone.Index("cpeum-index")

# Initialize embedding model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Embed and upsert chunks
for chunk_data in chunks_for_rag:
    embedding = model.encode(chunk_data["text"]).tolist()
    index.upsert([(
        f"chunk_{chunk_data['chunk_id']}",
        embedding,
        chunk_data["metadata"]
    )])

# Query
query_embedding = model.encode("derechos humanos").tolist()
results = index.query(query_embedding, top_k=5, include_metadata=True)
```

### 8.3 Integration Example: LangChain

```text
# Example: Using Docling chunks with LangChain
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.text_splitter import CharacterTextSplitter
from langchain.docstore.document import Document

# Convert chunks to LangChain Documents
langchain_docs = [
    Document(
        page_content=chunk["text"],
        metadata=chunk["metadata"]
    )
    for chunk in chunks_for_rag
]

# Create vector store
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_documents(
    documents=langchain_docs,
    embedding=embeddings,
    collection_name="cpeum_collection"
)

# Create retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5}
)

# Use in RAG chain
from langchain.chains import RetrievalQA
from langchain.llms import OpenAI

qa_chain = RetrievalQA.from_chain_type(
    llm=OpenAI(),
    retriever=retriever,
    return_source_documents=True
)

# Query
result = qa_chain({"query": "¿Qué dice la constitución sobre los derechos humanos?"})
```

### 8.4 Integration Example: LlamaIndex

```python
# Example: Using Docling chunks with LlamaIndex
from llama_index import VectorStoreIndex, Document
from llama_index.embeddings import OpenAIEmbedding

# Convert chunks to LlamaIndex Documents
llama_docs = [
    Document(
        text=chunk["text"],
        metadata=chunk["metadata"],
        doc_id=f"chunk_{chunk['chunk_id']}"
    )
    for chunk in chunks_for_rag
]

# Create index
index = VectorStoreIndex.from_documents(
    llama_docs,
    embed_model=OpenAIEmbedding()
)

# Query
query_engine = index.as_query_engine(similarity_top_k=5)
response = query_engine.query("¿Cuáles son las garantías individuales?")
```

## Section 9: Summary and Key Takeaways

### What We’ve Covered:

- ✓ Setup and Conversion – Converting documents to Docling format

- ✓ Basic Chunking – Using HierarchicalChunker with default settings

- ✓ Advanced Configuration – Custom parameters (tokens, overlap, tokenizer)

- ✓ Metadata Analysis – Understanding chunk structure and metadata

- ✓ RAG Export – Preparing chunks in JSON format for vector databases

- ✓ Best Practices – Legal document-specific recommendations

- ✓ Strategy Comparison – Side-by-side analysis of different approaches

- ✓ Real-World Integration – Examples with popular RAG frameworks

### Key Parameters:

| Parameter      | Purpose             | Recommended Values                          |
| -------------- | ------------------- | ------------------------------------------- |
| max_tokens     | Maximum chunk size  | 256-512 for general use, 512-1024 for legal |
| min_tokens     | Minimum chunk size  | 32-64 (avoid tiny chunks)                   |
| overlap_tokens | Context continuity  | 32-64 for balance, 0 for efficiency         |
| tokenizer      | Tokenization method | “text” for speed, default for accuracy      |

### Chunking Strategy Decision Tree:

```text
Is precision more important than context?
├─ YES → Use small chunks (256 tokens, 32 overlap)
└─ NO → Use medium/large chunks (512-1024 tokens, 64-128 overlap)

Is storage/cost a concern?
├─ YES → No overlap (overlap_tokens=0)
└─ NO → Use overlap (50-64 tokens)

Do you have structured legal content?
├─ YES → Larger chunks to preserve article boundaries
└─ NO → Standard medium chunks
```

### Next Steps:

- Experiment: Test different chunk sizes with your specific use case

- Measure: Track retrieval accuracy and relevance with different strategies

- Integrate: Connect chunks to your vector database of choice

- Optimize: Monitor performance and adjust parameters accordingly

- Scale: Use batch processing for multiple documents

### Additional Resources:

- Docling Documentation: https://docling-project.github.io/docling/

- Chunking Guide: See examples in the Docling repository

- RAG Best Practices: LangChain and LlamaIndex documentation

- Vector Databases: ChromaDB, Pinecone, Weaviate, Qdrant documentation

- This Project’s Github Repo: https://github.com/cfocoder/Docling-Mexican-Constitution

**Congratulations!** You now have a comprehensive understanding of document chunking with Docling and are ready to build production-grade RAG applications for legal documents and beyond.
