const BaseRepository = require('./BaseRepository');
const User = require('../models/User');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email, includePassword = false) {
    const query = User.findOne({ email: email.toLowerCase() });
    if (includePassword) query.select('+password');
    return query.exec();
  }

  async findByIdWithRefreshTokens(id) {
    return User.findById(id).select('+refreshTokens').exec();
  }

  async findByOrganization(organizationId, options = {}) {
    return this.find({ organizationId, isActive: true }, options);
  }

  async addRefreshToken(userId, tokenData) {
    return User.findByIdAndUpdate(
      userId,
      { $push: { refreshTokens: tokenData } },
      { new: true }
    );
  }

  async revokeRefreshToken(userId, token) {
    return User.findOneAndUpdate(
      { _id: userId, 'refreshTokens.token': token },
      { $set: { 'refreshTokens.$.isRevoked': true } },
      { new: true }
    );
  }

  async cleanExpiredTokens(userId) {
    const now = new Date();
    return User.findByIdAndUpdate(userId, {
      $pull: {
        refreshTokens: { $or: [{ isRevoked: true }, { expiresAt: { $lte: now } }] },
      },
    });
  }
}

module.exports = new UserRepository();
