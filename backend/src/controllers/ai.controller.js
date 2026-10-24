const aiService = require('../services/ai.service');

async function handleChat(req, res, next) {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'A prompt message is required.' });
    }

    const result = await aiService.processAiChat(prompt, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function handleDashboardSummary(req, res, next) {
  try {
    const { kpis } = req.body;
    if (!kpis) {
      return res.status(400).json({ error: 'KPI payload is required.' });
    }

    const summaryBullets = aiService.summarizeDashboardKpis(kpis, req.user.role);
    res.json({ bullets: summaryBullets, is_ai_generated: true });
  } catch (err) {
    next(err);
  }
}

async function handleSmartLeave(req, res, next) {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text description of leave required.' });
    }

    const parsed = aiService.parseSmartLeave(text);
    res.json({
      prefilled: parsed,
      is_ai_generated: true,
      message: 'Leave details parsed successfully. Please verify and submit.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleChat,
  handleDashboardSummary,
  handleSmartLeave
};
