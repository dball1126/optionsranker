#!/usr/bin/env node

/**
 * OptionsRanker Performance Test Suite
 * Tests critical API endpoints under load to ensure launch readiness
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';
const CONCURRENT_REQUESTS = 50;
const TEST_DURATION = 30000; // 30 seconds

class PerformanceTest {
  constructor() {
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      responseTimeP95: 0,
      responseTimes: [],
      errors: [],
    };
  }

  async testEndpoint(url, options = {}) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${BASE_URL}${url}`, {
        timeout: 10000, // 10 second timeout
        ...options,
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.results.totalRequests++;
      this.results.responseTimes.push(responseTime);
      
      if (response.ok) {
        this.results.successfulRequests++;
      } else {
        this.results.failedRequests++;
        this.results.errors.push(`HTTP ${response.status}: ${url}`);
      }
      
      return { success: response.ok, responseTime, status: response.status };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.results.totalRequests++;
      this.results.failedRequests++;
      this.results.responseTimes.push(responseTime);
      this.results.errors.push(`Network error: ${error.message}`);
      
      return { success: false, responseTime, error: error.message };
    }
  }

  async runLoadTest(testName, url, options = {}) {
    console.log(`\n🧪 Running load test: ${testName}`);
    console.log(`📊 URL: ${url}`);
    console.log(`⚡ Concurrent requests: ${CONCURRENT_REQUESTS}`);
    console.log(`⏱️  Duration: ${TEST_DURATION / 1000} seconds`);
    
    // Reset results
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      responseTimeP95: 0,
      responseTimes: [],
      errors: [],
    };

    const startTime = Date.now();
    const promises = [];

    // Create concurrent workers
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      promises.push(this.worker(url, options, startTime));
    }

    await Promise.all(promises);
    this.calculateStats();
    this.printResults(testName);
    
    return this.results;
  }

  async worker(url, options, testStartTime) {
    while (Date.now() - testStartTime < TEST_DURATION) {
      await this.testEndpoint(url, options);
      
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    }
  }

  calculateStats() {
    if (this.results.responseTimes.length === 0) return;

    // Average response time
    this.results.averageResponseTime = 
      this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;

    // 95th percentile
    const sorted = this.results.responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    this.results.responseTimeP95 = sorted[p95Index] || 0;
  }

  printResults(testName) {
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    const requestsPerSecond = this.results.totalRequests / (TEST_DURATION / 1000);

    console.log(`\n📊 Results for ${testName}:`);
    console.log(`   Total Requests: ${this.results.totalRequests}`);
    console.log(`   Successful: ${this.results.successfulRequests} (${successRate.toFixed(1)}%)`);
    console.log(`   Failed: ${this.results.failedRequests}`);
    console.log(`   Requests/sec: ${requestsPerSecond.toFixed(1)}`);
    console.log(`   Avg Response Time: ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`   95th Percentile: ${this.results.responseTimeP95.toFixed(2)}ms`);
    
    if (this.results.errors.length > 0) {
      console.log(`   Errors (first 5):`);
      this.results.errors.slice(0, 5).forEach(error => {
        console.log(`     - ${error}`);
      });
    }

    // Performance assessment
    if (successRate >= 99 && this.results.averageResponseTime < 500) {
      console.log(`   ✅ EXCELLENT - Ready for production`);
    } else if (successRate >= 95 && this.results.averageResponseTime < 1000) {
      console.log(`   ⚠️  GOOD - Minor optimizations recommended`);
    } else {
      console.log(`   ❌ NEEDS WORK - Performance issues detected`);
    }
  }
}

async function main() {
  console.log('🚀 OptionsRanker Performance Test Suite');
  console.log(`🌐 Testing: ${BASE_URL}`);
  console.log('=' * 50);

  const tester = new PerformanceTest();
  const testResults = [];

  try {
    // Health check
    console.log('\n🔍 Pre-flight check...');
    const healthCheck = await tester.testEndpoint('/api/health');
    if (!healthCheck.success) {
      console.error('❌ Server health check failed');
      process.exit(1);
    }
    console.log('✅ Server is healthy');

    // Test 1: Market data endpoint
    const marketTest = await tester.runLoadTest(
      'Market Data API',
      '/api/market/quote/AAPL'
    );
    testResults.push({ name: 'Market Data', ...marketTest });

    // Test 2: Options chain endpoint  
    const optionsTest = await tester.runLoadTest(
      'Options Chain API',
      '/api/market/chain/AAPL'
    );
    testResults.push({ name: 'Options Chain', ...optionsTest });

    // Test 3: Symbol search
    const searchTest = await tester.runLoadTest(
      'Symbol Search API',
      '/api/market/search?q=tesla'
    );
    testResults.push({ name: 'Symbol Search', ...searchTest });

    // Test 4: Strategy analysis
    const strategyTest = await tester.runLoadTest(
      'Strategy Analysis API',
      '/api/strategies/analyze',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs: [{
            type: 'call',
            strike: 150,
            expiration: '2024-03-15',
            quantity: 1,
            action: 'buy'
          }],
          stockPrice: 155
        })
      }
    );
    testResults.push({ name: 'Strategy Analysis', ...strategyTest });

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 PERFORMANCE SUMMARY');
    console.log('='.repeat(50));

    const totalRequests = testResults.reduce((sum, test) => sum + test.totalRequests, 0);
    const totalSuccessful = testResults.reduce((sum, test) => sum + test.successfulRequests, 0);
    const overallSuccessRate = (totalSuccessful / totalRequests) * 100;
    const avgResponseTime = testResults.reduce((sum, test) => sum + test.averageResponseTime, 0) / testResults.length;

    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);

    if (overallSuccessRate >= 99 && avgResponseTime < 500) {
      console.log('\n🎉 LAUNCH READY! All performance tests passed.');
      process.exit(0);
    } else if (overallSuccessRate >= 95) {
      console.log('\n⚠️  CAUTION: Minor performance issues detected. Consider optimization.');
      process.exit(0);
    } else {
      console.log('\n❌ NOT READY: Significant performance issues. Do not launch yet.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
main();