---
title: 'Converting the Mexican Constitution PDF to Markdown with Docling'
description: 'This tutorial demonstrates how to use Docling to convert PDF documents to Markdown, JSON, and other formats. We’ll use the Mexican Constitution (Constitución Política de los Estados Unidos Mexicanos – CPEUM) as our practical case study.'
pubDate: 2025-11-02
heroImage: '/images/2025/11/Docling.png'
heroImageAlt: 'Docling'
categories: ['AI']
tags: []
toc: true
---

This tutorial demonstrates how to use **Docling** to convert PDF documents to Markdown, JSON, and other formats. We’ll use the Mexican Constitution (Constitución Política de los Estados Unidos Mexicanos – CPEUM) as our practical case study.

## What is Docling?

Docling is a powerful Python library for document processing that:

- Converts diverse document formats (PDF, DOCX, XLSX, PPTX, HTML, Markdown, etc.)

- Performs advanced PDF understanding with layout analysis

- Integrates seamlessly with AI/ML pipelines

- Extracts text, tables, and figures with confidence scores

- Supports chunking for RAG (Retrieval-Augmented Generation) applications

### Key Features

- Format Support: 15+ document formats

- Layout Analysis: Identifies document structure (headings, paragraphs, tables, lists)

- OCR Capabilities: Optical Character Recognition for scanned documents

- Table Extraction: Structured extraction of tabular data

- Confidence Scores: Quality metrics for extracted content

- Multimodal Output: Export to Markdown, JSON, HTML, DocTags

## Table of Contents

- What is Docling?

Key Features

- Section 1: Installation and Setup

- Section 2: Basic PDF Conversion – CPEUM

Case Study: Mexican Constitution (CPEUM)

- Section 2.1: Understanding Docling’s Two-Stage Conversion Process

Stage 1: PDF → DoclingDocument Object

- Stage 2: DoclingDocument → Export Formats

- Why Two Stages?

- Section 3: Exporting to Multiple Formats

Understanding export*to*_ vs save*as*_ Methods

- Section 4: Advanced Configuration – Custom PDF Pipeline Options

- Section 5: Extract Specific Content

- Section 6: Batch Processing Multiple Documents

- Section 7: Confidence Scores and Quality Metrics

- Section 9: Practical Use Cases and Best Practices

Common Use Cases for Docling:

- Best Practices:

- Section 10: Quick Reference – Common Operations

Basic Conversion

- Export to Different Formats

- Custom PDF Options

- Batch Processing

- Document Chunking (Basic)

- Check Conversion Status

- Section 11: Summary and Key Takeaways

What We’ve Covered:

- Key Advantages of Docling:

- Next Steps:

- Useful Resources:

## Section 1: Installation and Setup

Before we start, let’s install Docling. The library is available on PyPI and can be installed via pip.

```python
import os
import json
from pathlib import Path
from pprint import pprint

# Installation check - uncomment if needed
# !pip install docling docling-core

print("Dependencies imported successfully!")
```

**Installation Options:**

- Standard: pip install docling (PDF and basic formats)

- With VLM support: Includes Vision Language Models for advanced document understanding

- Full: pip install docling[dev] (includes development tools)

```text
from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions

# Initialize the DocumentConverter with default settings
converter = DocumentConverter()

print("✓ DocumentConverter initialized successfully!")
print(f"✓ Supported input formats: {[fmt.value for fmt in InputFormat]}")
```

## Section 2: Basic PDF Conversion – CPEUM

Now, let’s convert the Mexican Constitution PDF to Markdown. This is a real-world example showing how to:

- Load a PDF document

- Convert it to a structured Docling document

- Export it to different formats

### Case Study: Mexican Constitution (CPEUM)

The Mexican Constitution (CPEUM) is a complex legal document with:

- Formal structure and headings

- Multiple sections and articles

- Legal terminology

- Potential formatting challenges

Let’s see how Docling handles this!

```text
# Define the path to the CPEUM PDF
pdf_path = Path("CPEUM.pdf")

# Verify the file exists
if pdf_path.exists():
    print(f"✓ PDF file found: {pdf_path.name}")
    print(f"  File size: {pdf_path.stat().st_size / (1024*1024):.2f} MB")
else:
    print(f"✗ PDF file not found at {pdf_path}")
    # Show available files
    docs_dir = Path("/mnt/myvolume/ai_chats/ocotrade/Documents/Leyes y Reglamentos")
    if docs_dir.exists():
        print(f"\n  Available files in {docs_dir.name}:")
        for f in docs_dir.glob("*"):
            print(f"    - {f.name}")
```

