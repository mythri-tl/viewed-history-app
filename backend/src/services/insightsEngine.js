const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'and', 'are', 'because', 'been', 'being',
  'but', 'can', 'could', 'did', 'does', 'for', 'from', 'has', 'have', 'how',
  'into', 'its', 'just', 'more', 'not', 'now', 'our', 'out', 'over', 'post',
  'that', 'the', 'their', 'this', 'through', 'to', 'use', 'using', 'was',
  'what', 'when', 'where', 'which', 'with', 'you', 'your'
]);

const TOPIC_SYNONYMS = new Map([
  ['backend', 'Backend Engineering'],
  ['backendengineering', 'Backend Engineering'],
  ['node', 'Backend Engineering'],
  ['nodejs', 'Backend Engineering'],
  ['api', 'Backend Engineering'],
  ['database', 'Databases'],
  ['databases', 'Databases'],
  ['postgres', 'Databases'],
  ['postgresql', 'Databases'],
  ['sql', 'Databases'],
  ['frontend', 'Frontend Engineering'],
  ['react', 'Frontend Engineering'],
  ['javascript', 'Frontend Engineering'],
  ['typescript', 'Frontend Engineering'],
  ['ai', 'AI/ML'],
  ['ml', 'AI/ML'],
  ['machinelearning', 'AI/ML'],
  ['agentic', 'AI/ML'],
  ['cloud', 'Cloud/DevOps'],
  ['devops', 'Cloud/DevOps'],
  ['jobs', 'Careers'],
  ['career', 'Careers'],
  ['careers', 'Careers']
]);

const rangeDays = (range) => range === 'month' ? 30 : 7;

