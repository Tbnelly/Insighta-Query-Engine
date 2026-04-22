// Valid values for validation
const VALID_SORT_FIELDS = ['age', 'created_at', 'gender_probability'];
const VALID_ORDERS = ['asc', 'desc'];
const VALID_GENDERS = ['male', 'female'];
const VALID_AGE_GROUPS = ['child', 'teenager', 'adult', 'senior'];
const MAX_LIMIT = 50;

const buildProfileQuery = (queryParams) => {
  const errors = [];

  const {
    gender,
    age_group,
    country_id,
    min_age,
    max_age,
    min_gender_probability,
    min_country_probability,
    sort_by,
    order,
    page,
    limit,
  } = queryParams;

  // ─── VALIDATION ──────────────────────────────────────────

  if (gender !== undefined && !VALID_GENDERS.includes(gender)) {
    errors.push('gender must be male or female');
  }

  if (age_group !== undefined && !VALID_AGE_GROUPS.includes(age_group)) {
    errors.push('age_group must be child, teenager, adult, or senior');
  }

  if (min_age !== undefined && isNaN(Number(min_age))) {
    errors.push('min_age must be a number');
  }

  if (max_age !== undefined && isNaN(Number(max_age))) {
    errors.push('max_age must be a number');
  }

  if (min_gender_probability !== undefined && isNaN(Number(min_gender_probability))) {
    errors.push('min_gender_probability must be a number');
  }

  if (min_country_probability !== undefined && isNaN(Number(min_country_probability))) {
    errors.push('min_country_probability must be a number');
  }

  if (sort_by !== undefined && !VALID_SORT_FIELDS.includes(sort_by)) {
    errors.push(`sort_by must be one of: ${VALID_SORT_FIELDS.join(', ')}`);
  }

  if (order !== undefined && !VALID_ORDERS.includes(order)) {
    errors.push('order must be asc or desc');
  }

  if (page !== undefined && (isNaN(Number(page)) || Number(page) < 1)) {
    errors.push('page must be a positive number');
  }

  if (limit !== undefined && (isNaN(Number(limit)) || Number(limit) < 1)) {
    errors.push('limit must be a positive number');
  }

  // Return early if validation fails
  if (errors.length > 0) {
    return { errors };
  }

  // ─── FILTER BUILDING ─────────────────────────────────────

  const filter = {};

  if (gender) filter.gender = gender;
  if (age_group) filter.age_group = age_group;
  if (country_id) filter.country_id = country_id.toUpperCase();

  // Age range — both can exist together
  if (min_age !== undefined || max_age !== undefined) {
    filter.age = {};
    if (min_age !== undefined) filter.age.$gte = Number(min_age);
    if (max_age !== undefined) filter.age.$lte = Number(max_age);
  }

  // Probability filters
  if (min_gender_probability !== undefined) {
    filter.gender_probability = { $gte: Number(min_gender_probability) };
  }

  if (min_country_probability !== undefined) {
    filter.country_probability = { $gte: Number(min_country_probability) };
  }

  // ─── SORT BUILDING ───────────────────────────────────────

  const sortField = sort_by || 'created_at';
  const sortOrder = order === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortOrder };

  // ─── PAGINATION ──────────────────────────────────────────

  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  return { filter, sort, skip, limit: parsedLimit, page: parsedPage };
};

module.exports = { buildProfileQuery };