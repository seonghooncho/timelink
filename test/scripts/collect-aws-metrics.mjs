#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const start = process.argv[2];
const end = process.argv[3];

if (!start || !end) {
  console.error('Usage: node test/scripts/collect-aws-metrics.mjs <start-iso> <end-iso>');
  process.exit(1);
}

function aws(args, region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION) {
  const finalArgs = [...args];
  if (region) {
    finalArgs.push('--region', region);
  }
  return JSON.parse(execFileSync('aws', finalArgs, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }));
}

function metric(namespace, metricName, dimensions, statistic, period = 60, region) {
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

  const result = aws(args, region);
  const points = (result.Datapoints || []).sort((a, b) => a.Timestamp.localeCompare(b.Timestamp));
  return points;
}

function sum(points, key) {
  return points.reduce((total, point) => total + Number(point[key] || 0), 0);
}

function max(points, key) {
  return points.reduce((value, point) => Math.max(value, Number(point[key] || 0)), 0);
}

function avgMax(points) {
  return points.reduce((value, point) => Math.max(value, Number(point.Average || 0)), 0);
}

function pmax(points, percentile) {
  return points.reduce((value, point) => {
    const stats = point.ExtendedStatistics || {};
    return Math.max(value, Number(stats[percentile] || 0));
  }, 0);
}

const lambdaFunctions = (process.env.TIMELINK_LAMBDA_FUNCTIONS || 'planner-prod-api,planner-prod-notification-worker,planner-prod-ai')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const lambda = {};

for (const functionName of lambdaFunctions) {
  const dims = [['FunctionName', functionName]];
  const invocations = metric('AWS/Lambda', 'Invocations', dims, 'Sum');
  const errors = metric('AWS/Lambda', 'Errors', dims, 'Sum');
  const throttles = metric('AWS/Lambda', 'Throttles', dims, 'Sum');
  const durationP95 = metric('AWS/Lambda', 'Duration', dims, 'p95');
  const concurrentExecutions = metric('AWS/Lambda', 'ConcurrentExecutions', dims, 'Maximum');

  lambda[functionName] = {
    invocations: sum(invocations, 'Sum'),
    errors: sum(errors, 'Sum'),
    throttles: sum(throttles, 'Sum'),
    durationP95MaxMs: pmax(durationP95, 'p95'),
    concurrentExecutionsMax: max(concurrentExecutions, 'Maximum'),
  };
}

const dynamodbTableName = process.env.TIMELINK_TABLE_NAME || 'planner_prod_main';
const dynamodbDims = [['TableName', dynamodbTableName]];
const dynamodb = {
  throttledRequests: sum(metric('AWS/DynamoDB', 'ThrottledRequests', dynamodbDims, 'Sum'), 'Sum'),
  readThrottleEvents: sum(metric('AWS/DynamoDB', 'ReadThrottleEvents', dynamodbDims, 'Sum'), 'Sum'),
  writeThrottleEvents: sum(metric('AWS/DynamoDB', 'WriteThrottleEvents', dynamodbDims, 'Sum'), 'Sum'),
  consumedReadCapacityUnitsMax: max(metric('AWS/DynamoDB', 'ConsumedReadCapacityUnits', dynamodbDims, 'Maximum'), 'Maximum'),
  consumedWriteCapacityUnitsMax: max(metric('AWS/DynamoDB', 'ConsumedWriteCapacityUnits', dynamodbDims, 'Maximum'), 'Maximum'),
};

const apiGatewayId = process.env.TIMELINK_API_GATEWAY_ID;
const apiGatewayStage = process.env.TIMELINK_API_GATEWAY_STAGE || '$default';
let apiGateway = null;
if (apiGatewayId) {
  const dims = [['ApiId', apiGatewayId], ['Stage', apiGatewayStage]];
  apiGateway = {
    count: sum(metric('AWS/ApiGateway', 'Count', dims, 'Sum'), 'Sum'),
    fourXx: sum(metric('AWS/ApiGateway', '4xx', dims, 'Sum'), 'Sum'),
    fiveXx: sum(metric('AWS/ApiGateway', '5xx', dims, 'Sum'), 'Sum'),
    latencyP95MaxMs: pmax(metric('AWS/ApiGateway', 'Latency', dims, 'p95'), 'p95'),
    integrationLatencyP95MaxMs: pmax(metric('AWS/ApiGateway', 'IntegrationLatency', dims, 'p95'), 'p95'),
  };
}

const cloudFrontDistributionId = process.env.TIMELINK_CLOUDFRONT_DISTRIBUTION_ID;
let cloudFront = null;
if (cloudFrontDistributionId) {
  const dims = [['DistributionId', cloudFrontDistributionId], ['Region', 'Global']];
  cloudFront = {
    requests: sum(metric('AWS/CloudFront', 'Requests', dims, 'Sum', 60, 'us-east-1'), 'Sum'),
    fourXxErrorRateMax: avgMax(metric('AWS/CloudFront', '4xxErrorRate', dims, 'Average', 60, 'us-east-1')),
    fiveXxErrorRateMax: avgMax(metric('AWS/CloudFront', '5xxErrorRate', dims, 'Average', 60, 'us-east-1')),
    totalErrorRateMax: avgMax(metric('AWS/CloudFront', 'TotalErrorRate', dims, 'Average', 60, 'us-east-1')),
  };
}

console.log(JSON.stringify({
  window: { start, end },
  lambda,
  dynamodb,
  apiGateway,
  cloudFront,
}, null, 2));
