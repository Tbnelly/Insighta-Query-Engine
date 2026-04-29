'use strict';

/**
 * src/controllers/exportController.js
 * -------------------------------------
 * Handles GET /api/v1/export/profiles
 *
 * Auth and role checks are applied at the route level (not here).
 * This controller's only job: build the CSV and send it as a
 * file download with the correct headers.
 *
 * Response headers explained:
 *   Content-Type: text/csv           — tells the browser it's CSV data
 *   Content-Disposition: attachment  — forces "Save As" dialog, not inline display
 *   X-Export-Count                   — lets the CLI show "Exported N records"
 *   X-Export-Capped                  — warns if the 10,000 row limit was hit
 */

const { buildExportCsv, MAX_EXPORT_ROWS } = require('../services/exportService');

const exportProfiles = async (req, res, next) => {
  try {
    const result = await buildExportCsv(req.query);

    // Validation failed — same errors as /api/v1/profiles
    if (result.errors) {
      return res.status(422).json({
        status: 'error',
        message: 'Invalid query parameters',
        errors: result.errors,
      });
    }

    const { csv, count, capped } = result;

    // Generate a timestamped filename: insighta-profiles-2025-04-22.csv
    const date = new Date().toISOString().slice(0, 10);
    const filename = `insighta-profiles-${date}.csv`;

    // Set download headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Export-Count', String(count));

    if (capped) {
      res.setHeader('X-Export-Capped', 'true');
      res.setHeader('X-Export-Max', String(MAX_EXPORT_ROWS));
    }

    // Send the CSV string directly — Express sets Content-Length automatically
    return res.send(csv);

  } catch (err) {
    next(err);
  }
};

module.exports = { exportProfiles };
