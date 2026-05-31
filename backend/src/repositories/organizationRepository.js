const BaseRepository = require('./BaseRepository');
const Organization = require('../models/Organization');

class OrganizationRepository extends BaseRepository {
  constructor() {
    super(Organization);
  }

  async findBySlug(slug) {
    return Organization.findOne({ slug, isActive: true });
  }
}

module.exports = new OrganizationRepository();
