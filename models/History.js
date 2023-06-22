const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const historySchema = new Schema({
    rideId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rideName: {
        type: String,
        required: true,
    },
    otherUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const History = mongoose.model('History', historySchema);

module.exports = History;
