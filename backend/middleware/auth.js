const { CognitoJwtVerifier } = require('aws-jwt-verify');

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID,
  tokenUse: 'access',
  clientId: process.env.USER_POOL_CLIENT_ID,
});

module.exports = async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'missing bearer token' });
  }

  try {
    const payload = await verifier.verify(token);
    req.ownerId = payload.sub;
    next();
  } catch (err) {
    res.status(401).json({ error: 'invalid or expired token' });
  }
};
