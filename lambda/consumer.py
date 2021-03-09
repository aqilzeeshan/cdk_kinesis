import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, _context):
    if event and "Records" in event:
        for record in event["Records"]:
            try:
                body = record['kinesis']
                logger.info(f"Record consumed with partition key '{body['partitionKey']}'")
            except KeyError as err:
                logger.error(err)
                raise err
