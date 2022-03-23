import boto3
import logging
import os
import json

logger = logging.getLogger()
logging.basicConfig(level=logging.INFO, force=True)


region=os.environ['AWS_REGION']
#ExistingCMK=os.environ['EXISTING_KMS_CMK']


def on_event(event, context):
    print(event['detail'])
    
    if 'RequestType' in event:
        if event['RequestType'].lower() == 'create':
            return on_create(event)
        if event['RequestType'].lower() == 'update':
            return on_update(event)
        raise Exception(f"Invalid request type: {event['RequestType']}")
    if 'detail' in event:
        if event['detail']['eventName'].lower() == 'createmanagedaccount':
            print("event found")
            return bucket_create(event)
    print("No Event")

def bucket_create(event):
    
    bucket_name = event['requestParameters']['bucketName']
        
            
    s3client = boto3.client('s3')
    

    logger.info("Getting Default Security Group")

    response = s3client.get_bucket_logging(
            Bucket=bucket_name
        )
    if 'LoggingEnabled' in response:
        print("Logging Enabled")
    else:
        if bucket_name != os.environ['LOGGING_S3_BUCKET']:
            print(f"Enabling Logging for {bucket_name}")
            try:
                response = s3client.put_bucket_logging(
                    Bucket=bucket_name,
                    BucketLoggingStatus={
                        'LoggingEnabled': {
                            'TargetBucket': os.environ['LOGGING_S3_BUCKET'],
                            'TargetPrefix': f'{bucket_name}/',
                        }
                    }
                )
            except Exception as e:
                logger.exception(f"failed to to update {bucket_name} - " + str(e)) 

                

   
   

   


def on_create(event):
    logger.info("Initial Run")

    s3client = boto3.client('s3')
    s3 = boto3.resource('s3')
    logger.info("Getting Checking each bucket's Encryption")
    for bucket in s3.buckets.all():
        print(bucket.name)
        response = s3client.get_bucket_encryption(
            Bucket=bucket.name
        )
        if 'ApplyServerSideEncryptionByDefault' in response:
            print("Default Encryption Already Enabled")
        else:
            if os.environ['KMS_ENCRYPTION_KEY'] != '':
                print(f"Enabling Encryption for {bucket.name} with CMK")
                try:
                    response = s3client.put_bucket_encryption(
                        Bucket=bucket.name,
                        ServerSideEncryptionConfiguration={
                            'Rules': [{
                                'ApplyServerSideEncryptionByDefault': {
                                    'SSEAlgorithm': 'aws:kms',
                                    'KMSMasterKeyID': os.environ['KMS_ENCRYPTION_KEY']
                                },
                                'BucketKeyEnabled': True
                            }]
                        }
                    )
                except Exception as e:
                    logger.exception(f"failed to to update {bucket.name} - " + str(e)) 

                    continue 
        
            else:
                print(f"Enabling Default Encryption for {bucket.name} with AWS SSE-S3")
                try:
                    response = s3client.put_bucket_encryption(
                        Bucket=bucket.name,
                        ServerSideEncryptionConfiguration={
                            'Rules': [{
                                'ApplyServerSideEncryptionByDefault': {
                                    'SSEAlgorithm': 'AES256'
                                }
                            }]
                        }
                    )
                except Exception as e:
                    logger.exception(f"failed to to update {bucket.name} - " + str(e)) 

                    continue 

        
        #logger.info(f"Checking AWS Region {region}")

        #status = remote_client.get_ebs_encryption_by_default()
        #print ("===="*10)
        #result = status["EbsEncryptionByDefault"]
        #if result == True:
        #    logger.info(f"Activated, nothing to do")

        #else:
        #    logger.info(f"Not activated, activation in progress")
        #    remote_client.enable_ebs_encryption_by_default()


        #logger.info(f"Default EBS Encryption Enabled for {account_id}")

        

def on_update(event):
    logger.info("Initial Run")

    s3client = boto3.client('s3')
    s3 = boto3.resource('s3')
    logger.info("Getting Checking each bucket's logging")
    for bucket in s3.buckets.all():
        print(bucket.name)
        response = s3client.get_bucket_logging(
            Bucket=bucket.name
        )
        if 'LoggingEnabled' in response:
            print("Logging Enabled")
        else:

            if bucket.name != os.environ['LOGGING_S3_BUCKET']:
                print(f"Enabling Logging for {bucket.name}")
                try:
                    response = s3client.put_bucket_logging(
                        Bucket=bucket.name,
                        BucketLoggingStatus={
                            'LoggingEnabled': {
                                'TargetBucket': os.environ['LOGGING_S3_BUCKET'],
                                'TargetPrefix': f'{bucket.name}/',
                            }
                        }
                    )
                except Exception as e:
                    logger.exception(f"failed to to update {bucket.name} - "+ str(e)) 

                    continue 
            
            
            

    
def on_delete(event):
    logger.info("Deletion Run - Not implemented")
    s3client = boto3.client('s3')
    s3 = boto3.resource('s3')
    logger.info("Getting Checking each bucket's logging")
    for bucket in s3.buckets.all():
        print(bucket.name)
        response = s3client.get_bucket_logging(
            Bucket=bucket.name
        )
        if 'LoggingEnabled' in response:
            print("Logging Enabled")
        else:
            if bucket.name != os.environ['LOGGING_S3_BUCKET']:
                print(f"Enabling Logging for {bucket.name}")
                try:
                    response = s3client.put_bucket_logging(
                        Bucket=bucket.name,
                        BucketLoggingStatus={
                            'LoggingEnabled': {
                                'TargetBucket': os.environ['LOGGING_S3_BUCKET'],
                                'TargetPrefix': f'{bucket.name}/',
                            }
                        }
                    )
                except Exception as e:
                    logger.exception(f"failed to to update {bucket.name} - "+ str(e)) 

                    continue 