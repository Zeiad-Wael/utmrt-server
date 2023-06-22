module.exports = (io) => {
    const express = require('express');
    const Ride = require('../models/Ride');
    const User = require('../models/User');
    const Chat = require('../models/Chat');
    const mongoose = require('mongoose');
    const router = express.Router();

    router.post('/postRide', async (req, res) => {
        const { userId, userName, name, destination, startingPoint, time, availableSeats } = req.body;
        const type = "Posted Ride";

        try {
            const existingRide = await Ride.findOne({ userId });

            if (existingRide) {
                return res.status(400).json({ message: 'You can only create one ride.' });
            }

            const postRide = new Ride({
                userId,
                userName,
                name,
                destination,
                startingPoint,
                time,
                availableSeats,
                type,
            });

            await postRide.save();
            const newChat = new Chat({ rideId: postRide._id });
            await newChat.save();
            await User.findByIdAndUpdate(userId, { currentRide: postRide._id });

            res.status(201).json({ message: 'Ride successfully created', ride: postRide });
        } catch (error) {
            console.error('Error creating ride:', error);
            res.status(500).json({ message: 'Error creating ride' });
        }
    });

    router.post('/offerRide', async (req, res) => {
        const { userId, userName, name, destination, startingPoint, time, availableSeats, vehicleType } = req.body;
        const type = "Offered Ride";

        try {
            const existingRide = await Ride.findOne({ userId });

            if (existingRide) {
                return res.status(400).json({ message: 'You can only create one ride.' });
            }

            const offerRide = new Ride({
                userId,
                userName,
                name,
                destination,
                startingPoint,
                time,
                availableSeats,
                vehicleType,
                type,
            });

            await offerRide.save();
            const newChat = new Chat({ rideId: offerRide._id });
            await newChat.save();
            await User.findByIdAndUpdate(userId, { currentRide: offerRide._id });

            res.status(201).json({ message: 'Ride successfully created', ride: offerRide });
        } catch (error) {
            console.error('Error creating ride:', error);
            res.status(500).json({ message: 'Error creating ride' });
        }
    });

    router.get('/getRides', async (req, res) => {
        try {
            const rides = await Ride.find();
            const sortedRides = rides.sort((b, a) => new Date(a.createdAt) - new Date(b.createdAt));

            res.status(200).json(sortedRides);
        } catch (error) {
            console.error('Error fetching rides:', error);
            res.status(500).json({ message: 'Error fetching rides' });
        }
    });

    router.get('/getRide', async (req, res) => {
        const rideId = req.query.rideId;

        if (!rideId) {
            return res.status(400).json({ message: 'Ride ID is required.' });
        }

        try {
            const ride = await Ride.findById(rideId).populate('applicants');

            if (!ride) {
                return res.status(404).json({ message: 'No ride found with this ID.' });
            }

            const rideLeader = await User.findById(ride.userId);

            const passengers = await User.find({
                _id: {
                    $in: ride.participants,
                },
            });

            res.status(200).json({
                ride: ride,
                rideLeader: rideLeader,
                passengers: passengers,
                applicants: ride.applicants,
            });
        } catch (error) {
            console.error('Error fetching ride:', error);
            res.status(500).json({ message: 'Error fetching ride' });
        }
    });

    router.post('/apply', async (req, res) => {
        const { rideId, userId } = req.body;

        try {
            const ride = await Ride.findById(rideId);

            if (!ride) {
                return res.status(404).json({ message: 'Ride not found.' });
            }

            if (ride.availableSeats <= 0) {
                return res.status(400).json({ message: 'No seats available for this ride.' });
            }

            if (!ride.applicants.includes(userId)) {
                ride.applicants.push(userId);
                await ride.save();
            }

            const user = await User.findById(userId);
            user.isApply = rideId;
            await user.save();

            io.to(`ride-${rideId}`).emit('newApplicant', { applicantId: userId });
            res.status(200).json({ message: 'Applied successfully.' });
        } catch (error) {
            console.error('Error applying for ride:', error);
            res.status(500).json({ message: 'Error applying for ride' });
        }
    });

    router.post('/cancelApply', async (req, res) => {
        const { rideId, userId } = req.body;

        try {
            const ride = await Ride.findById(rideId);

            if (!ride) {
                return res.status(404).json({ message: 'Ride not found.' });
            }

            if (ride.applicants.includes(userId)) {
                const index = ride.applicants.indexOf(userId);
                ride.applicants.splice(index, 1);
                await ride.save();
            }

            const user = await User.findById(userId);
            user.isApply = null;
            await user.save();

            io.to(`ride-${rideId}`).emit('applicantCanceled', { applicantId: userId });
            res.status(200).json({ message: 'Canceled application Applied successfully.' });
        } catch (error) {
            console.error('Error applying for ride:', error);
            res.status(500).json({ message: 'Error applying for ride' });
        }
    });

    router.post('/accept', async (req, res) => {
        const { rideId, userId } = req.body;

        try {
            const ride = await Ride.findById(rideId);

            if (!ride) {
                return res.status(404).json({ message: 'Ride not found.' });
            }

            if (ride.availableSeats <= 0) {
                return res.status(400).json({ message: 'No seats available for this ride.' });
            }

            if (ride.applicants.includes(userId)) {
                const index = ride.applicants.indexOf(userId);
                ride.applicants.splice(index, 1);
                await ride.save();
            }

            if (!ride.participants.includes(userId)) {
                ride.participants.push(userId);
                ride.availableSeats--;
                await ride.save();
            }

            const user = await User.findById(userId);
            user.isApply = null;
            user.currentRide = rideId;
            await user.save();
            const userName = user.firstName + ' ' + user.lastName;

            io.to(`ride-${rideId}`).emit('applicantAccepted', { applicantId: userId, msg: `${userName} got accepted to the ride.`  });
            res.status(200).json({ message: 'Applicant accepted.', participant: user });
        } catch (error) {
            console.error('Error accepting applicant:', error);
            res.status(500).json({ message: 'Error accepting applicant' });
        }
    });

    router.post('/deny', async (req, res) => {
        const { rideId, userId } = req.body;

        try {
            const ride = await Ride.findById(rideId);

            if (!ride) {
                return res.status(404).json({ message: 'Ride not found.' });
            }

            if (ride.applicants.includes(userId)) {
                const index = ride.applicants.indexOf(userId);
                ride.applicants.splice(index, 1);
                await ride.save();
            }

            const user = await User.findById(userId);
            user.isApply = null;
            await user.save();

            io.to(`ride-${rideId}`).emit('applicantDenied', { applicantId: userId });
            res.status(200).json({ message: 'Applicant denied.' });
        } catch (error) {
            console.error('Error denying applicant:', error);
            res.status(500).json({ message: 'Error denying applicant' });
        }
    });

    router.post('/leave', async (req, res) => {
        const { rideId, userId } = req.body;

        try {
            const ride = await Ride.findById(rideId);

            if (!ride) {
                return res.status(404).json({ message: 'Ride not found.' });
            }

            if (ride.userId.equals(userId)) {
                const usersToUpdate = [userId, ...ride.participants, ...ride.applicants];
                await User.updateMany(
                    { _id: { $in: usersToUpdate } },
                    { $set: { isApply: null, currentRide: null } }
                );
                await Chat.deleteOne({ rideId: rideId });
                await Ride.findByIdAndRemove(rideId);
                io.to(`ride-${rideId}`).emit('rideDisbandedIn');
                for (const participantId of ride.participants) {
                    io.to(`user-${participantId}`).emit('rideDisbanded');
                }
                for (const applicantId of ride.applicants) {
                    io.to(`user-${applicantId}`).emit('rideDisbanded');
                }
                res.status(200).json({ message: 'Ride disbanded successfully.' });
            } else {
                if (ride.participants.includes(userId)) {
                    const index = ride.participants.indexOf(userId);
                    ride.participants.splice(index, 1);
                    ride.availableSeats++;
                    await ride.save();
                }

                const user = await User.findById(userId);
                user.isApply = null;
                user.currentRide = null;
                await user.save();
                const userName = user.firstName + ' ' + user.lastName;

                io.to(`ride-${rideId}`).emit('passengerLeave', { passengerId: userId, msg: `${userName} left the ride.`  });
                res.status(200).json({ message: 'Left ride successfully.' });
            }
        } catch (error) {
            console.error('Error leaving ride:', error);
            res.status(500).json({ message: 'Error leaving ride' });
        }
    });

    router.post('/remove', async (req, res) => {
        const { rideId, userId } = req.body;

        try {
            const ride = await Ride.findById(rideId);
            if (!ride) {
                return res.status(404).json({ message: 'Ride not found' });
            }

            ride.participants = ride.participants.filter(participantId => participantId.toString() !== userId);
            ride.availableSeats++;
            await ride.save();
            const user = await User.findById(userId);
            const userName = user.firstName + ' ' + user.lastName;

            io.to(`ride-${rideId}`).emit('passengerRemoved', { participantId: userId, msg: `${userName} got removed from the ride.` });
            return res.status(200).json({ message: 'Passenger removed successfully' });
        } catch (error) {
            console.error('Error removing passenger:', error);
            return res.status(500).json({ message: 'Error removing passenger' });
        }
    });

    router.post('/pullUp', async (req, res) => {
        const rideId = req.query.rideId;

        try {
            const ride = await Ride.findById(rideId);
            if (!ride) {
                console.error(rideId);
                res.status(404).json({ success: false, message: 'Ride not found' });
                return;
            }

            const now = new Date();
            const tenMinutesAgo = new Date(now.getTime() - 10 * 60000);

            if (ride.createdAt > tenMinutesAgo) {
                const remainingMilliseconds = tenMinutesAgo.getTime() - ride.createdAt.getTime();
                const remainingMinutes = Math.ceil(remainingMilliseconds / -60000);
                res.status(200).json({ success: false, message: `Must wait ${remainingMinutes} minutes for the next pull up` });
                return;
            }

            ride.createdAt = now;
            await ride.save();

            io.to(`ride-${rideId}`).emit('ridePulledUp', { msg: "Leader pulled up the ride" });

            res.status(200).json({ success: true, message: 'Ride pulled up successfully' });
        } catch (error) {
            console.error('Error pulling up ride:', error);
            res.status(500).json({ success: false, message: 'Error pulling up ride' });
        }
    });


    return router;
};