## Section 2.1: Understanding Docling’s Two-Stage Conversion Process

Docling follows a **two-stage conversion pipeline**:

### Stage 1: PDF → DoclingDocument Object

In this stage, the PDF file is parsed and converted into a rich, structured **DoclingDocument** object that preserves:

- Document hierarchy (sections, headings, paragraphs)

- Block types (text, tables, images, lists)

- Layout information and metadata

- Confidence scores for each element

### Stage 2: DoclingDocument → Export Formats

Once you have the `DoclingDocument` object, you can export it to any desired format (Markdown, JSON, HTML, etc.) without re-parsing the PDF.

### Why Two Stages?

- Efficiency: Parse once, export multiple times—the expensive PDF parsing happens only once

- Flexibility: Analyze, manipulate, or chunk the document before exporting

- Reusability: The same document object can be used for multiple purposes (export, analysis, RAG chunking)

- Quality: Confidence scores and metadata are calculated at the document level

In the cells below, we’ll perform both stages and then demonstrate how to export the resulting document object to different formats.

```text
print("=" * 70)
print("CONVERTING CPEUM PDF TO DOCLING DOCUMENT")
print("=" * 70)

# Convert the PDF to a Docling document
result = converter.convert(str(pdf_path))

print(f"\n✓ Conversion Status: {result.status}")
print(f"✓ Number of pages: {len(result.pages)}")

# Show conversion timings if available
if result.timings:
    total_time = sum(
        timing.duration if hasattr(timing, 'duration') else 0
        for timing in result.timings.values()
    )
    print(f"✓ Total conversion time: {total_time:.2f} seconds")

# Check for any errors
if result.errors:
    print(f"\n⚠ Warnings/Errors ({len(result.errors)}):")
    for error in result.errors[:5]:  # Show first 5 errors
        print(f"  - {error}")
    if len(result.errors) > 5:
        print(f"  ... and {len(result.errors) - 5} more errors")

# Get the converted document
doc = result.document
print(f"\n✓ Document successfully parsed!")
print(f"  - Origin binary hash: {doc.origin.binary_hash}")
print(f"  - File name: {doc.origin.filename}")
```

## Section 3: Exporting to Multiple Formats

Now let’s explore how to export the converted document to different formats. Docling supports multiple serialization formats:

### Understanding export*to*_ vs save*as*_ Methods

- export*to*\* methods (e.g., export_to_markdown(), export_to_dict(), export_to_html()): Return the converted content as a Python object/string for in-memory manipulation before saving or processing further.

- save*as*\* methods (e.g., save_as_markdown(), save_as_json()): Directly write the converted content to a file in one operation—convenient for direct file output.

In the examples below, we’ll use `export_to_*` to get the content, then save it using standard file I/O for better control.

```sql
### 3.1 Export to Markdown

markdown_output = doc.export_to_markdown()

print("=" * 70)
print("EXPORT TO MARKDOWN FORMAT")
print("=" * 70)
print(f"\n✓ Markdown output length: {len(markdown_output):,} characters")
print(f"\n--- First 1000 characters of Markdown output ---\n")
print(markdown_output[:1000])
print("\n... (content truncated) ...")

# Save to file
output_dir = Path("/mnt/myvolume/ai_chats/ocotrade/Exports")
output_dir.mkdir(exist_ok=True)

markdown_path = output_dir / "CPEUM_converted.md"
with open(markdown_path, "w", encoding="utf-8") as f:
    f.write(markdown_output)
print(f"\n✓ Markdown file saved to: {markdown_path}")
```

```sql
### 3.2 Export to JSON (Dictionary Format)

doc_dict = doc.export_to_dict()

print("\n" + "=" * 70)
print("EXPORT TO JSON FORMAT")
print("=" * 70)
print(f"\n✓ JSON export keys: {list(doc_dict.keys())}")
print(f"✓ Document structure: {len(doc_dict.get('body', []))} items")

# Save to JSON file
json_path = output_dir / "CPEUM_converted.json"
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(doc_dict, f, indent=2, ensure_ascii=False)
print(f"\n✓ JSON file saved to: {json_path}")

# Show a sample of the JSON structure
print("\n--- Sample JSON structure (first item) ---")
sample_blocks = doc_dict.get("body", [])
# if sample_blocks:
#     print(json.dumps(sample_blocks[0], indent=2, ensure_ascii=False)[:500])
#     print("... (content truncated) ...")
```

