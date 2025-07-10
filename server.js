require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const User = require('./models/user.js');

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ CORS configuration
const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({
    origin: allowedOrigin,
    credentials: true,
}));

// ✅ Env constants
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';
const MONGO_URI = process.env.MONGODB_URI;

// ✅ Connect to MongoDB
mongoose.connect(MONGO_URI, { })
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// ✅ Routes

app.get('/api/test', (req, res) => {
    res.json({ message: 'API working' });
});

// Register
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            password: hashedPassword,
            expenses: [],
        });
        await user.save();
        res.json({ message: 'Registration successful' });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Auth middleware
const auth = async (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id);
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        next();
    } catch (error) {
        console.error('❌ Auth middleware error:', error);
        res.status(401).json({ message: 'Unauthorized' });
    }
};

// Get expenses
app.get('/api/expenses', auth, async (req, res) => {
    res.json(req.user.expenses);
});

// Add expense
app.post('/api/expenses', auth, async (req, res) => {
    const { name, amount, category } = req.body;
    if (!name || !amount || !category) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        req.user.expenses.push({ name, amount, category });
        await req.user.save();
        res.json({ message: 'Expense added' });
    } catch (error) {
        console.error('❌ Add expense error:', error);
        res.status(500).json({ message: 'Server error while adding expense' });
    }
});

// Delete expense
app.delete('/api/expenses/:index', auth, async (req, res) => {
    const index = parseInt(req.params.index);
    try {
        if (index >= 0 && index < req.user.expenses.length) {
            req.user.expenses.splice(index, 1);
            await req.user.save();
            res.json({ message: 'Expense deleted' });
        } else {
            res.status(400).json({ message: 'Invalid index' });
        }
    } catch (error) {
        console.error('❌ Delete expense error:', error);
        res.status(500).json({ message: 'Server error while deleting expense' });
    }
});

// Serve frontend for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
