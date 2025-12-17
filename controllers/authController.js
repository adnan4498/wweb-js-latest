const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone
    });

    // Create token
    const token = user.getSignedJwtToken();

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        credits: user.credits,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Create token
    const token = user.getSignedJwtToken();

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        credits: user.credits,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Logout user and clear WhatsApp session
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Clear WhatsApp session files
    const authPath = path.join(__dirname, '..', '.wwebjs_auth');
    const cachePath = path.join(__dirname, '..', '.wwebjs_cache');

    // Remove auth directory if it exists
    if (fs.existsSync(authPath)) {
      try {
        fs.rmSync(authPath, { recursive: true, force: true });
      } catch (error) {
        console.warn('Could not remove auth directory (may be in use):', error.message);
        // Try to remove individual files
        try {
          const files = fs.readdirSync(authPath);
          files.forEach(file => {
            const filePath = path.join(authPath, file);
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.warn(`Could not remove file ${filePath}:`, err.message);
            }
          });
        } catch (err) {
          console.warn('Could not read auth directory:', err.message);
        }
      }
    }

    // Remove cache directory if it exists
    if (fs.existsSync(cachePath)) {
      try {
        fs.rmSync(cachePath, { recursive: true, force: true });
      } catch (error) {
        console.warn('Could not remove cache directory (may be in use):', error.message);
        // Try to remove individual files
        try {
          const files = fs.readdirSync(cachePath);
          files.forEach(file => {
            const filePath = path.join(cachePath, file);
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.warn(`Could not remove file ${filePath}:`, err.message);
            }
          });
        } catch (err) {
          console.warn('Could not read cache directory:', err.message);
        }
      }
    }

    // Reset global WhatsApp connection status
    global.whatsappConnected = false;

    res.status(200).json({
      success: true,
      message: 'Logged out successfully and WhatsApp session cleared'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully (session files cleared with warnings)'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        credits: user.credits,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        credits: user.credits
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};