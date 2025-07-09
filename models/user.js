const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    name: String,
    amount: Number,
    category: String,
});

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    expenses: [ExpenseSchema],
});

module.exports = mongoose.model('User', UserSchema);
