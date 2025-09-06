const dataService = require('../services/dataService');

const getLatestPrices = (req, res) => {
  try {
    const { commodity } = req.query;

    if (!commodity) {
      return res.status(400).json({
        error: 'Commodity parameter is required',
        message: 'Please specify commodity (onion or potato)'
      });
    }

    if (!['onion', 'potato'].includes(commodity.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid commodity',
        message: 'Commodity must be either onion or potato'
      });
    }

    const latestPrices = dataService.getLatestPrices(commodity);

    if (!latestPrices) {
      return res.status(404).json({
        error: 'No data found',
        message: `No price data available for ${commodity}`
      });
    }

    res.json({
      success: true,
      data: latestPrices
    });

  } catch (error) {
    console.error('Error fetching latest prices:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch latest prices'
    });
  }
};

const getHistoricalTrends = (req, res) => {
  try {
    const { commodity, startDate, endDate, grade } = req.query;

    if (!commodity) {
      return res.status(400).json({
        error: 'Commodity parameter is required',
        message: 'Please specify commodity (onion or potato)'
      });
    }

    if (!['onion', 'potato'].includes(commodity.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid commodity',
        message: 'Commodity must be either onion or potato'
      });
    }

    // Default to last 3 years if no dates provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setFullYear(defaultEndDate.getFullYear() - 3);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;

    const historicalData = dataService.getDataByDateRange(
      commodity,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
      grade
    );

    if (historicalData.length === 0) {
      return res.status(404).json({
        error: 'No data found',
        message: `No historical data available for ${commodity} in the specified date range`
      });
    }

    // Group by grade if no specific grade requested
    let processedData;
    if (grade) {
      processedData = {
        commodity: commodity.toLowerCase(),
        grade: grade,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        dataPoints: historicalData.length,
        trends: historicalData.map(record => ({
          date: record.date,
          minPrice: record.minPrice,
          maxPrice: record.maxPrice,
          modalPrice: record.modalPrice
        }))
      };
    } else {
      // Group by grade
      const groupedData = {};
      historicalData.forEach(record => {
        if (!groupedData[record.grade]) {
          groupedData[record.grade] = [];
        }
        groupedData[record.grade].push({
          date: record.date,
          minPrice: record.minPrice,
          maxPrice: record.maxPrice,
          modalPrice: record.modalPrice
        });
      });

      processedData = {
        commodity: commodity.toLowerCase(),
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        totalDataPoints: historicalData.length,
        trends: groupedData
      };
    }

    res.json({
      success: true,
      data: processedData
    });

  } catch (error) {
    console.error('Error fetching historical trends:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch historical trends'
    });
  }
};

