import json
import logging
import os

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, _context):
    if event and "id" in event:
        try:
            logger.info(f"Event received with ID '{event['id']}'")
            client = boto3.client("kinesis")
            stream_name = os.getenv("STREAM_NAME")

            client.put_record(
                StreamName=stream_name,
                Data=json.dumps(event),
                PartitionKey=event['id']
            )
            logger.info(f"Put event into Kinesis stream '{stream_name}'")
        except (ClientError, KeyError) as err:
            logger.error(err)
            raise err
