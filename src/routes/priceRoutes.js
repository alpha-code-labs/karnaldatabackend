const express = require('express');
const router = express.Router();
const { 
  getLatestPrices, 
  getHistoricalTrends, 
  getMonthlyAverages, 
  getPriceRecords,
  getSeasonalPatterns,
  getYearOverYearComparisons,
  getPeriodToPeriodAnalysis,
  getAdvancedAnalytics,
  getHealthCheck 
} = require('../controllers/priceController');

router.get('/latest', getLatestPrices);
router.get('/historical', getHistoricalTrends);
router.get('/monthly', getMonthlyAverages);
router.get('/records', getPriceRecords);
router.get('/seasonal', getSeasonalPatterns);
router.get('/year-over-year', getYearOverYearComparisons);
router.get('/period-analysis', getPeriodToPeriodAnalysis);
router.get('/advanced-analytics', getAdvancedAnalytics);
router.get('/health', getHealthCheck);

module.exports = router;