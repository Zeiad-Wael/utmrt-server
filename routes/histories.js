module.exports = (io) => {
    const express = require('express');
    const History = require('../models/History');
    const User = require('../models/User');
    const Ride = require('../models/Ride');
    const Chat = require('../models/Chat');
    const mongoose = require('mongoose');
    const router = express.Router();

    router.post('/done', async (req, res) => {
        const rideId = req.query.rideId;

        try {
            const ride = await Ride.findById(rideId);
            if (!ride) {
                console.error(rideId);
                res.status(404).json({ success: false, message: 'Ride not found' });
                return;
            }
            
            const users = [ride.userId, ...ride.participants];
            if (ride.participants.length === 0) {
                await User.findByIdAndUpdate(ride.userId, {
                    currentRide: null,
                });
            } else {

                for (const userId of users) {
                    const otherUsers = users.filter((id) => id !== userId);

                    const history = new History({
                        rideId: ride._id,
                        userId: userId,
                        rideName: ride.name,
                        otherUsers: otherUsers,
                        createdAt: new Date(),
                    });

                    await history.save();

                    await User.findByIdAndUpdate(userId, {
                        currentRide: null,
                    });
                }
            }

            io.to(`ride-${rideId}`).emit('doneRide', { users: users });
            await Chat.deleteOne({ rideId: rideId });
            await Ride.findByIdAndRemove(rideId);

            res.status(200).json({ success: true, message: 'Ride marked as done' });
        } catch (error) {
            console.error('Error marking ride as done:', error);
            res.status(500).json({ success: false, message: 'Error marking ride as done' });
        }
    });



    router.get('/getHistory', async (req, res) => {
        try {
            const userId = req.query.userId;

            const userHistory = await History.find({ userId: userId }).select('rideName timestamp otherUsers');

            if (!userHistory || userHistory.length === 0) {
                return res.status(200).json([]);
            }

            const updatedUserHistory = await Promise.all(userHistory.map(async (history) => {
                const otherUsersDetails = await Promise.all(history.otherUsers.map(async (otherUserId) => {
                    const otherUser = await User.findById(otherUserId).select('_id firstName lastName matricNumber');
                    return otherUser;
                }));

                history.otherUsers = otherUsersDetails;
                return history;
            }));

            res.status(200).json({ success: true, history: updatedUserHistory });
        } catch (error) {
            console.error('Error fetching user ride history:', error);
            res.status(500).json({ success: false, message: 'Error fetching user ride history' });
        }
    });

    router.post('/submitRatings', async (req, res) => {
        const { historyId, ratings } = req.body;

        try {
            await Promise.all(
                Object.entries(ratings).map(async ([userId, newRating]) => {
                    const user = await User.findById(userId);

                    const updatedRating =
                        (user.rating * (user.numRatings + 1) + newRating) / (user.numRatings + 1);

                    const roundedRating = parseFloat(updatedRating.toFixed(2));
                    await User.findByIdAndUpdate(
                        userId,
                        {
                            rating: roundedRating,
                            numRatings: user.numRatings + 1,
                        },
                        { new: true, useFindAndModify: false }
                    );
                })
            );

            await History.findByIdAndDelete(historyId);

            res.status(200).json({ success: true, message: 'Ratings submitted successfully' });
        } catch (error) {
            console.error('Error submitting ratings:', error);
            res.status(500).json({ success: false, message: 'Error submitting ratings' });
        }
    });

    return router;
};
