import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUploadCloud, FiFile, FiTrash2, FiPlay, FiCheck, FiLoader } from 'react-icons/fi';
import { documentsAPI, quizzesAPI } from '../utils/api';

const processingSteps = [
    { label: 'Parsing PDF pages...', icon: '📄' },
    { label: 'Chunking content...', icon: '✂️' },
    { label: 'Generating embeddings...', icon: '🧠' },
    { label: 'Extracting topics with AI...', icon: '🔍' },
    { label: 'Ready to learn!', icon: '✅' },
];

export default function Upload() {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [processingStep, setProcessingStep] = useState(-1);
    const [uploadedDoc, setUploadedDoc] = useState(null);
    const [generating, setGenerating] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadDocuments();
    }, []);

    async function loadDocuments() {
        try {
            const docs = await documentsAPI.list();
            setDocuments(docs);
        } catch (err) {
            console.error('Failed to load documents:', err);
        }
    }

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setUploading(true);
        setError(null);
        setProcessingStep(0);

        // Simulate step progression while upload happens
        const stepInterval = setInterval(() => {
            setProcessingStep((prev) => Math.min(prev + 1, 3));
        }, 2000);

        try {
            const result = await documentsAPI.upload(file);
            clearInterval(stepInterval);
            setProcessingStep(4);
            setUploadedDoc(result);
            await loadDocuments();

            setTimeout(() => {
                setUploading(false);
                setProcessingStep(-1);
            }, 1500);
        } catch (err) {
            clearInterval(stepInterval);
            setError(err.message);
            setUploading(false);
            setProcessingStep(-1);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 1,
        disabled: uploading,
    });

    async function handleGenerateQuiz(docId, topic = null) {
        setGenerating(docId);
        try {
            const quiz = await quizzesAPI.generate(docId, topic);
            navigate(`/quiz/${quiz.quiz_id}`);
        } catch (err) {
            setError(err.message);
            setGenerating(null);
        }
    }

    async function handleDelete(docId) {
        try {
            await documentsAPI.delete(docId);
            await loadDocuments();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div className="page">
            <div className="upload-container container">
                <motion.div
                    className="upload-header"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1>📄 Upload Study Material</h1>
                    <p>Drop your lecture PDFs and let AI create quizzes for you</p>
                </motion.div>

                {/* Dropzone / Processing */}
                <AnimatePresence mode="wait">
                    {uploading ? (
                        <motion.div
                            key="processing"
                            className="processing-card glass-card"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
                            <h3>Processing your document...</h3>
                            <div className="processing-steps">
                                {processingSteps.map((step, i) => (
                                    <motion.div
                                        key={i}
                                        className={`processing-step ${i < processingStep ? 'done' : i === processingStep ? 'active' : ''}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                    >
                                        <span className="processing-step-icon">
                                            {i < processingStep ? '✅' : i === processingStep ? (
                                                <span className="spinner" />
                                            ) : '⏳'}
                                        </span>
                                        {step.label}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="dropzone"
                            {...getRootProps()}
                            className={`dropzone glass-card ${isDragActive ? 'active' : ''}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.01 }}
                            transition={{ duration: 0.2 }}
                        >
                            <input {...getInputProps()} />
                            <div className="dropzone-icon">
                                <FiUploadCloud />
                            </div>
                            <h3>
                                {isDragActive ? 'Drop your PDF here!' : 'Drag & drop your PDF'}
                            </h3>
                            <p>
                                or <span className="highlight">click to browse</span> — supports .pdf files
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {error && (
                    <motion.div
                        className="feedback-box feedback-incorrect"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ marginTop: 16 }}
                    >
                        <div className="feedback-title">❌ Error</div>
                        <div className="feedback-text">{error}</div>
                    </motion.div>
                )}

                {/* Documents List */}
                {documents.length > 0 && (
                    <div className="documents-list">
                        <h3 style={{ marginBottom: 16 }}>📚 Your Documents</h3>
                        {documents.map((doc) => (
                            <motion.div
                                key={doc.id}
                                className="doc-card glass-card"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                layout
                            >
                                <div className="doc-info">
                                    <div className="doc-icon">
                                        <FiFile />
                                    </div>
                                    <div>
                                        <div className="doc-name">{doc.filename}</div>
                                        <div className="doc-meta">
                                            {doc.num_pages} pages · {doc.num_chunks} chunks · {doc.status}
                                        </div>
                                        {doc.topics && doc.topics.length > 0 && (
                                            <div className="doc-topics" style={{ marginTop: 6 }}>
                                                {doc.topics.map((topic, i) => (
                                                    <span
                                                        key={i}
                                                        className="topic-tag"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleGenerateQuiz(doc.id, topic);
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                        title={`Generate quiz on "${topic}"`}
                                                    >
                                                        {topic}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="doc-actions">
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleGenerateQuiz(doc.id)}
                                        disabled={doc.status !== 'ready' || generating === doc.id}
                                    >
                                        {generating === doc.id ? (
                                            <><span className="spinner" /> Generating...</>
                                        ) : (
                                            <><FiPlay /> Quiz Me</>
                                        )}
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm btn-icon"
                                        onClick={() => handleDelete(doc.id)}
                                        title="Delete"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {documents.length === 0 && !uploading && (
                    <div className="empty-state" style={{ marginTop: 40 }}>
                        <div className="empty-state-icon">📖</div>
                        <h3>No documents yet</h3>
                        <p>Upload your first PDF to start learning with AI-powered quizzes!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
