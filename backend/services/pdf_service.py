"""
PDF parsing and chunking service for LearnLens
"""
import fitz  # PyMuPDF
from typing import List, Tuple


def parse_pdf(file_bytes: bytes) -> List[Tuple[int, str]]:
    """
    Parse a PDF file and return a list of (page_num, text) tuples.
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text").strip()
        if text:
            pages.append((page_num + 1, text))
    doc.close()
    return pages


def chunk_text(pages: List[Tuple[int, str]], chunk_size: int = 500, overlap: int = 50) -> List[dict]:
    """
    Split extracted pages into overlapping chunks for embedding and quiz generation.
    Returns list of {"text": str, "page_num": int, "chunk_index": int}
    """
    chunks = []
    chunk_index = 0

    for page_num, text in pages:
        words = text.split()
        start = 0
        while start < len(words):
            end = start + chunk_size
            chunk_text_str = " ".join(words[start:end])

            # Skip very short chunks (less than 30 words)
            if len(chunk_text_str.split()) >= 30:
                chunks.append({
                    "text": chunk_text_str,
                    "page_num": page_num,
                    "chunk_index": chunk_index,
                })
                chunk_index += 1

            start += chunk_size - overlap

    return chunks


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Simple full-text extraction from PDF.
    """
    pages = parse_pdf(file_bytes)
    return "\n\n".join([text for _, text in pages])
