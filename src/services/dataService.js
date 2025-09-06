const fs = require('fs');
const path = require('path');

class DataService {
  constructor() {
    this.dataPath = path.join(__dirname, '../../data/market-prices.json');
    this.data = [];
    this.metadata = null;
    this.loadData();
  }

  loadData() {
    try {
      console.log('Loading data from:', this.dataPath);
      
      // Check if file exists
      if (!fs.existsSync(this.dataPath)) {
        console.error('Data file does not exist at:', this.dataPath);
        this.data = [];
        return;
      }

      const rawData = fs.readFileSync(this.dataPath, 'utf8');
      
      if (!rawData.trim()) {
        console.error('Data file is empty');
        this.data = [];
        return;
      }

      const parsedData = JSON.parse(rawData);
      
      // Handle nested structure with metadata and priceData
      if (parsedData.priceData && Array.isArray(parsedData.priceData)) {
        this.data = parsedData.priceData;
        this.metadata = parsedData.metadata;
        console.log(`Successfully loaded ${this.data.length} records from market data`);
        console.log('Metadata:', this.metadata);
      } 
      // Handle flat array structure (fallback)
      else if (Array.isArray(parsedData)) {
        this.data = parsedData;
        console.log(`Successfully loaded ${this.data.length} records from market data (flat structure)`);
      } 
      else {
        console.error('Data file does not contain valid structure. Expected array or object with priceData property');
        this.data = [];
      }
      
    } catch (error) {
      console.error('Error loading market data:', error.message);
      this.data = [];
    }
  }

  getAllData() {
    return this.data;
  }

  getMetadata() {
    return this.metadata;
  }

  getLatestPrices(commodity) {
    console.log('Getting latest prices for:', commodity);
    console.log('Data type:', typeof this.data, 'Is Array:', Array.isArray(this.data));
    console.log('Data length:', this.data ? this.data.length : 'undefined');

    if (!this.data || !Array.isArray(this.data) || this.data.length === 0) {
      console.log('No valid data available');
      return null;
    }

    // Filter by commodity
    const commodityData = this.data.filter(record => 
      record.commodity && record.commodity.toLowerCase() === commodity.toLowerCase()
    );

    console.log(`Found ${commodityData.length} records for ${commodity}`);

    if (commodityData.length === 0) {
      return null;
    }

    // Find the latest date
    const latestDate = commodityData.reduce((latest, record) => {
      return new Date(record.date) > new Date(latest) ? record.date : latest;
    }, commodityData[0].date);

    console.log('Latest date found:', latestDate);

    // Get all records for the latest date
    const latestRecords = commodityData.filter(record => record.date === latestDate);

    // Organize by grade
    const result = {
      commodity: commodity.toLowerCase(),
      latestDate: latestDate,
      data: {}
    };

    latestRecords.forEach(record => {
      result.data[record.grade] = {
        minPrice: record.minPrice,
        maxPrice: record.maxPrice,
        modalPrice: record.modalPrice,
        variety: record.variety
      };
    });

    return result;
  }

  // Get data within date range
  getDataByDateRange(commodity, startDate, endDate, grade = null) {
    if (!this.data || !Array.isArray(this.data)) {
      return [];
    }

    let filteredData = this.data.filter(record => {
      const recordDate = new Date(record.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return record.commodity && 
             record.commodity.toLowerCase() === commodity.toLowerCase() &&
             recordDate >= start && 
             recordDate <= end &&
             (grade ? record.grade === grade : true);
    });

    return filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
}

module.exports = new DataService();