const getMonthlyAverages = (req, res) => {
  try {
    const { commodity, startDate, endDate, grade } = req.query;

    if (!commodity) {
      return res.status(400).json({
        error: 'Commodity parameter is required',
        message: 'Please specify commodity (onion or potato)'
      });
    }

    if (!['onion', 'potato'].includes(commodity.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid commodity',
        message: 'Commodity must be either onion or potato'
      });
    }

    // Default to last 2 years if no dates provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setFullYear(defaultEndDate.getFullYear() - 2);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;

    const historicalData = dataService.getDataByDateRange(
      commodity,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
      grade
    );

    if (historicalData.length === 0) {
      return res.status(404).json({
        error: 'No data found',
        message: `No data available for ${commodity} in the specified date range`
      });
    }

    // Group data by month and calculate averages
    const monthlyData = {};

    historicalData.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const gradeKey = grade || record.grade;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {};
      }

      if (!monthlyData[monthKey][gradeKey]) {
        monthlyData[monthKey][gradeKey] = {
          prices: [],
          minPrices: [],
          maxPrices: [],
          modalPrices: []
        };
      }

      monthlyData[monthKey][gradeKey].prices.push(record.modalPrice);
      monthlyData[monthKey][gradeKey].minPrices.push(record.minPrice);
      monthlyData[monthKey][gradeKey].maxPrices.push(record.maxPrice);
      monthlyData[monthKey][gradeKey].modalPrices.push(record.modalPrice);
    });

    // Calculate monthly averages
    const monthlyAverages = Object.keys(monthlyData).sort().map(monthKey => {
      const [year, month] = monthKey.split('-');
      const monthData = monthlyData[monthKey];
      
      const result = {
        month: monthKey,
        year: parseInt(year),
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
        fullDate: new Date(year, month - 1),
        grades: {}
      };

      Object.keys(monthData).forEach(gradeKey => {
        const gradeData = monthData[gradeKey];
        const avgModal = gradeData.modalPrices.reduce((sum, price) => sum + price, 0) / gradeData.modalPrices.length;
        const avgMin = gradeData.minPrices.reduce((sum, price) => sum + price, 0) / gradeData.minPrices.length;
        const avgMax = gradeData.maxPrices.reduce((sum, price) => sum + price, 0) / gradeData.maxPrices.length;

        result.grades[gradeKey] = {
          averageModalPrice: Math.round(avgModal * 100) / 100,
          averageMinPrice: Math.round(avgMin * 100) / 100,
          averageMaxPrice: Math.round(avgMax * 100) / 100,
          dataPoints: gradeData.modalPrices.length,
          priceRange: Math.round((avgMax - avgMin) * 100) / 100
        };
      });

      return result;
    });

    // Calculate month-over-month changes
    const enhancedData = monthlyAverages.map((current, index) => {
      if (index === 0) return { ...current, changes: {} };

      const previous = monthlyAverages[index - 1];
      const changes = {};

      Object.keys(current.grades).forEach(gradeKey => {
        if (previous.grades[gradeKey]) {
          const currentPrice = current.grades[gradeKey].averageModalPrice;
          const previousPrice = previous.grades[gradeKey].averageModalPrice;
          const change = currentPrice - previousPrice;
          const changePercent = (change / previousPrice) * 100;

          changes[gradeKey] = {
            absoluteChange: Math.round(change * 100) / 100,
            percentChange: Math.round(changePercent * 100) / 100
          };
        }
      });

      return { ...current, changes };
    });

    res.json({
      success: true,
      data: {
        commodity: commodity.toLowerCase(),
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        totalMonths: enhancedData.length,
        totalDataPoints: historicalData.length,
        monthlyAverages: enhancedData
      }
    });

  } catch (error) {
    console.error('Error calculating monthly averages:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to calculate monthly averages'
    });
  }
};