```sql
### 3.3 Export to HTML

html_output = doc.export_to_html()

print("\n" + "=" * 70)
print("EXPORT TO HTML FORMAT")
print("=" * 70)
print(f"\n✓ HTML output length: {len(html_output):,} characters")
print(f"\n--- First 1000 characters of HTML output ---\n")
print(html_output[:1000])
print("\n... (content truncated) ...")

# Save to HTML file
html_path = output_dir / "CPEUM_converted.html"
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_output)
print(f"\n✓ HTML file saved to: {html_path}")
```

## Section 4: Advanced Configuration – Custom PDF Pipeline Options

For documents like the Mexican Constitution with complex layouts, we can customize the conversion pipeline with specific options.

```text
### 4.1 Create a Custom PDF Converter

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions

# Configure custom PDF pipeline options
pdf_options = PdfPipelineOptions(
    do_ocr=False,                    # Disable OCR (CPEUM should have selectable text)
    do_table_structure=True,         # Enable table structure detection
    images_scale=1.0,                # Scale for extracted images
    generate_page_images=False,      # Don't generate page images (saves memory)
)

# Create a custom converter with these options
custom_converter = DocumentConverter(
    format_options={
        InputFormat.PDF: PdfFormatOption(pipeline_options=pdf_options)
    }
)

print("=" * 70)
print("CUSTOM CONVERTER CONFIGURATION")
print("=" * 70)
print("\n✓ Custom PDF Pipeline Options:")
print(f"  - OCR enabled: {pdf_options.do_ocr}")
print(f"  - Table structure detection: {pdf_options.do_table_structure}")
print(f"  - Images scale: {pdf_options.images_scale}")
print(f"  - Generate page images: {pdf_options.generate_page_images}")
print("\n✓ Custom converter initialized!")
```

```python
### 4.2 Analyzing Document Structure

print("\n" + "=" * 70)
print("ANALYZING CPEUM DOCUMENT STRUCTURE")
print("=" * 70)

# Analyze the structure of the converted document
# DoclingDocument uses 'body' directly to access text items
blocks = list(doc.body)

print(f"\n✓ Total items in document: {len(blocks)}")

# Count different block types
from collections import Counter
block_types = Counter()
for block in blocks:
    block_types[type(block).__name__] += 1

print("\n✓ Item type distribution:")
for block_type, count in block_types.most_common():
    print(f"  - {block_type}: {count}")

# Show the first few items
print("\n✓ First 5 items:")
for i, block in enumerate(blocks[:5], 1):
    block_type = type(block).__name__
    print(f"\n  {i}. Type: {block_type}")
    if hasattr(block, 'text'):
        text_preview = block.text[:80] + ("..." if len(block.text) > 80 else "")
        print(f"     Text: {text_preview}")
```

## Section 5: Extract Specific Content

Let’s extract and analyze specific parts of the CPEUM document.

```sql
### 5.1 Extract All Text Content

# Extract all text from the document
all_text = "\n".join([block.text for block in blocks if hasattr(block, 'text')])

print("=" * 70)
print("EXTRACTED TEXT CONTENT")
print("=" * 70)
print(f"\n✓ Total text length: {len(all_text):,} characters")
print(f"✓ Estimated word count: {len(all_text.split()):,} words")
print(f"\n--- First 500 characters ---\n")
print(all_text[:500])

# Save extracted text
text_path = output_dir / "CPEUM_extracted_text.txt"
with open(text_path, "w", encoding="utf-8") as f:
    f.write(all_text)
print(f"\n✓ Extracted text saved to: {text_path}")
```

```text
### 5.2 Extract and Analyze Tables

from docling_core.types.doc import TableItem

# Find all tables in the document
tables = [block for block in blocks if isinstance(block, TableItem)]

print("\n" + "=" * 70)
print("DETECTED TABLES")
print("=" * 70)
print(f"\n✓ Total tables found: {len(tables)}")

if tables:
    for i, table in enumerate(tables[:3], 1):  # Show first 3 tables
        print(f"\n  Table {i}:")
        print(f"    - Rows: {len(table.data.table_cells) if hasattr(table, 'data') and hasattr(table.data, 'table_cells') else 'N/A'}")
        if hasattr(table, 'text'):
            preview = table.text[:100] + ("..." if len(table.text) > 100 else "")
            print(f"    - Content preview: {preview}")
else:
    print("\n  ℹ No tables detected in the CPEUM document.")
```

