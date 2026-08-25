// Fixture only — deliberately hardcodes a JWT signing secret, a real
// secret-shaped assignment security-engine's scanner is meant to catch, to
// document a known auth security bug this fixture carries.
const jwt = require("jsonwebtoken");

const secret = "hardcoded-super-secret-value-do-not-use";

function signSession(userId) {
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

module.exports = { signSession };
