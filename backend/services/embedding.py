"""
Embedding service using sentence-transformers + ChromaDB for LearnLens
"""
import chromadb
from sentence_transformers import SentenceTransformer
from typing import List

# Initialize model globally (loaded once)
_model = None
_chroma_client = None


def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def get_chroma_client() -> chromadb.Client:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path="./chroma_db")
    return _chroma_client


def embed_chunks(chunks: List[dict], document_id: int) -> None:
    """
    Embed document chunks and store in ChromaDB.
    Collection name = doc_{document_id}
    """
    model = get_embedding_model()
    client = get_chroma_client()

    collection_name = f"doc_{document_id}"

    # Delete existing collection if re-embedding
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass

    collection = client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )

    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts).tolist()

    collection.add(
        ids=[f"chunk_{i}" for i in range(len(chunks))],
        embeddings=embeddings,
        documents=texts,
        metadatas=[{
            "page_num": c["page_num"],
            "chunk_index": c["chunk_index"],
        } for c in chunks]
    )


def find_relevant_chunks(query: str, document_id: int, top_k: int = 3) -> List[dict]:
    """
    Find the most relevant chunks for a given query using similarity search.
    """
    model = get_embedding_model()
    client = get_chroma_client()

    collection_name = f"doc_{document_id}"
    try:
        collection = client.get_collection(collection_name)
    except Exception:
        return []

    query_embedding = model.encode([query]).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k
    )

    chunks = []
    if results and results["documents"]:
        for i, doc in enumerate(results["documents"][0]):
            chunks.append({
                "text": doc,
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "distance": results["distances"][0][i] if results["distances"] else 0,
            })

    return chunks