## Section 6: Batch Processing Multiple Documents

One of Docling’s powerful features is batch processing. Let’s demonstrate how to convert multiple documents efficiently.

```text
### 6.1 Batch Convert Multiple Documents

# Find other documents in the project
text_docs_dir = Path("/mnt/myvolume/ai_chats/ocotrade/Text_Version")

# Get PDF or other document types
source_files = []
if text_docs_dir.exists():
    # Look for text files that might be converted documents
    txt_files = list(text_docs_dir.glob("*.txt"))[:3]  # Limit to first 3
    source_files = [str(f) for f in txt_files]

print("=" * 70)
print("BATCH PROCESSING")
print("=" * 70)

if source_files:
    print(f"\n✓ Found {len(source_files)} documents to process:")
    for f in source_files:
        print(f"  - {Path(f).name}")

    # For demonstration, we'll just show the concept
    print("\n✓ Using convert_all() for batch processing:")
    print("""
    # Batch conversion example:
    results = converter.convert_all(
        source=source_files,
        raises_on_error=False  # Continue even if one file fails
    )

    for result in results:
        if result.status == ConversionStatus.SUCCESS:
            print(f"✓ {result.input.file.name}")
            # Save or process each document
        else:
            print(f"✗ {result.input.file.name}: {result.status}")
    """)
else:
    print("\n✓ Batch processing concept:")
    print("""
    from docling.document_converter import DocumentConverter

    # Initialize converter
    converter = DocumentConverter()

    # Prepare list of files
    files = ["doc1.pdf", "doc2.docx", "doc3.xlsx"]

    # Convert all at once
    results = converter.convert_all(files, raises_on_error=False)

    # Process results
    for result in results:
        doc = result.document
        # Export or analyze each document
        markdown = doc.export_to_markdown()
    """)
```

## Section 7: Confidence Scores and Quality Metrics

Docling provides confidence scores for extracted content, helping you understand the quality of conversions.

After conversion completes, the DoclingDocument object contains confidence scores
calculated during PDF parsing (Stage 1). This section retrieves and analyzes those scores.

Confidence scores measure how reliable/accurate the extracted content is:

- Range: 0.0 to 1.0 (0% to 100%)

- Higher score = higher confidence in the extraction

- Used to: validate quality, identify problematic content, filter for downstream processing

```text
print("=" * 70)
print("CONFIDENCE SCORES ANALYSIS")
print("=" * 70)

# Get confidence report from conversion result
confidence_report = result.confidence

print(f"\n✓ Overall Confidence Report:")
if hasattr(confidence_report, '__dict__'):
    print(f"  - Report structure: {confidence_report.__dict__}")
else:
    print(f"  - Report: {confidence_report}")

# Analyze block-level confidence
blocks_with_confidence = [
    block for block in blocks
    if hasattr(block, 'confidence') and block.confidence is not None
]

print(f"\n✓ Blocks with confidence scores: {len(blocks_with_confidence)}")

if blocks_with_confidence:
    confidences = [block.confidence for block in blocks_with_confidence if block.confidence is not None]
    if confidences:
        avg_confidence = sum(confidences) / len(confidences)
        min_confidence = min(confidences)
        max_confidence = max(confidences)

        print(f"  - Average confidence: {avg_confidence:.3f}")
        print(f"  - Min confidence: {min_confidence:.3f}")
        print(f"  - Max confidence: {max_confidence:.3f}")

# Show conversion timings
print(f"\n✓ Conversion Timings:")
if result.timings:
    for stage, timing in result.timings.items():
        if hasattr(timing, 'duration'):
            print(f"  - {stage}: {timing.duration:.2f}s")
        else:
            print(f"  - {stage}: {timing}")
```

## Section 9: Practical Use Cases and Best Practices

### Common Use Cases for Docling:

- Legal Document Processing (like our CPEUM example)

- Extract articles and sections

- Maintain formatting and structure

- Prepare for legal analysis systems

- Research Paper Extraction

- Convert PDF papers to structured Markdown

- Extract figures and tables for analysis

- Prepare for citation management

- RAG (Retrieval-Augmented Generation)

- Convert documents to chunks for vector embeddings

- Maintain metadata and confidence scores

- Prepare for LLM consumption

- See docling_chunking.ipynb for a dedicated chunking tutorial

- Document Archival

- Convert multiple formats to standardized output

- Preserve document structure

- Enable full-text search

### Best Practices:

