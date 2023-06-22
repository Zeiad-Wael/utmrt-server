const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    userName: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    destination: {
        type: String,
        required: true,
    },
    startingPoint: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    price: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