const getPriceRecords = (req, res) => {
  try {
    const { commodity, startDate, endDate, grade } = req.query;

    if (!commodity) {
      return res.status(400).json({
        error: 'Commodity parameter is required',
        message: 'Please specify commodity (onion or potato)'
      });
    }

    if (!['onion', 'potato'].includes(commodity.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid commodity',
        message: 'Commodity must be either onion or potato'
      });
    }

    // Default to all available data if no dates provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date('2022-01-01');

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;

    const historicalData = dataService.getDataByDateRange(
      commodity,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
      grade
    );

    if (historicalData.length === 0) {
      return res.status(404).json({
        error: 'No data found',
        message: `No data available for ${commodity} in the specified date range`
      });
    }

    // Group by grade for analysis
    const gradeData = {};
    historicalData.forEach(record => {
      const gradeKey = grade || record.grade;
      if (!gradeData[gradeKey]) {
        gradeData[gradeKey] = [];
      }
      gradeData[gradeKey].push(record);
    });

    const records = {};

    Object.keys(gradeData).forEach(gradeKey => {
      const data = gradeData[gradeKey];
      
      // Find all-time records
      const modalPrices = data.map(d => ({ ...d, priceType: 'modal', price: d.modalPrice }));
      const minPrices = data.map(d => ({ ...d, priceType: 'min', price: d.minPrice }));
      const maxPrices = data.map(d => ({ ...d, priceType: 'max', price: d.maxPrice }));
      
      const allPrices = [...modalPrices, ...minPrices, ...maxPrices];
      
      // All-time records
      const highestOverall = allPrices.reduce((max, record) => 
        record.price > max.price ? record : max
      );
      const lowestOverall = allPrices.reduce((min, record) => 
        record.price < min.price ? record : min
      );

      // Modal price records
      const highestModal = modalPrices.reduce((max, record) => 
        record.modalPrice > max.modalPrice ? record : max
      );
      const lowestModal = modalPrices.reduce((min, record) => 
        record.modalPrice < min.modalPrice ? record : min
      );

      // Find largest single-day changes
      const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
      const dayChanges = [];
      
      for (let i = 1; i < sortedData.length; i++) {
        const current = sortedData[i];
        const previous = sortedData[i - 1];
        const change = current.modalPrice - previous.modalPrice;
        const percentChange = (change / previous.modalPrice) * 100;
        
        dayChanges.push({
          date: current.date,
          previousDate: previous.date,
          currentPrice: current.modalPrice,
          previousPrice: previous.modalPrice,
          absoluteChange: Math.round(change * 100) / 100,
          percentChange: Math.round(percentChange * 100) / 100,
          record: current
        });
      }

      // Sort by absolute change and percentage change
      const largestIncreases = dayChanges
        .filter(change => change.absoluteChange > 0)
        .sort((a, b) => b.absoluteChange - a.absoluteChange)
        .slice(0, 10);

      const largestDecreases = dayChanges
        .filter(change => change.absoluteChange < 0)
        .sort((a, b) => a.absoluteChange - b.absoluteChange)
        .slice(0, 10);

      const largestPercentIncreases = dayChanges
        .filter(change => change.percentChange > 0)
        .sort((a, b) => b.percentChange - a.percentChange)
        .slice(0, 10);

      const largestPercentDecreases = dayChanges
        .filter(change => change.percentChange < 0)
        .sort((a, b) => a.percentChange - b.percentChange)
        .slice(0, 10);

      // Find periods of sustained high/low prices
      const avgPrice = data.reduce((sum, record) => sum + record.modalPrice, 0) / data.length;
      const threshold = avgPrice * 0.2; // 20% above/below average

      const highPeriods = [];
      const lowPeriods = [];
      let currentHighPeriod = null;
      let currentLowPeriod = null;

      data.forEach(record => {
        // High periods
        if (record.modalPrice > avgPrice + threshold) {
          if (!currentHighPeriod) {
            currentHighPeriod = {
              startDate: record.date,
              endDate: record.date,
              startPrice: record.modalPrice,
              endPrice: record.modalPrice,
              peakPrice: record.modalPrice,
              peakDate: record.date,
              duration: 1
            };
          } else {
            currentHighPeriod.endDate = record.date;
            currentHighPeriod.endPrice = record.modalPrice;
            currentHighPeriod.duration++;
            if (record.modalPrice > currentHighPeriod.peakPrice) {
              currentHighPeriod.peakPrice = record.modalPrice;
              currentHighPeriod.peakDate = record.date;
            }
          }
        } else {
          if (currentHighPeriod && currentHighPeriod.duration >= 3) {
            highPeriods.push(currentHighPeriod);
          }
          currentHighPeriod = null;
        }

        // Low periods
        if (record.modalPrice < avgPrice - threshold) {
          if (!currentLowPeriod) {
            currentLowPeriod = {
              startDate: record.date,
              endDate: record.date,
              startPrice: record.modalPrice,
              endPrice: record.modalPrice,
              lowestPrice: record.modalPrice,
              lowestDate: record.date,
              duration: 1
            };
          } else {
            currentLowPeriod.endDate = record.date;
            currentLowPeriod.endPrice = record.modalPrice;
            currentLowPeriod.duration++;
            if (record.modalPrice < currentLowPeriod.lowestPrice) {
              currentLowPeriod.lowestPrice = record.modalPrice;
              currentLowPeriod.lowestDate = record.date;
            }
          }
        } else {
          if (currentLowPeriod && currentLowPeriod.duration >= 3) {
            lowPeriods.push(currentLowPeriod);
          }
          currentLowPeriod = null;
        }
      });

      // Close any ongoing periods
      if (currentHighPeriod && currentHighPeriod.duration >= 3) {
        highPeriods.push(currentHighPeriod);
      }
      if (currentLowPeriod && currentLowPeriod.duration >= 3) {
        lowPeriods.push(currentLowPeriod);
      }

      records[gradeKey] = {
        allTimeRecords: {
          highestOverall: {
            price: highestOverall.price,
            priceType: highestOverall.priceType,
            date: highestOverall.date,
            record: highestOverall
          },
          lowestOverall: {
            price: lowestOverall.price,
            priceType: lowestOverall.priceType,
            date: lowestOverall.date,
            record: lowestOverall
          },
          highestModal: {
            price: highestModal.modalPrice,
            date: highestModal.date,
            record: highestModal
          },
          lowestModal: {
            price: lowestModal.modalPrice,
            date: lowestModal.date,
            record: lowestModal
          }
        },
        dailyChanges: {
          largestIncreases,
          largestDecreases,
          largestPercentIncreases,
          largestPercentDecreases
        },
        sustainedPeriods: {
          highPeriods: highPeriods.sort((a, b) => b.peakPrice - a.peakPrice).slice(0, 5),
          lowPeriods: lowPeriods.sort((a, b) => a.lowestPrice - b.lowestPrice).slice(0, 5)
        },
        statistics: {
          averagePrice: Math.round(avgPrice * 100) / 100,
          totalDataPoints: data.length,
          priceRange: Math.round((highestModal.modalPrice - lowestModal.modalPrice) * 100) / 100,
          volatility: Math.round(Math.sqrt(data.reduce((sum, record) => 
            sum + Math.pow(record.modalPrice - avgPrice, 2), 0) / data.length) * 100) / 100
        }
      };
    });

    res.json({
      success: true,
      data: {
        commodity: commodity.toLowerCase(),
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        totalDataPoints: historicalData.length,
        records
      }
    });

  } catch (error) {
    console.error('Error calculating price records:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to calculate price records'
    });
  }
};

