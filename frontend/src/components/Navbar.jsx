import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHome, FiUpload, FiBarChart2 } from 'react-icons/fi';
import { progressAPI } from '../utils/api';

export default function Navbar() {
    const location = useLocation();
    const [stats, setStats] = useState({ xp: 0, streak: 0, level: 1 });

    useEffect(() => {
        progressAPI.stats().then(setStats).catch(() => { });
    }, [location.pathname]);

    const navLinks = [
        { to: '/', icon: <FiHome />, label: 'Home' },
        { to: '/upload', icon: <FiUpload />, label: 'Upload' },
        { to: '/dashboard', icon: <FiBarChart2 />, label: 'Dashboard' },
    ];

    return (
        <motion.nav
            className="navbar"
            initial={{ y: -64 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            <div className="navbar-inner">
                <Link to="/" className="navbar-brand">
                    <span className="navbar-brand-icon">📚</span>
                    <span className="gradient-text">LearnLens</span>
                </Link>

                <ul className="navbar-nav">
                    {navLinks.map((link) => (
                        <li key={link.to}>
                            <Link
                                to={link.to}
                                className={`navbar-link ${location.pathname === link.to ? 'active' : ''}`}
                            >
                                {link.icon}
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="navbar-stats">
                    <div className="navbar-stat">
                        <span className="navbar-stat-icon">⚡</span>
                        <span className="xp-badge">{stats.xp} XP</span>
                    </div>
                    <div className="navbar-stat">
                        <span className="navbar-stat-icon">🔥</span>
                        <span className="streak-badge">{stats.streak}</span>
                    </div>
                    <div className="navbar-stat">
                        <span className="navbar-stat-icon">🎯</span>
                        <span style={{ color: 'var(--accent-purple)' }}>Lv.{stats.level}</span>
                    </div>
                </div>
            </div>
        </motion.nav>
    );
}
