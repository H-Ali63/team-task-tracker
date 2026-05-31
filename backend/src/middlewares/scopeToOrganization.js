/**
 * Ensures that users can only access resources within their own organization.
 * Attaches req.organizationId for downstream use.
 * Must be placed after authenticate middleware.
 */
const scopeToOrganization = (req, res, next) => {
  req.organizationId = req.user.organizationId;
  next();
};

module.exports = scopeToOrganization;
