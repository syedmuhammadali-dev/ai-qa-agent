// Fixture only — deliberately builds SQL via string interpolation to verify detection.
function findUser(db, username) {
  return db.query(`SELECT * FROM users WHERE username = '${username}'`);
}

module.exports = { findUser };
