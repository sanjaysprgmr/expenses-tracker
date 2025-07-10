require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const User = require('./models/user.js');

const app = express();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGODB_URI;
const FRONTEND_URL = process.env.FRONTEND_URL;

// ✅ Improved CORS Configuration
const allowedOrigins = [
    FRONTEND_URL,
    'http://localhost:5500',
    'http://127.0.0.1:5500'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`❌ Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ MongoDB Connection
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Auth Middleware
const auth = async (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        console.log('❌ Unauthorized: No token provided');
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id);
        if (!req.user) {
            console.log('❌ Unauthorized: User not found');
            return res.status(401).json({ message: 'Unauthorized' });
        }
        next();
    } catch (error) {
        console.error('❌ JWT verification failed:', error.message);
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

// ✅ Routes

// Register
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword, expenses: [] });
        await user.save();
        res.json({ message: 'Registration successful' });
    } catch (error) {
        console.error('❌ Registration error:', error.message);
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
        console.error('❌ Login error:', error.message);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Get Expenses
app.get('/api/expenses', auth, async (req, res) => {
    try {
        res.json(req.user.expenses);
    } catch (error) {
        console.error('❌ Fetch expenses error:', error.message);
        res.status(500).json({ message: 'Server error fetching expenses' });
    }
});

// Add Expense
app.post('/api/expenses', auth, async (req, res) => {
    const { name, amount, category } = req.body;
    try {
        if (!name || !amount || !category) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        req.user.expenses.push({ name, amount, category });
        await req.user.save();
        res.json({ message: 'Expense added' });
    } catch (error) {
        console.error('❌ Add expense error:', error.message);
        res.status(500).json({ message: 'Server error adding expense' });
    }
});

// Delete Expense
app.delete('/api/expenses/:index', auth, async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        if (index >= 0 && index < req.user.expenses.length) {
            req.user.expenses.splice(index, 1);
            await req.user.save();
            res.json({ message: 'Expense deleted' });
        } else {
            res.status(400).json({ message: 'Invalid index' });
        }
    } catch (error) {
        console.error('❌ Delete expense error:', error.message);
        res.status(500).json({ message: 'Server error deleting expense' });
    }
});

// ✅ Serve frontend for SPA routing (optional if using standalone frontend)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});