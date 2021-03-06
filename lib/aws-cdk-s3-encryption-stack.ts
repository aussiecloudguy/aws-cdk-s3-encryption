import { aws_logs as logs, aws_kms as kms, aws_iam as iam, aws_events as events, aws_events_targets as targets, custom_resources as custom_resource, CustomResource, aws_lambda as lambda, aws_s3 as s3, Duration, Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface enableS3EncryptionStackProps extends StackProps {

  newKmsCmk?: boolean; //(OPTIONAL) Create New KMS CMK. Default is false (if not specified the default is to use SSE-S3 encryption)
  existingKmsCmkArn?: string; //(OPTIONAL) ARN for existing CMK to leverage. Function and Account must have Encrypt/Decrypt permissions for this Key

}

export class enableS3EncryptionStack extends Stack {


  constructor(scope: Construct, id: string, props?: enableS3EncryptionStackProps) {
    super(scope, id, props);




    //KMS CMK Key if Requested
    let kmsCmk=''!
    if (props?.existingKmsCmkArn != undefined && props.newKmsCmk != true) {
      kmsCmk = props.existingKmsCmkArn
    }
    if (props?.newKmsCmk === true) {
      
      const kmsKey = new kms.Key(this,'s3kms', {
        enableKeyRotation: true,
        removalPolicy: RemovalPolicy.RETAIN
  
      })

      const kmsKeyAlias = new kms.Alias(this, 'kmsKeyAlias',{
        aliasName: 's3DefaultCmk',
        targetKey: kmsKey
      })

      kmsCmk=kmsKey.keyArn
    }


     
    // Encryption Function

    const bucketFunction = new lambda.Function(this, 'enableS3Encryption-function', {
      runtime: lambda.Runtime.PYTHON_3_9,
      functionName: 'Enable-S3-Bucket-Encryption',
      handler: 'enables3encryptionfunction.on_event',
      code: lambda.Code.fromAsset(path.join(__dirname, 'src')),
      timeout: Duration.seconds(300),
      environment: {
        "KMS_ENCRYPTION_KEY": kmsCmk,
        

      
      }

    });

        
    // 👇 create a policy statement
    const AccessPolicy = new iam.PolicyStatement({
      actions: [
        's3:ListBucket',
        's3:PutEncryptionConfiguration',
        's3:GetEncryptionConfiguration'
      ],

      resources: [
        'arn:aws:s3:::*',
        'arn:aws:s3:::*/*'

      ],
    });

    
  
   bucketFunction.addToRolePolicy(AccessPolicy);
   
   // 👇 create a policy statement
   const AccessPolicy2 = new iam.PolicyStatement({
    actions: [
      's3:ListAllMyBuckets',

      
    ],

    resources: [
      '*'

    ],
  });

    bucketFunction.addToRolePolicy(AccessPolicy2);
    const customresourceProvider = new custom_resource.Provider(this, 's3EncryptionLambaCustomResource', {
      onEventHandler: bucketFunction,
      //isCompleteHandler: isComplete,        // optional async "waiter"
      logRetention: logs.RetentionDays.ONE_DAY   // default is INFINITE
      
    });
  
  
  new CustomResource(this, 'Invokes3encryptionfunction', { serviceToken: customresourceProvider.serviceToken });
  
      
   
      
  const runrule=new events.Rule(this, "enables3encryptionfornewbuckets",{
    eventPattern: {
      source: ["aws.s3"],
      detailType: ["AWS API Call via CloudTrail"],
      detail: {
        "eventName": ["CreateBucket"],
        "eventSource": ["s3.amazonaws.com"]
      }
    }
  });


  runrule.addTarget(new targets.LambdaFunction(bucketFunction));
  
      
  }
}