const normalizeTopic = (topic) => {
  const compact = topic.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (TOPIC_SYNONYMS.has(compact)) return TOPIC_SYNONYMS.get(compact);

  return topic
    .replace(/[#_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getWeight = (post) => (
  Number(post.duration_seconds || 0)
  + (post.completed ? 10 : 0)
  + (Number(post.resumed_count || 0) * 5)
);

const getMinutes = (seconds) => Math.round((Number(seconds || 0) / 60) * 10) / 10;

const extractHashtagTopics = (hashtags = '') => (
  hashtags
    .split(/[\s,]+/)
    .map(tag => tag.trim().replace(/^#/, ''))
    .filter(tag => tag.length >= 2)
);

const extractKeywordTopics = (content = '') => {
  const counts = new Map();
  const tokens = content
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 3 && !STOP_WORDS.has(token));

  tokens.forEach(token => counts.set(token, (counts.get(token) || 0) + 1));

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([token]) => token);
};

class InsightsEngine {
  static getPostTopics(post) {
    const hashtags = extractHashtagTopics(post.hashtags || '');
    const rawTopics = hashtags.length > 0 ? hashtags : extractKeywordTopics(post.content || '');
    const topics = rawTopics.map(normalizeTopic).filter(Boolean);
    return topics.length > 0 ? Array.from(new Set(topics)) : ['General'];
  }

  static extractTopics(viewedPosts) {
    const topicMap = new Map();

    viewedPosts.forEach(post => {
      const weight = getWeight(post);
      const topics = this.getPostTopics(post);

      topics.forEach(topicName => {
        if (!topicMap.has(topicName)) {
          topicMap.set(topicName, {
            name: topicName,
            topic: topicName,
            score: 0,
            views: 0,
            seconds: 0,
            minutes: 0,
            completions: 0
          });
        }

        const topic = topicMap.get(topicName);
        topic.score += weight;
        topic.views += 1;
        topic.seconds += Number(post.duration_seconds || 0);
        topic.minutes = getMinutes(topic.seconds);
        if (post.completed) topic.completions += 1;
      });
    });

    return Array.from(topicMap.values())
      .map(topic => ({ ...topic, score: Math.round(topic.score) }))
      .sort((a, b) => b.score - a.score || b.views - a.views)
      .slice(0, 8);
  }

  static getTopAuthors(viewedPosts) {
    const authorMap = new Map();

    viewedPosts.forEach(post => {
      const author = post.author_name || 'Unknown author';
      if (!authorMap.has(author)) {
        authorMap.set(author, { name: author, score: 0, views: 0, minutes: 0, seconds: 0 });
      }

      const data = authorMap.get(author);
      data.score += getWeight(post);
      data.views += 1;
      data.seconds += Number(post.duration_seconds || 0);
      data.minutes = getMinutes(data.seconds);
    });

    return Array.from(authorMap.values())
      .map(author => ({ ...author, score: Math.round(author.score) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  static getContentBreakdown(viewedPosts) {
    const textPosts = viewedPosts.filter(post => !post.image_url).length;
    const imagePosts = viewedPosts.length - textPosts;
    return { text: textPosts, image: imagePosts };
  }

  static getTrends(viewedPosts, previousPosts = [], range = 'week') {
    const days = rangeDays(range);
    const now = new Date();
    const dailyMap = new Map();
    const peakHours = Array(24).fill(0);
    let totalDuration = 0;
    let totalCompleted = 0;
    let revisitCount = 0;

    for (let index = days - 1; index >= 0; index -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - index);
      const key = date.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, views: 0, duration: 0, minutes: 0 });
    }

    viewedPosts.forEach(post => {
      const viewedAt = new Date(post.viewed_at);
      const dateKey = viewedAt.toISOString().slice(0, 10);
      const hour = viewedAt.getHours();

      peakHours[hour] += 1;
      totalDuration += Number(post.duration_seconds || 0);
      revisitCount += Number(post.resumed_count || 0);
      if (post.completed) totalCompleted += 1;

      if (dailyMap.has(dateKey)) {
        const day = dailyMap.get(dateKey);
        day.views += 1;
        day.duration += Number(post.duration_seconds || 0);
        day.minutes = getMinutes(day.duration);
      }
    });

    const previousDuration = previousPosts.reduce((sum, post) => sum + Number(post.duration_seconds || 0), 0);
    const deltaPercent = previousDuration > 0
      ? Math.round(((totalDuration - previousDuration) / previousDuration) * 100)
      : totalDuration > 0
        ? 100
        : 0;

    const completionRate = viewedPosts.length > 0 ? Math.round((totalCompleted / viewedPosts.length) * 100) : 0;
    const daily = Array.from(dailyMap.values());
    const dailyMinutes = daily.map(day => day.minutes);

    let peakHour = 0;
    let maxViews = 0;
    peakHours.forEach((views, hour) => {
      if (views > maxViews) {
        maxViews = views;
        peakHour = hour;
      }
    });

    return {
      dailyMinutes,
      weeklyTrends: daily,
      deltaPercent,
      completionRate,
      averageDuration: viewedPosts.length > 0 ? Math.round(totalDuration / viewedPosts.length) : 0,
      peakHour: `${peakHour}:00`,
      totalMinutes: getMinutes(totalDuration),
      totalViews: viewedPosts.length,
      revisitCount,
      contentBreakdown: this.getContentBreakdown(viewedPosts),
      topAuthors: this.getTopAuthors(viewedPosts)
    };
  }

  static generateInsights(viewedPosts, topics, trends, range = 'week') {
    if (viewedPosts.length === 0) {
      return [`View posts on your feed to unlock personalized ${range} learning insights.`];
    }

    const insights = [];
    const rangeLabel = range === 'month' ? 'this month' : 'this week';
    const topTopic = topics[0];

    if (topTopic) {
      insights.push(`You spent ${topTopic.minutes} minutes on ${topTopic.name} ${rangeLabel}.`);
    }

    if (trends.deltaPercent > 0) {
      insights.push(`Your content consumption increased by ${trends.deltaPercent}% vs the previous ${range}.`);
    } else if (trends.deltaPercent < 0) {
      insights.push(`Your content consumption is ${Math.abs(trends.deltaPercent)}% lower than the previous ${range}.`);
    } else {
      insights.push(`Your content consumption is steady compared with the previous ${range}.`);
    }

    if (trends.revisitCount > 0) {
      insights.push(`You revisited ${trends.revisitCount} posts - consider saving the most useful ones for later.`);
    }

    if (trends.completionRate >= 75) {
      insights.push(`Strong focus: you completed ${trends.completionRate}% of viewed posts.`);
    } else if (trends.completionRate > 0 && trends.completionRate < 35) {
      insights.push(`You are scanning more than completing; try spending a little longer on high-value posts.`);
    }

    const topAuthor = trends.topAuthors?.[0];
    if (topAuthor) {
      insights.push(`${topAuthor.name} is your most-read author ${rangeLabel}.`);
    }

    return insights.slice(0, 5);
  }
}

module.exports = InsightsEngine;
