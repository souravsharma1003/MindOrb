const jwt              = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User             = require('../models/User.model');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const sendToken = (user, statusCode, res) => {
  const token  = signToken(user._id);
  user.password    = undefined;
  user.providerId  = undefined;
  return res.status(statusCode).json({ token, user });
};

// ─── Local: signup ────────────────────────────────────────────────────────────

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: 'Email already in use' });

    const user = await User.create({ name, email, password, provider: 'local' });
    sendToken(user, 201, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Local: login ─────────────────────────────────────────────────────────────

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    sendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Get current user ─────────────────────────────────────────────────────────

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Google OAuth ─────────────────────────────────────────────────────────────
// Frontend (useGoogleLogin with flow:'implicit') sends an access token.
// We verify it by calling Google's userinfo endpoint — Google will reject
// any tampered or expired token, so this is safe server-side verification.
//
// POST /api/auth/google
// Body: { accessToken: string }

exports.googleAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;                           // ← was idToken
    if (!accessToken)
      return res.status(400).json({ message: 'Google access token required' });

    // Call Google's userinfo endpoint to verify the token and get profile
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!googleRes.ok)
      return res.status(401).json({ message: 'Invalid or expired Google token' });

    const { sub, email, name, picture } = await googleRes.json();

    // 1. Try to find by Google ID (returning Google user)
    // 2. Fall back to email (user may have signed up with password before)
    let user = await User.findOne({ provider: 'google', providerId: sub })
            || await User.findOne({ email });

    if (user) {
      // Upgrade existing local account to Google provider
      if (user.provider === 'local') {
        user.provider   = 'google';
        user.providerId = sub;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      }
    } else {
      // Brand new user — create without a password
      user = await User.create({
        name, email,
        provider:   'google',
        providerId:  sub,
        avatar:      picture || '',
      });
    }

    sendToken(user, 200, res);
  } catch (err) {
    console.error('[Google Auth]', err.message);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

// ─── Facebook OAuth ───────────────────────────────────────────────────────────
// Frontend sends the accessToken from the Facebook JS SDK.
// Backend verifies it by calling the Graph API debug_token endpoint —
// never trust the client payload without server-side verification.
//
// POST /api/auth/facebook
// Body: { accessToken: string }

exports.facebookAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken)
      return res.status(400).json({ message: 'Facebook access token required' });

    // Verify the token is real and issued for your app
    const appToken  = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
    const debugRes  = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appToken}`
    );
    const debugData = await debugRes.json();

    if (!debugData.data?.is_valid)
      return res.status(401).json({ message: 'Invalid Facebook token' });

    // Fetch the user's profile
    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );
    const profile = await profileRes.json();
    const { id: fbId, name, email, picture } = profile;
    const avatar = picture?.data?.url || '';

    // 1. Try to find by Facebook ID
    // 2. Fall back to email if available
    let user = await User.findOne({ provider: 'facebook', providerId: fbId });
    if (!user && email) user = await User.findOne({ email });

    if (user) {
      // Upgrade existing local account
      if (user.provider === 'local') {
        user.provider   = 'facebook';
        user.providerId = fbId;
        if (!user.avatar && avatar) user.avatar = avatar;
        await user.save();
      }
    } else {
      // Facebook may not return an email if the user denied the permission.
      // Use a placeholder so the schema's required email field is satisfied.
      const safeEmail = email || `fb_${fbId}@mindorb.noemail`;
      user = await User.create({
        name,
        email:      safeEmail,
        provider:   'facebook',
        providerId:  fbId,
        avatar,
      });
    }

    sendToken(user, 200, res);
  } catch (err) {
    console.error('[Facebook Auth]', err.message);
    res.status(401).json({ message: 'Facebook authentication failed' });
  }
};