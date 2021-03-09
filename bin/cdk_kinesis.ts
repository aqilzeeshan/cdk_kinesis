#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkKinesisStack } from '../lib/cdk_kinesis-stack';

const app = new cdk.App();
new CdkKinesisStack(app, 'CdkKinesisStack');
