const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  },
});

const userRoutes = require('./routes/users');
const rideRoutes = require('./routes/rides');
const chatRoutes = require('./routes/chats');
const historyRoutes = require('./routes/histories');
const ticketRoutes = require('./routes/tickets');

app.use(express.json());
app.use(cors());

app.use('/api/users', userRoutes);  
app.use('/api/rides', rideRoutes(io));
app.use('/api/chats', chatRoutes(io));
app.use('/api/histories', historyRoutes(io));
app.use('/api/tickets', ticketRoutes(io));

const PORT = process.env.PORT || 5000;
app.set('io', io);

io.on('connection', (socket) => {
  console.log("a user connected");

  socket.on('joinRide', (rideId) => {
    socket.join(`ride-${rideId}`);
  });

  socket.on('joiningRide', (userId) => {
    socket.join(`user-${userId}`);
  });

  socket.on('disconnect', () => {
  });

});

server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => console.error('Error connecting to MongoDB:', err));
