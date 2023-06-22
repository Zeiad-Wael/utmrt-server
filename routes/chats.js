module.exports = (io) => {
  const express = require('express');
  const Chat = require('../models/Chat');
  const User = require('../models/User');
  const mongoose = require('mongoose');
  const router = express.Router();

  router.get('/getMessages', async (req, res) => {
    const rideId = req.query.rideId;

    if (!rideId) {
      return res.status(400).json({ message: 'Ride ID is required.' });
    }

    try {
      const chat = await Chat.findOne({ rideId: rideId });

      if (!chat) {
        return res.status(404).json({ message: 'No chat found for this ride ID.' });
      }

      const messages = chat.messages.map((message) => ({
        senderId: message.senderId,
        senderName: message.senderName,
        content: message.content,
        time: message.time,
      }));

      res.status(200).json({ messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Error fetching messages' });
    }
  });

  router.post('/sendMessage', async (req, res) => {
    const { rideId, data } = req.body;

    try {
      let messageData;
      if(data.senderId) {
        const user = await User.findById(data.senderId);
        messageData = {
            senderId: data.senderId,
            senderName: user.firstName + ' ' + user.lastName,
            content: data.content,
            time: new Date(),
        };
      } else {
        messageData = {
            senderId: null,
            senderName: null,
            content: data.content,
            time: new Date(),
        };
      }

      const chat = await Chat.findOneAndUpdate(
        { rideId: rideId },
        { $push: { messages: messageData } },
        { new: true, upsert: true }
      );

      if (!chat) {
        return res.status(404).json({ message: 'Chat not found.' });
      }

      const populatedMessage = chat.messages[chat.messages.length - 1];
      io.to(`ride-${rideId}`).emit('newMessage', populatedMessage);

      res.status(200).json({ message: 'Message sent successfully.' });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Error sending message' });
    }
});



  return router;
};