const getSeasonalPatterns = (req, res) => {
  try {
    const { commodity, grade } = req.query;

    if (!commodity) {
      return res.status(400).json({
        error: 'Commodity parameter is required',
        message: 'Please specify commodity (onion or potato)'
      });
    }

    if (!['onion', 'potato'].includes(commodity.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid commodity',
        message: 'Commodity must be either onion or potato'
      });
    }

    // Get all available data for meaningful seasonal analysis
    const historicalData = dataService.getDataByDateRange(
      commodity,
      '2022-01-01',
      new Date().toISOString().split('T')[0],
      grade
    );

    if (historicalData.length === 0) {
      return res.status(404).json({
        error: 'No data found',
        message: `No data available for ${commodity}`
      });
    }

    // Group by month across all years
    const monthlyData = {};
    for (let month = 1; month <= 12; month++) {
      monthlyData[month] = [];
    }

    historicalData.forEach(record => {
      const date = new Date(record.date);
      const month = date.getMonth() + 1;
      monthlyData[month].push(record.modalPrice);
    });

    // Calculate seasonal statistics
    const seasonalPatterns = Object.keys(monthlyData).map(month => {
      const prices = monthlyData[month];
      if (prices.length === 0) return null;

      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      return {
        month: parseInt(month),
        monthName: monthNames[month],
        averagePrice: Math.round(avgPrice * 100) / 100,
        minPrice,
        maxPrice,
        priceRange: Math.round((maxPrice - minPrice) * 100) / 100,
        dataPoints: prices.length
      };
    }).filter(data => data !== null);

    // Find seasonal highs and lows
    const sortedByPrice = [...seasonalPatterns].sort((a, b) => a.averagePrice - b.averagePrice);
    const cheapestMonths = sortedByPrice.slice(0, 3);
    const expensiveMonths = sortedByPrice.slice(-3).reverse();

    // Calculate actual date range from data
    const dates = historicalData.map(record => new Date(record.date));
    const startDate = new Date(Math.min(...dates));
    const endDate = new Date(Math.max(...dates));

    res.json({
      success: true,
      data: {
        commodity: commodity.toLowerCase(),
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        totalDataPoints: historicalData.length,
        seasonalPatterns,
        insights: {
          cheapestMonths,
          expensiveMonths,
          mostVolatileMonth: seasonalPatterns.reduce((max, month) => 
            month.priceRange > max.priceRange ? month : max
          ),
          mostStableMonth: seasonalPatterns.reduce((min, month) => 
            month.priceRange < min.priceRange ? month : min
          )
        }
      }
    });

  } catch (error) {
    console.error('Error calculating seasonal patterns:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to calculate seasonal patterns'
    });
  }
};

