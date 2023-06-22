const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  senderName: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    default: Date.now,
  },
});

const chatSchema = new Schema({
  rideId: {
    type: Schema.Types.ObjectId,
    ref: 'Ride',
    required: true,
  },
  messages: [messageSchema],
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
