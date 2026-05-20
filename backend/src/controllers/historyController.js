const historyCacheService = require('../services/historyCacheService');
const HistoryModel = require('../models/historyModel');
const viewTrackerService = require('../services/viewTrackerService');
const analyticsCache = require('../services/analyticsCache');

exports.markViewed = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId, duration_seconds = 0, completed = false } = req.body;

    if (!postId) return res.status(400).json({ message: 'postId is required' });

    // Privacy Check
    const settings = await HistoryModel.getSettings(userId);
    if (settings.is_paused || settings.private_mode) {
      return res.status(200).json({ message: 'Tracking skipped (Privacy Mode / Paused)' });
    }

    if (duration_seconds < settings.min_duration_seconds && !completed) {
       return res.status(200).json({ message: `View ignored (under custom threshold of ${settings.min_duration_seconds}s)` });
    }

    viewTrackerService.trackView(userId, postId, duration_seconds, completed);
    
    // Invalidate caches so frontend sees fresh results instantly
    historyCacheService.invalidateUserCache(userId);
    analyticsCache.invalidate(userId);

    res.status(200).json({ message: 'View tracked successfully' });
  } catch (error) {
    console.error('History mark error:', error);
    res.status(500).json({ message: 'Server error marking history' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const filters = {
      q: req.query.q,
      author: req.query.author,
      completed: req.query.completed ? req.query.completed === 'true' : undefined,
      minDuration: req.query.minDuration ? parseInt(req.query.minDuration) : undefined,
      dateRange: req.query.dateRange // 'today', 'week', etc.
    };

    const history = await historyCacheService.getCachedHistory(userId, filters, page, limit);
    res.status(200).json({ history });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching history' });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    await HistoryModel.clearHistory(userId);
    
    // Invalidate caches completely on clear
    historyCacheService.invalidateUserCache(userId);
    analyticsCache.invalidate(userId);
    
    res.status(200).json({ message: 'History cleared completely' });
  } catch (error) {
    res.status(500).json({ message: 'Server error clearing history' });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = await HistoryModel.getSettings(userId);
    res.status(200).json({ settings });
  } catch (error) {
    console.error('Failed to get settings:', error);
    res.status(500).json({ message: 'Server error retrieving settings' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { is_paused, private_mode, auto_delete_days, min_duration_seconds, min_visibility_pct, filter_read_posts } = req.body;
    
    const settings = await HistoryModel.updateSettings(userId, { 
      is_paused, 
      private_mode, 
      auto_delete_days,
      min_duration_seconds,
      min_visibility_pct,
      filter_read_posts
    });
    res.status(200).json({ message: 'Settings updated', settings });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating settings' });
  }
};