const getYearOverYearComparisons = (req, res) => {
  try {
    const { commodity, grade } = req.query;

    if (!commodity) {
      return res.status(400).json({
        error: 'Commodity parameter is required',
        message: 'Please specify commodity (onion or potato)'
      });
    }

    if (!['onion', 'potato'].includes(commodity.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid commodity',
        message: 'Commodity must be either onion or potato'
      });
    }

    // Get all available data for YoY analysis
    const historicalData = dataService.getDataByDateRange(
      commodity,
      '2022-01-01',
      new Date().toISOString().split('T')[0],
      grade
    );

    if (historicalData.length === 0) {
      return res.status(404).json({
        error: 'No data found',
        message: `No data available for ${commodity}`
      });
    }

    // Group by year and month
    const yearMonthData = {};
    historicalData.forEach(record => {
      const date = new Date(record.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;
      
      if (!yearMonthData[key]) {
        yearMonthData[key] = [];
      }
      yearMonthData[key].push(record.modalPrice);
    });

    // Calculate monthly averages by year
    const monthlyAverages = Object.keys(yearMonthData).map(key => {
      const [year, month] = key.split('-').map(Number);
      const prices = yearMonthData[key];
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      return {
        year,
        month,
        monthName: monthNames[month],
        averagePrice: Math.round(avgPrice * 100) / 100,
        dataPoints: prices.length
      };
    }).sort((a, b) => a.year - b.year || a.month - b.month);

    // Calculate year-over-year changes
    const yoyComparisons = [];
    const allChanges = [];

    for (let month = 1; month <= 12; month++) {
      const monthName = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'][month];
      
      const monthData = monthlyAverages.filter(data => data.month === month);
      
      if (monthData.length > 1) {
        const comparisons = [];
        
        for (let i = 1; i < monthData.length; i++) {
          const current = monthData[i];
          const previous = monthData[i - 1];
          const change = current.averagePrice - previous.averagePrice;
          const percentChange = (change / previous.averagePrice) * 100;
          
          const comparison = {
            previousYear: previous.year,
            currentYear: current.year,
            previousPrice: previous.averagePrice,
            currentPrice: current.averagePrice,
            absoluteChange: Math.round(change * 100) / 100,
            percentChange: Math.round(percentChange * 100) / 100,
            monthName: monthName
          };
          
          comparisons.push(comparison);
          allChanges.push(comparison);
        }
        
        yoyComparisons.push({
          month,
          monthName,
          comparisons
        });
      }
    }

    // Find significant changes
    const largestIncreases = allChanges
      .filter(change => change.absoluteChange > 0)
      .sort((a, b) => b.absoluteChange - a.absoluteChange)
      .slice(0, 5);

    const largestDecreases = allChanges
      .filter(change => change.absoluteChange < 0)
      .sort((a, b) => a.absoluteChange - b.absoluteChange)
      .slice(0, 5);

    const largestPercentIncreases = allChanges
      .filter(change => change.percentChange > 0)
      .sort((a, b) => b.percentChange - a.percentChange)
      .slice(0, 5);

    const largestPercentDecreases = allChanges
      .filter(change => change.percentChange < 0)
      .sort((a, b) => a.percentChange - b.percentChange)
      .slice(0, 5);

    // Calculate actual date range from data
    const dates = historicalData.map(record => new Date(record.date));
    const startDate = new Date(Math.min(...dates));
    const endDate = new Date(Math.max(...dates));

    res.json({
      success: true,
      data: {
        commodity: commodity.toLowerCase(),
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        totalDataPoints: historicalData.length,
        monthlyAverages,
        yoyComparisons,
        insights: {
          largestIncreases,
          largestDecreases,
          largestPercentIncreases,
          largestPercentDecreases
        }
      }
    });

  } catch (error) {
    console.error('Error calculating year-over-year comparisons:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to calculate year-over-year comparisons'
    });
  }
};

