const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: { type: String, required: true },
    matricNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    phone: { type: String, required: true },
    gender: { type: String, required: true },
    profileImage: {
        type: String,
        default: '',
    },
    currentRide: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride',
        default: null,
    },
    isApply: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride',
        default: null,
    },
    rating: {
        type: Number,
        default: 5
    },
    numRatings: {
        type: Number,
        default: 0
    },
});

userSchema.pre('save', async function (next) {
    const user = this;
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
