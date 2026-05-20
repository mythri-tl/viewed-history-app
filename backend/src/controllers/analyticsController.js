const AnalyticsModel = require('../models/analyticsModel');
const InsightsEngine = require('../services/insightsEngine');
const analyticsCache = require('../services/analyticsCache');

exports.getTopics = async (req, res) => {
  try {
    const userId = req.user.id;
    const cached = analyticsCache.get(userId, 'topics');
    if (cached) return res.status(200).json({ topics: cached });

    const raw = await AnalyticsModel.getViewedPostsRaw(userId);
    const topics = InsightsEngine.extractTopics(raw);
    
    analyticsCache.set(userId, 'topics', topics);
    res.status(200).json({ topics });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error loading topics analytics' });
  }
};

exports.getTrends = async (req, res) => {
  try {
    const userId = req.user.id;
    const cached = analyticsCache.get(userId, 'trends');
    if (cached) return res.status(200).json({ trends: cached });

    const raw = await AnalyticsModel.getViewedPostsRaw(userId);
    const trends = InsightsEngine.getTrends(raw);
    
    analyticsCache.set(userId, 'trends', trends);
    res.status(200).json({ trends });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error loading trends' });
  }
};

exports.getInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    const cached = analyticsCache.get(userId, 'insights');
    if (cached) return res.status(200).json({ insights: cached });

    const raw = await AnalyticsModel.getViewedPostsRaw(userId);
    const topics = InsightsEngine.extractTopics(raw);
    const trends = InsightsEngine.getTrends(raw);
    const insights = InsightsEngine.generateInsights(raw, topics, trends);
    
    analyticsCache.set(userId, 'insights', insights);
    res.status(200).json({ insights });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating insights' });
  }
};