const getPeriodToPeriodAnalysis = (req, res) => {
  try {
    const { commodity, startDate, endDate, grade } = req.query;

    if (!commodity) {
      return res.status(400).json({
        error: 'Commodity parameter is required',
        message: 'Please specify commodity (onion or potato)'
      });
    }

    if (!['onion', 'potato'].includes(commodity.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid commodity',
        message: 'Commodity must be either onion or potato'
      });
    }

    // Default to last 3 years if no dates provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setFullYear(defaultEndDate.getFullYear() - 3);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;

    const historicalData = dataService.getDataByDateRange(
      commodity,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
      grade
    );

    console.log('Backend received:', { commodity, startDate, endDate, grade });
    console.log('Calculated date range:', start.toISOString().split('T')[0], 'to', end.toISOString().split('T')[0]);
    console.log('Raw data count:', historicalData.length);
    if (historicalData.length > 0) {
      console.log('First record:', historicalData[0].date);
      console.log('Last record:', historicalData[historicalData.length - 1].date);
}

    if (historicalData.length === 0) {
      return res.status(404).json({
        error: 'No data found',
        message: `No data available for ${commodity} in the specified date range`
      });
    }

    // Simple monthly aggregation - exactly like historical trends
    const monthlyData = {};
    historicalData.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = [];
      }
      monthlyData[monthKey].push(record.modalPrice);
    });

    // Calculate monthly averages
    const monthlyAverages = Object.keys(monthlyData).sort().map(monthKey => {
      const prices = monthlyData[monthKey];
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      return {
        month: monthKey,
        averagePrice: Math.round(avgPrice * 100) / 100,
        dataPoints: prices.length
      };
    });

    // Calculate period-to-period changes
    const periodChanges = [];
    for (let i = 1; i < monthlyAverages.length; i++) {
      const current = monthlyAverages[i];
      const previous = monthlyAverages[i - 1];
      const change = current.averagePrice - previous.averagePrice;
      const percentChange = (change / previous.averagePrice) * 100;
      
      periodChanges.push({
        currentPeriod: current.month,
        previousPeriod: previous.month,
        currentPrice: current.averagePrice,
        previousPrice: previous.averagePrice,
        absoluteChange: Math.round(change * 100) / 100,
        percentChange: Math.round(percentChange * 100) / 100,
        changeType: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'stable'
      });
    }

    // Find largest changes
    const largestIncreases = periodChanges
      .filter(change => change.absoluteChange > 0)
      .sort((a, b) => b.absoluteChange - a.absoluteChange)
      .slice(0, 5);

    const largestDecreases = periodChanges
      .filter(change => change.absoluteChange < 0)
      .sort((a, b) => a.absoluteChange - b.absoluteChange)
      .slice(0, 5);

    const averageMonthlyChange = periodChanges.length > 0 
      ? Math.round((periodChanges.reduce((sum, change) => 
          sum + Math.abs(change.absoluteChange), 0) / periodChanges.length) * 100) / 100
      : 0;

    res.json({
      success: true,
      data: {
        commodity: commodity.toLowerCase(),
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        periodChanges,
        insights: {
          largestIncreases,
          largestDecreases,
          averageMonthlyChange
        }
      }
    });

  } catch (error) {
    console.error('Error calculating period-to-period analysis:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to calculate period-to-period analysis'
    });
  }
};

