class InsightsEngine {
  static extractTopics(viewedPosts) {
    const topicMap = new Map(); // Key: topic, Value: { topic, views, duration, completions }

    viewedPosts.forEach(post => {
      let tags = [];
      if (post.hashtags) {
        tags = post.hashtags.split(/\s+/).map(t => t.replace('#', '').toLowerCase()).filter(t => t.length > 0);
      }
      
      // Fallback keyword search
      if (tags.length === 0) {
        const contentLower = post.content.toLowerCase();
        const keywords = ['react', 'node', 'javascript', 'python', 'sql', 'ai', 'ml', 'database', 'system design', 'cloud', 'devops', 'backend', 'frontend'];
        keywords.forEach(kw => {
          if (contentLower.includes(kw)) {
            tags.push(kw);
          }
        });
      }

      if (tags.length === 0) {
        tags.push('general');
      }

      tags.forEach(tag => {
        const formattedTag = tag.toUpperCase();
        if (!topicMap.has(formattedTag)) {
          topicMap.set(formattedTag, { topic: formattedTag, views: 0, duration: 0, completions: 0 });
        }
        const data = topicMap.get(formattedTag);
        data.views += 1;
        data.duration += post.duration_seconds || 0;
        if (post.completed) data.completions += 1;
      });
    });

    return Array.from(topicMap.values()).sort((a, b) => b.views - a.views);
  }

  static getTrends(viewedPosts) {
    const dailyMap = new Map();
    const peakHours = Array(24).fill(0);
    let totalDuration = 0;
    let totalCompleted = 0;

    viewedPosts.forEach(post => {
      const dateStr = new Date(post.viewed_at).toDateString();
      const hour = new Date(post.viewed_at).getHours();
      
      peakHours[hour] += 1;
      totalDuration += post.duration_seconds || 0;
      if (post.completed) totalCompleted += 1;

      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, { date: dateStr, views: 0, duration: 0 });
      }
      const dayData = dailyMap.get(dateStr);
      dayData.views += 1;
      dayData.duration += post.duration_seconds || 0;
    });

    const completionRate = viewedPosts.length > 0 ? (totalCompleted / viewedPosts.length) * 100 : 0;
    const weeklyTrends = Array.from(dailyMap.values()).slice(0, 7).reverse();

    let peakHour = 0;
    let maxViews = 0;
    peakHours.forEach((views, hr) => {
      if (views > maxViews) {
        maxViews = views;
        peakHour = hr;
      }
    });

    return {
      weeklyTrends,
      completionRate: Math.round(completionRate),
      averageDuration: viewedPosts.length > 0 ? Math.round(totalDuration / viewedPosts.length) : 0,
      peakHour: `${peakHour}:00`
    };
  }

  static generateInsights(viewedPosts, topics, trends) {
    const insights = [];
    
    if (viewedPosts.length === 0) {
      return ["Start viewing professional posts on your home feed to unlock personalized AI insights!"];
    }

    // 1. Most viewed topic
    if (topics.length > 0) {
      const topTopic = topics[0].topic;
      insights.push(`You explored ${topTopic} content frequently this week.`);
    }

    // 2. High completion rate
    if (trends.completionRate > 75) {
      insights.push(`Great focus! You completed ${trends.completionRate}% of technical posts you read.`);
    } else if (trends.completionRate < 30) {
      insights.push(`Tip: You are scanning posts quickly. Try spending more than 10 seconds to fully absorb Backend engineering concepts!`);
    }

    // 3. Peak activity time
    insights.push(`Your peak professional learning hour is around ${trends.peakHour}.`);

    // 4. Revisit / Engaged behavior
    const highDwell = viewedPosts.filter(p => p.duration_seconds > 20).length;
    if (highDwell > 0) {
      insights.push(`Deep learning active: You spent over 20 seconds deep-diving on ${highDwell} engineering articles.`);
    }

    return insights;
  }
}

module.exports = InsightsEngine;
