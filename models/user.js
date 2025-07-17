const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    name: String,
    amount: Number,
    category: String,
    date: {
        type: Date,
        default: Date.now
    }
});

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    expenses: [expenseSchema],
});

module.exports = mongoose.model('User', userSchema);
