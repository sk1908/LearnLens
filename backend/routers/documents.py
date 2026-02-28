"""
Documents router — upload, list, and inspect PDF documents
"""
import traceback
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from models.database import get_db, Document, Chunk
from services.pdf_service import parse_pdf, chunk_text
from services.embedding import embed_chunks
from services.llm_service import extract_topics

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a PDF, parse it, chunk it, embed it, and extract topics."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        file_bytes = await file.read()

        # Create document record
        doc = Document(
            filename=file.filename,
            status="processing"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # Parse PDF
        pages = parse_pdf(file_bytes)
        if not pages:
            doc.status = "error"
            db.commit()
            raise HTTPException(status_code=400, detail="Could not extract text from PDF. Ensure it's not scanned/image-based.")

        doc.num_pages = len(pages)

        # Chunk the text
        chunks = chunk_text(pages)
        doc.num_chunks = len(chunks)

        # Save chunks to DB
        for chunk_data in chunks:
            chunk = Chunk(
                document_id=doc.id,
                text=chunk_data["text"],
                page_num=chunk_data["page_num"],
                chunk_index=chunk_data["chunk_index"],
            )
            db.add(chunk)

        # Embed chunks into ChromaDB
        embed_chunks(chunks, doc.id)

        # Extract topics using LLM
        full_text = " ".join([c["text"] for c in chunks[:5]])  # Use first 5 chunks
        topics = extract_topics(full_text)
        doc.topics = topics

        # Assign topics to chunks (simple round-robin for now)
        db_chunks = db.query(Chunk).filter(Chunk.document_id == doc.id).all()
        for i, chunk in enumerate(db_chunks):
            chunk.topic = topics[i % len(topics)] if topics else "General"

        doc.status = "ready"
        db.commit()
        db.refresh(doc)

        return {
            "id": doc.id,
            "filename": doc.filename,
            "num_pages": doc.num_pages,
            "num_chunks": doc.num_chunks,
            "topics": doc.topics,
            "status": doc.status,
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        if doc and doc.id:
            doc.status = "error"
            db.commit()
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")


@router.get("/")
async def list_documents(db: Session = Depends(get_db)):
    """List all uploaded documents."""
    docs = db.query(Document).order_by(Document.upload_date.desc()).all()
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "upload_date": doc.upload_date.isoformat() if doc.upload_date else None,
            "num_pages": doc.num_pages,
            "num_chunks": doc.num_chunks,
            "topics": doc.topics or [],
            "status": doc.status,
        }
        for doc in docs
    ]


@router.get("/{document_id}")
async def get_document(document_id: int, db: Session = Depends(get_db)):
    """Get document details including topics and stats."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": doc.id,
        "filename": doc.filename,
        "upload_date": doc.upload_date.isoformat() if doc.upload_date else None,
        "num_pages": doc.num_pages,
        "num_chunks": doc.num_chunks,
        "topics": doc.topics or [],
        "status": doc.status,
        "quizzes_count": len(doc.quizzes),
    }


@router.delete("/{document_id}")
async def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Delete a document and its associated data."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(doc)
    db.commit()

    # Also clean up ChromaDB collection
    from services.embedding import get_chroma_client
    try:
        client = get_chroma_client()
        client.delete_collection(f"doc_{document_id}")
    except Exception:
        pass

    return {"message": "Document deleted successfully"}