const getAdvancedAnalytics = (req, res) => {
  try {
    const { startDate, endDate, grade } = req.query;

    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setFullYear(defaultEndDate.getFullYear() - 2);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;

    // Get data for both commodities
    const onionData = dataService.getDataByDateRange(
      'onion',
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
      grade
    );

    const potatoData = dataService.getDataByDateRange(
      'potato',
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
      grade
    );

    // Helper function to calculate comprehensive analytics
    const calculateAnalytics = (data, commodityName) => {
      if (data.length === 0) return null;

      const modalPrices = data.map(record => record.modalPrice);
      const dates = data.map(record => new Date(record.date));
      const avgPrice = modalPrices.reduce((sum, price) => sum + price, 0) / modalPrices.length;
      
      // Volatility calculation
      const variance = modalPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / modalPrices.length;
      const volatility = Math.sqrt(variance);

      // Recent volatility (last 30 days)
      const recentData = data.slice(-30);
      const recentPrices = recentData.map(record => record.modalPrice);
      const recentAvg = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
      const recentVariance = recentPrices.reduce((sum, price) => sum + Math.pow(price - recentAvg, 2), 0) / recentPrices.length;
      const recentVolatility = Math.sqrt(recentVariance);

      // Grade analysis
      const gradeAnalysis = {};
      const gradeData = {};
      
      data.forEach(record => {
        if (!gradeData[record.grade]) {
          gradeData[record.grade] = [];
        }
        gradeData[record.grade].push(record.modalPrice);
      });

      Object.keys(gradeData).forEach(gradeKey => {
        const prices = gradeData[gradeKey];
        const avgGradePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        gradeAnalysis[gradeKey] = {
          averagePrice: Math.round(avgGradePrice * 100) / 100,
          dataPoints: prices.length
        };
      });

      // Price distribution
      const sortedPrices = [...modalPrices].sort((a, b) => a - b);
      const q1 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
      const q3 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
      
      const priceDistribution = {
        'Very Low': modalPrices.filter(price => price < avgPrice - volatility).length,
        'Low': modalPrices.filter(price => price >= avgPrice - volatility && price < q1).length,
        'Average': modalPrices.filter(price => price >= q1 && price <= q3).length,
        'High': modalPrices.filter(price => price > q3 && price <= avgPrice + volatility).length,
        'Very High': modalPrices.filter(price => price > avgPrice + volatility).length
      };

      // Trend analysis for predictions
      const recentTrendData = data.slice(-90); // Last 90 days
      if (recentTrendData.length >= 10) {
        const trendPrices = recentTrendData.map((record, index) => ({ x: index, y: record.modalPrice }));
        
        // Simple linear regression
        const n = trendPrices.length;
        const sumX = trendPrices.reduce((sum, point) => sum + point.x, 0);
        const sumY = trendPrices.reduce((sum, point) => sum + point.y, 0);
        const sumXY = trendPrices.reduce((sum, point) => sum + point.x * point.y, 0);
        const sumXX = trendPrices.reduce((sum, point) => sum + point.x * point.x, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Predict next 30 days (30 points ahead)
        const predictions = [];
        for (let i = 1; i <= 30; i++) {
          const futureX = n + i;
          const predictedPrice = slope * futureX + intercept;
          predictions.push(Math.round(predictedPrice * 100) / 100);
        }

        return {
          commodity: commodityName,
          volatility: Math.round(volatility * 100) / 100,
          recentVolatility: Math.round(recentVolatility * 100) / 100,
          averagePrice: Math.round(avgPrice * 100) / 100,
          gradeAnalysis,
          priceDistribution,
          totalDataPoints: data.length,
          priceRange: Math.round((Math.max(...modalPrices) - Math.min(...modalPrices)) * 100) / 100,
          trendDirection: slope > 0 ? 'Increasing' : slope < 0 ? 'Decreasing' : 'Stable',
          trendStrength: Math.abs(slope),
          predictions: {
            next30Days: predictions,
            volatilityRange: {
              lower: Math.round((avgPrice - recentVolatility) * 100) / 100,
              upper: Math.round((avgPrice + recentVolatility) * 100) / 100
            }
          }
        };
      }

      return {
        commodity: commodityName,
        volatility: Math.round(volatility * 100) / 100,
        recentVolatility: Math.round(recentVolatility * 100) / 100,
        averagePrice: Math.round(avgPrice * 100) / 100,
        gradeAnalysis,
        priceDistribution,
        totalDataPoints: data.length,
        priceRange: Math.round((Math.max(...modalPrices) - Math.min(...modalPrices)) * 100) / 100,
        trendDirection: 'Insufficient data',
        predictions: null
      };
    };

    // Cross-commodity correlation
    let crossCorrelation = null;
    if (onionData.length > 0 && potatoData.length > 0) {
      const onionPricesByDate = {};
      const potatoPricesByDate = {};
      
      onionData.forEach(record => {
        onionPricesByDate[record.date] = record.modalPrice;
      });
      
      potatoData.forEach(record => {
        potatoPricesByDate[record.date] = record.modalPrice;
      });

      const commonDates = Object.keys(onionPricesByDate).filter(date => 
        potatoPricesByDate[date] !== undefined
      );

      if (commonDates.length > 1) {
        const onionPrices = commonDates.map(date => onionPricesByDate[date]);
        const potatoPrices = commonDates.map(date => potatoPricesByDate[date]);
        
        const n = commonDates.length;
        const sumX = onionPrices.reduce((a, b) => a + b, 0);
        const sumY = potatoPrices.reduce((a, b) => a + b, 0);
        const sumXY = onionPrices.reduce((sum, x, i) => sum + x * potatoPrices[i], 0);
        const sumXX = onionPrices.reduce((sum, x) => sum + x * x, 0);
        const sumYY = potatoPrices.reduce((sum, y) => sum + y * y, 0);
        
        const correlation = (n * sumXY - sumX * sumY) / 
          Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        
        crossCorrelation = {
          coefficient: Math.round(correlation * 100) / 100,
          strength: Math.abs(correlation) > 0.7 ? 'Strong' : 
                   Math.abs(correlation) > 0.3 ? 'Moderate' : 'Weak',
          direction: correlation > 0 ? 'Positive' : 'Negative',
          dataPoints: n,
          interpretation: correlation > 0.5 
            ? 'Onion and potato prices tend to move strongly in the same direction'
            : correlation > 0.3
            ? 'Onion and potato prices show moderate positive correlation'
            : correlation > -0.3
            ? 'Onion and potato prices show weak correlation'
            : 'Onion and potato prices tend to move in opposite directions'
        };
      }
    }

    const onionAnalytics = calculateAnalytics(onionData, 'onion');
    const potatoAnalytics = calculateAnalytics(potatoData, 'potato');

    // Calculate grade premiums
    const gradePremiums = {};
    [onionAnalytics, potatoAnalytics].forEach(analytics => {
      if (analytics && analytics.gradeAnalysis.faq && analytics.gradeAnalysis['non-faq']) {
        const premium = analytics.gradeAnalysis.faq.averagePrice - analytics.gradeAnalysis['non-faq'].averagePrice;
        const premiumPercent = (premium / analytics.gradeAnalysis['non-faq'].averagePrice) * 100;
        
        gradePremiums[analytics.commodity] = {
          absolutePremium: Math.round(premium * 100) / 100,
          percentPremium: Math.round(premiumPercent * 100) / 100,
          faqPrice: analytics.gradeAnalysis.faq.averagePrice,
          nonFaqPrice: analytics.gradeAnalysis['non-faq'].averagePrice
        };
      }
    });

    res.json({
      success: true,
      data: {
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        crossCommodityCorrelation: crossCorrelation,
        onionAnalytics,
        potatoAnalytics,
        gradePremiums,
        marketSummary: {
          totalDataPoints: onionData.length + potatoData.length,
          analysisType: 'Advanced Analytics',
          commoditiesAnalyzed: [
            onionAnalytics ? 'onion' : null,
            potatoAnalytics ? 'potato' : null
          ].filter(Boolean)
        }
      }
    });

  } catch (error) {
    console.error('Error calculating advanced analytics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to calculate advanced analytics'
    });
  }
};


const getHealthCheck = (req, res) => {
  try {
    const totalRecords = dataService.getAllData().length;
    const metadata = dataService.getMetadata();

    res.json({
      status: 'healthy',
      totalRecords,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
};

module.exports = {
  getLatestPrices,
  getHistoricalTrends,
  getMonthlyAverages,
  getPriceRecords,
  getSeasonalPatterns,
  getYearOverYearComparisons,
  getPeriodToPeriodAnalysis,
  getAdvancedAnalytics,
  getHealthCheck
};