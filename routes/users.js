require('dotenv').config();
const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middlewares/auth');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const router = express.Router();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'your_folder_name',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    },
});

const upload = multer({ storage });

router.post('/register', async (req, res) => {
    const { firstName, lastName, email, password, matricNumber, phone, gender } = req.body;

    try {
        const existingUserByEmail = await User.findOne({ email });

        if (existingUserByEmail) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const existingUserByMatric = await User.findOne({ matricNumber });

        if (existingUserByMatric) {
            return res.status(400).json({ message: 'User with this matric number already exists' });
        }

        const user = new User({ firstName, lastName, email, password, matricNumber, phone, gender });
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

router.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        if (password != user.password) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user._id, name: user.firstName }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        res.status(200).json({
            message: 'User signed in successfully',
            token: token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                password: user.password,
                matricNumber: user.matricNumber,
                phone: user.phone,
                gender: user.gender,
                profileImage: user.profileImage,
                currentRide: user.currentRide,
                isApply: user.isApply,
            },
        });


    } catch (error) {
        console.error('Error signing in:', error);
        res.status(500).json({ message: 'Error signing in' });
    }
});

router.patch('/update', authMiddleware, upload.single('profileImage'), async (req, res) => {
    const { firstName, lastName, phone, password, newPassword } = req.body;
    const profileImage = req.file;
    console.log(req.body);
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (password != user.password) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.phone = phone || user.phone;

        if (profileImage) {
            user.profileImage = profileImage.path;
        }

        if (newPassword) {
            user.password = await bcrypt.hash(newPassword, 10);
        }

        await user.save();

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

router.post('/getUsersByIds', async (req, res) => {
    const { userIds } = req.body;

    if (!userIds || userIds.length === 0) {
        return res.status(400).json({ message: 'User IDs are required.' });
    }

    try {
        const users = await User.find({ _id: { $in: userIds } });

        if (!users) {
            return res.status(404).json({ message: 'No users found with these IDs.' });
        }

        res.status(200).json({
            users: users,
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

module.exports = router;
