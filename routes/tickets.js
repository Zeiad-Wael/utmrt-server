module.exports = (io) => {
    const express = require('express');
    const Ticket = require('../models/Ticket');
    const mongoose = require('mongoose');
    const router = express.Router();

    router.post('/sellTicket', async (req, res) => {
        const { userId, userName, name, destination, startingPoint, time, phoneNumber, price } = req.body;

        try {

            const ticket = new Ticket({
                userId,
                userName,
                name,
                destination,
                startingPoint,
                time,
                phoneNumber,
                price,
            });

            await ticket.save();

            res.status(201).json({ message: 'Ticket successfully created', ticket: ticket });
        } catch (error) {
            console.error('Error creating ticket:', error);
            res.status(500).json({ message: 'Error creating ticket' });
        }
    });

    router.get('/getTickets', async (req, res) => {
        const { userId } = req.body;

        try {
            const allTickets = await Ticket.find();
            const currentUserTickets = allTickets.filter(ticket => ticket.userId === userId);
            const otherTickets = allTickets.filter(ticket => ticket.userId !== userId);

            currentUserTickets.sort((b, a) => new Date(a.createdAt) - new Date(b.createdAt));
            otherTickets.sort((b, a) => new Date(a.createdAt) - new Date(b.createdAt));

            const sortedTickets = [...currentUserTickets, ...otherTickets];

            res.status(200).json(sortedTickets);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            res.status(500).json({ message: 'Error fetching tickets' });
        }
    });


    router.post('/removeTicket', async (req, res) => {
        const { ticketId } = req.body;

        try {
            await Ticket.deleteOne({ _id: ticketId });

            res.status(200).json({ message: 'Ticket successfully removed.' });
        } catch (error) {
            console.error('Error removing ticket:', error);
            res.status(500).json({ message: 'Error removing ticket' });
        }
    });


    return router;
};
