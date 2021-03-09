import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { CfnStreamConsumer, Stream } from '@aws-cdk/aws-kinesis';
import { Code, EventSourceMapping, Function, Runtime, StartingPosition } from '@aws-cdk/aws-lambda';


export class CdkKinesisStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //Without Enhanced fan-out
    //Each of these shards supports read throughput of 2MB per second, which all stream consumers have to share.
    const stream = new Stream(this, 'stream', {
      shardCount: 1,
      streamName: 'example-stream',
    });
    
    //CfnStreamConsumer enables Enhanced fan-out
    //Enhanced fan-out means delivering a dedicated throughput of 2MB per second per shard to each registered Kinesis consumer.
    //Plus records are pushed immediately to consumer
    const streamConsumer = new CfnStreamConsumer(this, 'stream-consumer', {
      consumerName: 'example-stream-consumer',
      streamArn: stream.streamArn,
    });

    //////////////////////////////////////////////////////////////////////
    // Producer Lambda
    //////////////////////////////////////////////////////////////////////

    const producer = new Function(this, 'producer', {
      code: Code.fromAsset('./lambda'),
      description: 'Example Lambda to put events into Kinesis.',
      environment: {
        'STREAM_NAME': stream.streamName,
      },
      functionName: 'example-producer',
      handler: 'producer.lambda_handler',
      runtime: Runtime.PYTHON_3_7,
    });

    const kinesisStreamWritePolicyStmt = new PolicyStatement({
      resources: [stream.streamArn],
      actions: ['kinesis:PutRecord'],
    });

    producer.addToRolePolicy(kinesisStreamWritePolicyStmt);

    //////////////////////////////////////////////////////////////////////
    // Consumer Lambda
    //////////////////////////////////////////////////////////////////////

    const lambdaConsumer = new Function(this, 'lambda-consumer', {
      code: Code.fromAsset('./lambda'),
      description: 'Example Lambda to consume events from Kinesis.',
      functionName: 'example-consumer',
      handler: 'consumer.lambda_handler',
      runtime: Runtime.PYTHON_3_7,
    });

    const kinesisStreamReadPolicyStmt = new PolicyStatement({
      resources: [stream.streamArn],
      actions: [
        'kinesis:DescribeStreamSummary',
        'kinesis:GetRecords',
        'kinesis:GetShardIterator',
        'kinesis:ListShards',
      ],
    });

    const kinesisConsumerPolicyStmt = new PolicyStatement({
      resources: [streamConsumer.attrConsumerArn],
      actions: ['kinesis:SubscribeToShard'],
    });

    lambdaConsumer.addToRolePolicy(kinesisStreamReadPolicyStmt);
    lambdaConsumer.addToRolePolicy(kinesisConsumerPolicyStmt);

    new EventSourceMapping(this, 'event-source-mapping', {
      batchSize: 10,
      eventSourceArn: streamConsumer.attrConsumerArn,
      startingPosition: StartingPosition.TRIM_HORIZON,
      target: lambdaConsumer,
    });

  }
}
