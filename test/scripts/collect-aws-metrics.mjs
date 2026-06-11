#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const start = process.argv[2];
const end = process.argv[3];

if (!start || !end) {
  console.error('Usage: node test/scripts/collect-aws-metrics.mjs <start-iso> <end-iso>');
  process.exit(1);
}

function aws(args) {
  return JSON.parse(execFileSync('aws', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }));
}

function metric(namespace, metricName, dimensions, statistic, period = 60) {
  const args = [
    'cloudwatch',
    'get-metric-statistics',
    '--namespace',
    namespace,
    '--metric-name',
    metricName,
    '--start-time',
    start,
    '--end-time',
    end,
    '--period',
    String(period),
    '--output',
    'json',
  ];

  if (statistic.startsWith('p')) {
    args.push('--extended-statistics', statistic);
  } else {
    args.push('--statistics', statistic);
  }

  if (dimensions.length > 0) {
    args.push('--dimensions', ...dimensions.map(([Name, Value]) => `Name=${Name},Value=${Value}`));
  }

  const result = aws(args);
  const points = (result.Datapoints || []).sort((a, b) => a.Timestamp.localeCompare(b.Timestamp));
  return points;
}

function sum(points, key) {
  return points.reduce((total, point) => total + Number(point[key] || 0), 0);
}

function max(points, key) {
  return points.reduce((value, point) => Math.max(value, Number(point[key] || 0)), 0);
}

function pmax(points, percentile) {
  return points.reduce((value, point) => {
    const stats = point.ExtendedStatistics || {};
    return Math.max(value, Number(stats[percentile] || 0));
  }, 0);
}

const lambdaFunctions = ['planner-prod-api', 'planner-prod-notification-worker', 'planner-prod-ai'];
const lambda = {};

for (const functionName of lambdaFunctions) {
  const dims = [['FunctionName', functionName]];
  const invocations = metric('AWS/Lambda', 'Invocations', dims, 'Sum');
  const errors = metric('AWS/Lambda', 'Errors', dims, 'Sum');
  const throttles = metric('AWS/Lambda', 'Throttles', dims, 'Sum');
  const durationP95 = metric('AWS/Lambda', 'Duration', dims, 'p95');

  lambda[functionName] = {
    invocations: sum(invocations, 'Sum'),
    errors: sum(errors, 'Sum'),
    throttles: sum(throttles, 'Sum'),
    durationP95MaxMs: pmax(durationP95, 'p95'),
  };
}

const dynamodbDims = [['TableName', 'planner_prod_main']];
const dynamodb = {
  throttledRequests: sum(metric('AWS/DynamoDB', 'ThrottledRequests', dynamodbDims, 'Sum'), 'Sum'),
  readThrottleEvents: sum(metric('AWS/DynamoDB', 'ReadThrottleEvents', dynamodbDims, 'Sum'), 'Sum'),
  writeThrottleEvents: sum(metric('AWS/DynamoDB', 'WriteThrottleEvents', dynamodbDims, 'Sum'), 'Sum'),
  consumedReadCapacityUnitsMax: max(metric('AWS/DynamoDB', 'ConsumedReadCapacityUnits', dynamodbDims, 'Maximum'), 'Maximum'),
  consumedWriteCapacityUnitsMax: max(metric('AWS/DynamoDB', 'ConsumedWriteCapacityUnits', dynamodbDims, 'Maximum'), 'Maximum'),
};

console.log(JSON.stringify({
  window: { start, end },
  lambda,
  dynamodb,
}, null, 2));
