const AnalyticsModel = require('../models/analyticsModel');
const InsightsEngine = require('../services/insightsEngine');
const analyticsCache = require('../services/analyticsCache');

const getRange = (req) => (req.query.range === 'month' ? 'month' : 'week');

exports.getTopics = async (req, res) => {
  try {
    const userId = req.user.id;
    const range = getRange(req);
    const cached = analyticsCache.get(userId, 'topics', range);
    if (cached) return res.status(200).json({ range, topics: cached });

    const { current } = await AnalyticsModel.getAnalyticsDataset(userId, range);
    const topics = InsightsEngine.extractTopics(current);
    
    analyticsCache.set(userId, 'topics', topics, range);
    res.status(200).json({ range, topics });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error loading topics analytics' });
  }
};

exports.getTrends = async (req, res) => {
  try {
    const userId = req.user.id;
    const range = getRange(req);
    const cached = analyticsCache.get(userId, 'trends', range);
    if (cached) return res.status(200).json({ range, trends: cached });

    const { current, previous } = await AnalyticsModel.getAnalyticsDataset(userId, range);
    const trends = InsightsEngine.getTrends(current, previous, range);
    
    analyticsCache.set(userId, 'trends', trends, range);
    res.status(200).json({ range, trends });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error loading trends' });
  }
};

exports.getInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    const range = getRange(req);
    const cached = analyticsCache.get(userId, 'insights', range);
    if (cached) return res.status(200).json({ range, insights: cached });

    const { current, previous } = await AnalyticsModel.getAnalyticsDataset(userId, range);
    const topics = InsightsEngine.extractTopics(current);
    const trends = InsightsEngine.getTrends(current, previous, range);
    const insights = InsightsEngine.generateInsights(current, topics, trends, range);
    
    analyticsCache.set(userId, 'insights', insights, range);
    res.status(200).json({ range, insights });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating insights' });
  }
};
