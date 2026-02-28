import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { FiUpload, FiTrendingUp, FiAward, FiTarget, FiClock } from 'react-icons/fi';
import { progressAPI } from '../utils/api';

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        try {
            const dashData = await progressAPI.dashboard();
            setData(dashData);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <div className="loading-text">Loading your progress...</div>
                </div>
            </div>
        );
    }

    if (!data || (!data.topic_mastery?.length && !data.stats?.total_questions)) {
        return (
            <div className="page">
                <div className="container">
                    <motion.div
                        className="empty-state"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="empty-state-icon">📊</div>
                        <h3>No progress yet!</h3>
                        <p>Upload a PDF and take your first quiz to see your learning analytics.</p>
                        <Link to="/upload" className="btn btn-primary">
                            <FiUpload /> Upload Notes
                        </Link>
                    </motion.div>
                </div>
            </div>
        );
    }

    const { stats, topic_mastery, recent_quizzes, review_queue } = data;

    // Prepare radar chart data
    const radarData = topic_mastery.slice(0, 8).map((t) => ({
        topic: t.topic.length > 15 ? t.topic.substring(0, 15) + '...' : t.topic,
        mastery: t.mastery,
        fullMark: 100,
    }));

    // Prepare bar chart data from recent quizzes
    const barData = recent_quizzes.slice(0, 6).map((q, i) => ({
        name: q.topic?.substring(0, 10) || `Quiz ${i + 1}`,
        score: q.score,
    }));

    const levelProgress = stats.level_progress || 0;

    return (
        <div className="page">
            <div className="dashboard-container container">
                <motion.div
                    className="dashboard-header"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1>📊 Learning Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Track your mastery, streaks, and growth
                    </p>
                </motion.div>

                {/* Stats Overview */}
                <motion.div
                    className="stats-grid"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="stat-card glass-card xp">
                        <div className="stat-value">{stats.xp}</div>
                        <div className="stat-label">⚡ Total XP</div>
                    </div>
                    <div className="stat-card glass-card level">
                        <div className="stat-value">Level {stats.level}</div>
                        <div className="stat-label">🎯 Current Level</div>
                    </div>
                    <div className="stat-card glass-card streak">
                        <div className="stat-value">{stats.streak} 🔥</div>
                        <div className="stat-label">Day Streak</div>
                    </div>
                    <div className="stat-card glass-card accuracy">
                        <div className="stat-value">{stats.accuracy}%</div>
                        <div className="stat-label">✅ Accuracy</div>
                    </div>
                </motion.div>

                {/* Level Progress */}
                <motion.div
                    className="glass-card"
                    style={{ padding: 24, marginBottom: 24 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <h4>Level Progress</h4>
                        <span className="gradient-text" style={{ fontWeight: 700 }}>
                            Level {stats.level} → {stats.level + 1}
                        </span>
                    </div>
                    <div className="level-bar">
                        <motion.div
                            className="level-bar-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${levelProgress * 100}%` }}
                            transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                    <div className="level-labels">
                        <span>{stats.xp_in_level || 0} XP</span>
                        <span>{stats.xp_for_next || 100} XP needed</span>
                    </div>
                </motion.div>

                {/* Main Dashboard Grid */}
                <div className="dashboard-grid">
                    {/* Topic Mastery */}
                    <motion.div
                        className="dashboard-panel glass-card"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="panel-header">
                            <h3>🎯 Topic Mastery</h3>
                        </div>

                        {radarData.length >= 3 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="rgba(148,163,184,0.15)" />
                                    <PolarAngleAxis dataKey="topic" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                                    <Radar
                                        name="Mastery"
                                        dataKey="mastery"
                                        stroke="#8b5cf6"
                                        fill="#8b5cf6"
                                        fillOpacity={0.2}
                                        strokeWidth={2}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : null}

                        <div className="mastery-list" style={{ marginTop: 16 }}>
                            {topic_mastery.map((topic, i) => (
                                <div key={i} className="mastery-item">
                                    <div className="mastery-item-header">
                                        <span className="mastery-topic">{topic.topic}</span>
                                        <span className="mastery-percent">{topic.mastery}%</span>
                                    </div>
                                    <div className="mastery-bar">
                                        <motion.div
                                            className={`mastery-bar-fill ${topic.mastery >= 70 ? 'mastery-high' :
                                                    topic.mastery >= 40 ? 'mastery-mid' : 'mastery-low'
                                                }`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${topic.mastery}%` }}
                                            transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Recent Quizzes & Review */}
                    <motion.div
                        className="dashboard-panel glass-card"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="panel-header">
                            <h3>📋 Recent Quizzes</h3>
                        </div>

                        {barData.length > 0 && (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={barData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#1a1a2e',
                                            border: '1px solid rgba(148,163,184,0.2)',
                                            borderRadius: 8,
                                            color: '#f1f5f9',
                                        }}
                                    />
                                    <Bar dataKey="score" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}

                        {recent_quizzes.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                {recent_quizzes.slice(0, 5).map((quiz, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '10px 0',
                                            borderBottom: '1px solid var(--border-color)',
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                                {quiz.topic || 'General'}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {quiz.answered}/{quiz.total_questions} answered
                                            </div>
                                        </div>
                                        <div style={{
                                            fontWeight: 700,
                                            color: quiz.score >= 70 ? 'var(--accent-emerald)' :
                                                quiz.score >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)',
                                        }}>
                                            {quiz.score}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Review Queue */}
                        {review_queue.length > 0 && (
                            <div style={{ marginTop: 24 }}>
                                <h4 style={{ fontSize: '1rem', marginBottom: 12 }}>🔄 Due for Review</h4>
                                {review_queue.slice(0, 3).map((item, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            padding: '8px 12px',
                                            background: 'var(--bg-glass)',
                                            borderRadius: 'var(--radius-sm)',
                                            marginBottom: 8,
                                            fontSize: '0.85rem',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        {item.question_text.substring(0, 80)}...
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Quick Stats Footer */}
                <motion.div
                    className="glass-card"
                    style={{ padding: 20, marginTop: 24, textAlign: 'center' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        📚 {data.documents_count} documents · 📝 {stats.total_questions} questions answered ·
                        ✅ {stats.total_correct} correct · 🏆 Best streak: {stats.longest_streak} days
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
