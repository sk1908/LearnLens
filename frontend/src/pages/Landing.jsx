import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiUpload, FiZap, FiTarget, FiTrendingUp, FiShield, FiCpu } from 'react-icons/fi';

const features = [
    {
        icon: <FiUpload />,
        color: 'purple',
        title: 'Upload Any PDF',
        description: 'Drop your lecture notes, textbooks, or study materials. Our AI parses and understands them instantly.',
    },
    {
        icon: <FiZap />,
        color: 'cyan',
        title: 'AI-Generated Quizzes',
        description: 'Get personalized MCQs and short-answer questions generated from your actual study material.',
    },
    {
        icon: <FiTarget />,
        color: 'emerald',
        title: 'Socratic Hints',
        description: 'Never get stuck. Use 3-level hints that guide your thinking without giving away the answer.',
    },
    {
        icon: <FiTrendingUp />,
        color: 'amber',
        title: 'Mastery Tracking',
        description: 'Track your progress with XP, streaks, and topic mastery. Spaced repetition ensures long-term retention.',
    },
    {
        icon: <FiShield />,
        color: 'rose',
        title: '100% Private',
        description: 'All processing happens locally on your device. Zero cloud uploads, zero data leakage, zero API costs.',
    },
    {
        icon: <FiCpu />,
        color: 'blue',
        title: 'Powered by AMD',
        description: 'Runs entirely on AMD Ryzen hardware with local AI models. Fast, free, and fully offline-capable.',
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.3 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function Landing() {
    return (
        <div className="page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-bg" />
                <motion.div
                    className="hero-content"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                    <motion.div
                        className="hero-badge"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        🚀 AMD Slingshot Hackathon 2026
                    </motion.div>

                    <h1>
                        Turn Your Notes Into
                        <br />
                        <span className="gradient-text">Knowledge That Sticks</span>
                    </h1>

                    <p className="hero-subtitle">
                        Upload any lecture PDF and watch AI transform it into personalized quizzes
                        with Socratic hints, mastery tracking, and spaced repetition — all running
                        locally on your AMD hardware.
                    </p>

                    <div className="hero-actions">
                        <Link to="/upload" className="btn btn-primary btn-lg">
                            <FiUpload /> Upload Your Notes
                        </Link>
                        <Link to="/dashboard" className="btn btn-ghost btn-lg">
                            <FiTrendingUp /> View Dashboard
                        </Link>
                    </div>

                    <motion.div
                        className="hero-stats"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <div className="hero-stat">
                            <div className="hero-stat-value">100%</div>
                            <div className="hero-stat-label">Local & Private</div>
                        </div>
                        <div className="hero-stat">
                            <div className="hero-stat-value">&lt;3s</div>
                            <div className="hero-stat-label">Quiz Generation</div>
                        </div>
                        <div className="hero-stat">
                            <div className="hero-stat-value">$0</div>
                            <div className="hero-stat-label">Zero API Cost</div>
                        </div>
                    </motion.div>
                </motion.div>
            </section>

            {/* Features Section */}
            <section className="features-section container">
                <div className="section-header">
                    <h2>
                        Everything You Need to <span className="gradient-text">Learn Smarter</span>
                    </h2>
                    <p>Powered by local AI — no cloud, no cost, no compromise.</p>
                </div>

                <motion.div
                    className="features-grid"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                >
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            className="feature-card glass-card"
                            variants={itemVariants}
                            whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        >
                            <div className={`feature-icon ${feature.color}`}>
                                {feature.icon}
                            </div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>
        </div>
    );
}
