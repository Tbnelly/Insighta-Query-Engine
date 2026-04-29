'use strict';

/**
 * GET /api/profiles/export?format=csv
 * TRD: filename = profiles_<timestamp>.csv
 */

const { buildExportCsv } = require('../services/exportService');

const exportProfiles = async (req, res, next) => {
  try {
    if (req.query.format && req.query.format !== 'csv') {
      return res.status(400).json({ status: 'error', message: 'Only format=csv is supported' });
    }

    const result = await buildExportCsv(req.query);

    if (result.errors) {
      return res.status(422).json({ status: 'error', message: 'Invalid query parameters', errors: result.errors });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename  = `profiles_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Export-Count', String(result.count));

    return res.send(result.csv);
  } catch (err) { next(err); }
};

module.exports = { exportProfiles };
