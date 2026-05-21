const SearchModel = require('../models/searchModel');

const allowedTypes = new Set(['all', 'posts', 'people', 'jobs']);

exports.search = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const requestedType = req.query.type || 'all';
    const type = allowedTypes.has(requestedType) ? requestedType : 'all';
    const limit = req.query.limit || 20;
    const offset = req.query.offset || 0;

    if (!q) {
      return res.status(200).json({
        q,
        type,
        results: {
          posts: [],
          people: [],
          jobs: []
        }
      });
    }

    const results = await SearchModel.search({
      q,
      type,
      limit,
      offset,
      userId: req.user.id
    });

    res.status(200).json({ q, type, results });
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ message: 'Server error while searching' });
  }
};