- Choose appropriate pipeline options based on document type

- OCR for scanned documents

- Table detection for data-heavy documents

- Handle errors gracefully with raises_on_error=False in batch processing

- Validate output with confidence scores

- Use appropriate export format for your use case

- Markdown for readability

- JSON for structured processing

- HTML for web presentation

- Implement caching for repeated conversions

- Monitor conversion timings for performance optimization

- For chunking and RAG applications

- Use HierarchicalChunker for semantic coherence

- Configure chunk size based on your retrieval needs

- Preserve metadata for better context

- Check out the dedicated chunking tutorial in docling_chunking.ipynb

## Section 10: Quick Reference – Common Operations

### Basic Conversion

```text
from docling.document_converter import DocumentConverter

converter = DocumentConverter()
result = converter.convert("document.pdf")
doc = result.document
```

### Export to Different Formats

```text
# Markdown
markdown_text = doc.export_to_markdown()

# JSON
json_dict = doc.export_to_dict()

# HTML
html_text = doc.export_to_html()

# Save to file
doc.save_as_json("output.json")
doc.save_as_markdown("output.md")
```

### Custom PDF Options

```text
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions

options = PdfPipelineOptions(
    do_ocr=True,
    do_table_structure=True,
    images_scale=2.0
)

converter = DocumentConverter(
    format_options={
        InputFormat.PDF: PdfFormatOption(pipeline_options=options)
    }
)
```

### Batch Processing

```text
files = ["doc1.pdf", "doc2.docx", "doc3.pdf"]
results = converter.convert_all(files, raises_on_error=False)

for result in results:
    if result.status == ConversionStatus.SUCCESS:
        doc = result.document
        # Process document
```

### Document Chunking (Basic)

```text
from docling.chunking import HierarchicalChunker

# Create chunker
chunker = HierarchicalChunker(max_tokens=512, overlap_tokens=50)

# Chunk the document
chunks = list(chunker.chunk(doc))

# For detailed chunking guide, see docling_chunking.ipynb
```

### Check Conversion Status

```text
print(f"Status: {result.status}")
print(f"Errors: {result.errors}")
print(f"Timings: {result.timings}")
print(f"Confidence: {result.confidence}")
```

## Section 11: Summary and Key Takeaways

### What We’ve Covered:

- ✓ Installation and Setup – Getting Docling up and running

- ✓ Basic Conversion – Converting PDFs to DoclingDocument format

- ✓ Export Formats – Saving to Markdown, JSON, and HTML

- ✓ Custom Configuration – Tuning pipeline options for different document types

- ✓ Document Analysis – Examining structure, blocks, and content types

- ✓ Content Extraction – Pulling text, tables, and other elements

- ✓ Batch Processing – Converting multiple documents efficiently

- ✓ Quality Metrics – Understanding confidence scores and conversion timings

- ✓ Best Practices – Real-world recommendations for production use

### Key Advantages of Docling:

- Structured Output: Documents are parsed into semantic blocks, not just raw text

- Multiple Formats: Support for 15+ document types in a single pipeline

- Quality Metrics: Built-in confidence scores for every extracted element

- AI-Ready: Export formats optimized for LLM and RAG applications

- Intelligent Chunking: HierarchicalChunker maintains semantic coherence (see docling_chunking.ipynb)

- Production-Ready: Robust error handling and batch processing capabilities

- Actively Maintained: Regular updates and community support

### Next Steps:

- Explore Advanced Features: Vision Language Models, OCR optimization, formula extraction

- Master Chunking: Check out docling_chunking.ipynb for an in-depth guide on preparing documents for RAG

- Integrate with RAG: Use chunks with vector databases (Pinecone, Weaviate, ChromaDB)

- Build Pipelines: Create document processing workflows with Docling

- Monitor Performance: Track confidence scores and conversion metrics

- Join the Community: Contribute to Docling on GitHub

### Useful Resources:

- Official Documentation: https://docling-project.github.io/docling/

- GitHub Repository: https://github.com/docling-project/docling

- Discord Community: https://docling.ai/discord

- Examples: See examples folder in the repo for more use cases

- Chunking Tutorial: See docling_chunking.ipynb in this workspace for detailed chunking guide

**Thank you for following this tutorial!** We demonstrated real-world document processing using the Mexican Constitution as a practical case study. For chunking and RAG applications, continue with the dedicated `docling_chunking.ipynb` notebook. Now you’re ready to apply Docling to your own document processing projects.
