import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowRight, FiHelpCircle, FiCheck, FiX, FiArrowLeft, FiHome } from 'react-icons/fi';
import confetti from 'canvas-confetti';
import { quizzesAPI } from '../utils/api';

export default function Quiz() {
    const { quizId } = useParams();
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [shortAnswer, setShortAnswer] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [hints, setHints] = useState({});
    const [hintLevel, setHintLevel] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [xpPopup, setXpPopup] = useState(null);
    const [results, setResults] = useState([]);
    const [completed, setCompleted] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadQuiz();
    }, [quizId]);

    async function loadQuiz() {
        try {
            const data = await quizzesAPI.get(parseInt(quizId));
            setQuiz(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }

    const currentQuestion = quiz?.questions?.[currentIndex];
    const progress = quiz ? ((currentIndex) / quiz.questions.length) * 100 : 0;

    async function handleSubmit() {
        if (!currentQuestion || submitting) return;

        const answer = currentQuestion.question_type === 'mcq' ? selectedOption : shortAnswer;
        if (!answer) return;

        setSubmitting(true);

        try {
            const result = await quizzesAPI.answer(currentQuestion.id, answer);
            setFeedback(result);
            setResults([...results, result]);

            // XP animation
            if (result.xp_earned > 0) {
                setXpPopup(result.xp_earned);
                setTimeout(() => setXpPopup(null), 2000);
            }

            // Confetti for correct!
            if (result.is_correct) {
                confetti({
                    particleCount: 80,
                    spread: 60,
                    origin: { y: 0.7 },
                    colors: ['#8b5cf6', '#6366f1', '#10b981', '#fbbf24'],
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    }

    async function requestHint() {
        const nextLevel = hintLevel + 1;
        if (nextLevel > 3) return;

        try {
            const result = await quizzesAPI.hint(currentQuestion.id, nextLevel);
            setHints({ ...hints, [nextLevel]: result.hint_text });
            setHintLevel(nextLevel);
        } catch (err) {
            console.error(err);
        }
    }

    function handleNext() {
        if (currentIndex + 1 >= quiz.questions.length) {
            setCompleted(true);
            // Big confetti for quiz completion
            const totalCorrect = results.filter(r => r.is_correct).length;
            if (totalCorrect / results.length >= 0.7) {
                confetti({
                    particleCount: 200,
                    spread: 120,
                    origin: { y: 0.5 },
                    colors: ['#8b5cf6', '#6366f1', '#10b981', '#fbbf24', '#ec4899'],
                });
            }
            return;
        }

        setCurrentIndex(currentIndex + 1);
        setSelectedOption(null);
        setShortAnswer('');
        setFeedback(null);
        setHints({});
        setHintLevel(0);
    }

    if (loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <div className="loading-text">Loading quiz...</div>
                </div>
            </div>
        );
    }

    if (!quiz || !quiz.questions?.length) {
        return (
            <div className="page">
                <div className="container">
                    <div className="empty-state">
                        <div className="empty-state-icon">🤔</div>
                        <h3>Quiz not found</h3>
                        <p>This quiz doesn't exist or has no questions.</p>
                        <Link to="/upload" className="btn btn-primary">Go to Upload</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (completed) {
        const totalCorrect = results.filter(r => r.is_correct).length;
        const totalXP = results.reduce((sum, r) => sum + (r.xp_earned || 0), 0);
        const scorePercent = Math.round((totalCorrect / results.length) * 100);

        return (
            <div className="page">
                <div className="quiz-container container">
                    <motion.div
                        className="quiz-complete glass-card"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    >
                        <div className="quiz-complete-icon">
                            {scorePercent >= 80 ? '🏆' : scorePercent >= 50 ? '⭐' : '💪'}
                        </div>
                        <h2>Quiz Complete!</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {scorePercent >= 80 ? 'Outstanding performance!' :
                                scorePercent >= 50 ? 'Good effort! Keep practicing!' :
                                    'Every attempt makes you stronger!'}
                        </p>

                        <div className={`quiz-score ${scorePercent >= 80 ? 'high' : scorePercent >= 50 ? 'medium' : 'low'}`}>
                            {scorePercent}%
                        </div>

                        <div className="quiz-complete-stats">
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                                    {totalCorrect}/{results.length}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Correct</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                                    <span className="xp-badge">+{totalXP}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>XP Earned</div>
                            </div>
                        </div>

                        <div className="quiz-complete-actions">
                            <Link to="/upload" className="btn btn-primary">
                                <FiArrowLeft /> Try Another Quiz
                            </Link>
                            <Link to="/dashboard" className="btn btn-secondary">
                                View Dashboard
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="quiz-container container">
                {/* Header */}
                <div className="quiz-header">
                    <div>
                        <h2>{quiz.topic ? `📝 ${quiz.topic}` : '📝 Quiz'}</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {quiz.difficulty} difficulty
                        </p>
                    </div>
                    <div className="quiz-progress">
                        <div className="quiz-progress-bar">
                            <motion.div
                                className="quiz-progress-fill"
                                animate={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="quiz-progress-text">
                            {currentIndex + 1} / {quiz.questions.length}
                        </span>
                    </div>
                </div>

                {/* Question Card */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        className="question-card glass-card"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                    >
                        <span className={`question-type-badge ${currentQuestion.question_type === 'mcq' ? 'badge-mcq' : 'badge-short'}`}>
                            {currentQuestion.question_type === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
                        </span>

                        <div className="question-text">{currentQuestion.question_text}</div>

                        {/* MCQ Options */}
                        {currentQuestion.question_type === 'mcq' && currentQuestion.options && (
                            <div className="options-list">
                                {currentQuestion.options.map((option, i) => {
                                    const letter = String.fromCharCode(65 + i);
                                    let className = 'option-btn';
                                    if (feedback) {
                                        if (option === feedback.correct_answer || option.includes(feedback.correct_answer)) {
                                            className += ' correct';
                                        } else if (selectedOption === option && !feedback.is_correct) {
                                            className += ' incorrect';
                                        }
                                    } else if (selectedOption === option) {
                                        className += ' selected';
                                    }

                                    return (
                                        <motion.button
                                            key={i}
                                            className={className}
                                            onClick={() => !feedback && setSelectedOption(option)}
                                            disabled={!!feedback}
                                            whileTap={!feedback ? { scale: 0.98 } : {}}
                                        >
                                            <span className="option-letter">{letter}</span>
                                            <span>{option}</span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Short Answer */}
                        {currentQuestion.question_type === 'short_answer' && (
                            <input
                                className="short-answer-input"
                                type="text"
                                placeholder="Type your answer..."
                                value={shortAnswer}
                                onChange={(e) => setShortAnswer(e.target.value)}
                                disabled={!!feedback}
                                onKeyDown={(e) => e.key === 'Enter' && !feedback && handleSubmit()}
                            />
                        )}

                        {/* Hints */}
                        {!feedback && (
                            <div className="hints-section">
                                {Object.entries(hints).map(([level, text]) => (
                                    <motion.div
                                        key={level}
                                        className="hint-box"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                    >
                                        <div className="hint-label">💡 Hint {level}</div>
                                        <div className="hint-text">{text}</div>
                                    </motion.div>
                                ))}
                                {hintLevel < 3 && (
                                    <button className="hint-btn" onClick={requestHint}>
                                        <FiHelpCircle />
                                        {hintLevel === 0 ? 'Need a hint?' : `Hint ${hintLevel + 1} of 3`}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Feedback */}
                        <AnimatePresence>
                            {feedback && (
                                <motion.div
                                    className={`feedback-box ${feedback.is_correct ? 'feedback-correct' : 'feedback-incorrect'}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="feedback-title">
                                        {feedback.is_correct ? '✅ Correct!' : '❌ Not quite'}
                                    </div>
                                    <div className="feedback-text">
                                        {feedback.feedback}
                                        {feedback.explanation && (
                                            <div style={{ marginTop: 8, fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                                📖 {feedback.explanation}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Actions */}
                        <div className="question-actions">
                            <div>
                                {hintLevel > 0 && !feedback && (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {3 - hintLevel} hints remaining · XP reduced by {hintLevel * 2}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {!feedback ? (
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSubmit}
                                        disabled={submitting || (!selectedOption && !shortAnswer)}
                                    >
                                        {submitting ? 'Checking...' : 'Submit Answer'}
                                    </button>
                                ) : (
                                    <motion.button
                                        className="btn btn-primary"
                                        onClick={handleNext}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                    >
                                        {currentIndex + 1 >= quiz.questions.length ? 'See Results' : 'Next Question'}
                                        <FiArrowRight />
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* XP popup */}
            <AnimatePresence>
                {xpPopup && (
                    <motion.div
                        className="xp-popup"
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, y: -60, scale: 1.2 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        <div className="xp-amount">+{xpPopup}</div>
                        <div className="xp-label">XP</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
