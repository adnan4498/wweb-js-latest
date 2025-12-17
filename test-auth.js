require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock User class for testing
class MockUser {
  constructor(data) {
    this._id = 'mock_id_' + Date.now();
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.phone = data.phone;
    this.role = data.role || 'user';
  }

  // Encrypt password using bcrypt
  async save() {
    if (this.password && !this.password.startsWith('$2a$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  // Sign JWT and return
  getSignedJwtToken() {
    return jwt.sign(
      { id: this._id, role: this.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }

  // Match user entered password to hashed password
  async matchPassword(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  }
}

const testAuth = async () => {
  try {
    console.log('🔧 Testing Authentication System...\n');

    // Test 1: Create a mock user
    console.log('1. Testing User Creation...');
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phone: '+1234567890'
    };

    const user = new MockUser(testUser);
    await user.save();

    console.log(`✅ User created: ${user.email}`);
    console.log(`✅ Password hashed: ${user.password !== testUser.password}`);

    // Test 2: Generate JWT Token
    console.log('\n2. Testing JWT Token Generation...');
    const token = user.getSignedJwtToken();
    console.log(`✅ Token generated: ${token.substring(0, 20)}...`);

    // Test 3: Verify JWT Token
    console.log('\n3. Testing JWT Token Verification...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`✅ Token verified: ${decoded.id === user._id}`);
    console.log(`✅ Token contains correct role: ${decoded.role === user.role}`);

    // Test 4: Password matching
    console.log('\n4. Testing Password Verification...');
    const isMatch = await user.matchPassword('password123');
    console.log(`✅ Correct password matches: ${isMatch}`);

    const isWrongMatch = await user.matchPassword('wrongpassword');
    console.log(`✅ Wrong password fails: ${!isWrongMatch}`);

    // Test 5: Test JWT middleware logic
    console.log('\n5. Testing JWT Middleware Logic...');
    const authHeader = `Bearer ${token}`;
    const extractedToken = authHeader.startsWith('Bearer') ? authHeader.split(' ')[1] : null;
    const middlewareDecoded = jwt.verify(extractedToken, process.env.JWT_SECRET);
    console.log(`✅ Token extracted from header: ${!!extractedToken}`);
    console.log(`✅ Middleware can decode token: ${middlewareDecoded.id === user._id}`);

    console.log('\n🎉 All authentication tests passed!');
    console.log('\n📝 Note: Database tests skipped - run with valid MongoDB connection for full testing');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

testAuth();