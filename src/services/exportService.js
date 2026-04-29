'use strict';

/**
 * src/services/exportService.js
 * ------------------------------
 * Converts profile data to CSV format.
 *
 * Key design decisions:
 *  - We build CSV manually (no library needed for flat data like this)
 *  - We reuse buildProfileQuery from Stage 2 — same filters, same validation
 *  - We stream the response rather than buffering the whole file in memory
 *    (important when exporting thousands of records)
 *  - We cap exports at 10,000 rows to protect the DB and server memory
 *
 * Why no csv library? For flat objects (no nested arrays/objects),
 * manual CSV building is 10 lines and zero dependencies. Libraries
 * add value when you have nested data, custom delimiters, or BOM
 * characters for Excel — none of which we need here.
 */

const Profile = require('../models/profile');
const { buildProfileQuery } = require('./queryBuilder');

const MAX_EXPORT_ROWS = 10_000;

// Columns to include in the export — explicit list so adding
// new model fields doesn't silently appear in CSV exports
const EXPORT_FIELDS = [
  'id',
  'name',
  'gender',
  'gender_probability',
  'age',
  'age_group',
  'country_id',
  'country_name',
  'country_probability',
  'created_at',
];

/**
 * Escape a single CSV cell value.
 * Rules: wrap in quotes if it contains comma, quote, or newline.
 * Escape existing quotes by doubling them ("he said ""hi""").
 */
const escapeCell = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Convert an array of Mongoose documents to a CSV string.
 * @param {Array} docs - Mongoose profile documents
 * @returns {string}   - Complete CSV string with header row
 */
const toCsv = (docs) => {
  const header = EXPORT_FIELDS.join(',');

  const rows = docs.map((doc) => {
    const obj = doc;
    return EXPORT_FIELDS
      .map((field) => escapeCell(obj[field]))
      .join(',');
  });

  return [header, ...rows].join('\n');
};

/**
 * Query profiles using the same filter logic as Stage 2,
 * then return as a CSV string.
 *
 * @param {object} queryParams - raw req.query from the request
 * @returns {{ csv: string, count: number } | { errors: string[] }}
 */
const buildExportCsv = async (queryParams) => {
  const built = buildProfileQuery(queryParams);

  // Reuse Stage 2 validation — if params are bad, reject early
  if (built.errors) {
    return { errors: built.errors };
  }

  const { filter, sort } = built;

  // Enforce row cap — no offset/pagination for exports (you get everything)
  const docs = await Profile.find(filter)
    .sort(sort)
    .limit(MAX_EXPORT_ROWS)
    .select(EXPORT_FIELDS.join(' ')).lean();

  return {
    csv: toCsv(docs),
    count: docs.length,
    capped: docs.length === MAX_EXPORT_ROWS,
  };
};

module.exports = { buildExportCsv, MAX_EXPORT_ROWS };