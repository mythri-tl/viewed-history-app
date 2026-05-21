const JobsModel = require('../models/jobsModel');
const NotificationsModel = require('../models/notificationsModel');

class JobsController {
  static async createJob(req, res) {
    const { title, description, company, location, salary_range, skills_required } = req.body;

    if (!title || !description || !company || !location) {
      return res.status(400).json({ message: 'Title, description, company, and location are required' });
    }

    try {
      const job = await JobsModel.createJob(
        title,
        description,
        company,
        location,
        salary_range || '',
        skills_required || ''
      );
      const io = req.app.get('io');
      if (io) {
        io.emit('job_created', job);
      }
      res.status(201).json({ message: 'Job posting created successfully', job });
    } catch (error) {
      console.error('Error createJob:', error);
      res.status(500).json({ message: 'Failed to create job posting' });
    }
  }

  static async getJobsFeed(req, res) {
    const userId = req.user.id;
    try {
      const feed = await JobsModel.getJobsFeed(userId);
      res.status(200).json({ feed });
    } catch (error) {
      console.error('Error getJobsFeed:', error);
      res.status(500).json({ message: 'Failed to retrieve jobs feed' });
    }
  }

  static async applyJob(req, res) {
    const userId = req.user.id;
    const { job_id } = req.body;

    if (!job_id) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    try {
      const result = await JobsModel.applyJob(job_id, userId);

      // Find job title/company info to create a detailed notification message
      const jobsFeed = await JobsModel.getJobsFeed(userId);
      const targetJob = jobsFeed.find(j => j.id === Number(job_id));
      const jobTitle = targetJob ? targetJob.title : 'a job';
      const company = targetJob ? targetJob.company : 'Company';

      const notificationMessage = `You successfully applied for the position of "${jobTitle}" at ${company}.`;
      const notification = await NotificationsModel.createNotification(userId, 'job_application', notificationMessage);

      // Emit live socket alert to the user
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${userId}`).emit(`notification-${userId}`, notification);
        io.to(`user_${userId}`).emit('notification_received', notification);
        io.emit('job_application_updated', { jobId: Number(job_id), userId });
      }

      res.status(200).json({ message: 'Application submitted successfully', result });
    } catch (error) {
      console.error('Error applyJob:', error);
      res.status(500).json({ message: 'Failed to submit application' });
    }
  }

  static async saveJob(req, res) {
    const userId = req.user.id;
    const { job_id } = req.body;

    if (!job_id) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    try {
      const savedRow = await JobsModel.getSavedJob(job_id, userId);
      if (savedRow) {
        // Toggle: already saved, so unsave
        const result = await JobsModel.unsaveJob(job_id, userId);
        return res.status(200).json({ message: 'Job unsaved successfully', ...result });
      } else {
        // Toggle: not saved, so save
        const result = await JobsModel.saveJob(job_id, userId);
        return res.status(200).json({ message: 'Job saved successfully', ...result });
      }
    } catch (error) {
      console.error('Error saveJob:', error);
      res.status(500).json({ message: 'Failed to toggle save state on job' });
    }
  }
}

module.exports = JobsController;
