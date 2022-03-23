import { aws_logs as logs, aws_iam as iam, aws_events as events, aws_events_targets as targets, custom_resources as custom_resource, CustomResource, aws_lambda as lambda, aws_s3 as s3, Duration, Stack, StackProps } from 'aws-cdk-lib';
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

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'AwsCdkS3LoggingQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    //KMS CMK Key if Requested


    let kmsCmk=''!
    if (props?.existingKmsCmkArn != undefined && props.newKmsCmk != true) {
      kmsCmk = props.existingKmsCmkArn
    } else if (props?.newKmsCmk === true) {

    }
    
    const bucketFunction = new lambda.Function(this, 'enableS3Encryption-function', {
      runtime: lambda.Runtime.PYTHON_3_9,
      functionName: 'Enable-S3-Bucket-Encryption',
      handler: 'enables3bucketencryption.on_event',
      code: lambda.Code.fromAsset(path.join(__dirname, 'src')),
      timeout: Duration.seconds(300),
      environment: {
        "KMS_ENCRYPTION_KEY": kmsCmk,
        

      
      }

    });

        
    // 👇 create a policy statement
    const AccessPolicy = new iam.PolicyStatement({
      actions: [
        's3:ListBucketMultipartUploads',
        's3:PutBucketLogging',
        's3:GetBucketLogging',
        's3:ListBucketVersions',
        's3:ListBucket'
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
    const customresourceProvider = new custom_resource.Provider(this, 'EBSLambaCustomResource', {
      onEventHandler: bucketFunction,
      //isCompleteHandler: isComplete,        // optional async "waiter"
      logRetention: logs.RetentionDays.ONE_DAY   // default is INFINITE
      
    });
  
  
  new CustomResource(this, 'Invokes3logging', { serviceToken: customresourceProvider.serviceToken });
  
      
   
  
  
      
      const runrule=new events.Rule(this, "enableaccesslogsfornewbuckets",{
        eventPattern: {
          source: ["aws.s3"],
          detailType: ["AWS Service Event via CloudTrail"],
          detail: {
            "eventName": ["CreateBucket"]
          }
        }
      });
  
      runrule.addTarget(new targets.LambdaFunction(bucketFunction));
  
      const schedulerule=new events.Rule(this, "checkbucketsonschedule",{
        schedule: events.Schedule.cron({ minute: '0', hour: '4' }),
        
      });
  
      schedulerule.addTarget(new targets.LambdaFunction(bucketFunction));
  
      /*const lambdaErrors = bucketFunction.metricErrors({
        period: Duration.seconds(300),
      });
      const lambdaDuration = bucketFunction.metricDuration({
        period: Duration.seconds(300),
      });
  */
      /*
      const existingSnsTopic = sns.Topic.fromTopicArn(this, "existing topic", `arn:aws:sns:${Stack.of(this).region}:${Stack.of(this).account}:datacom-cloudwatch-alarms-mira-resources`);
  
      const errorAlarm = lambdaErrors.createAlarm(this, "Enable-EBS-Default-Encryption-error-alarm", {
        alarmName: `security-hub-Enable-EBS-Default-Encryption-errors-${Stack.of(this).region}:${Stack.of(this).account}`,
        threshold: 0,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 1,
        actionsEnabled: true
  
      });
      errorAlarm.addAlarmAction(new actions.SnsAction(existingSnsTopic));
      
      const durationAlarm = lambdaDuration.createAlarm(this, "Enable-EBS-Default-Encryption-duration-alarm", {
        alarmName: `security-hub-Enable-EBS-Default-Encryption-duration-${Stack.of(this).region}:${Stack.of(this).account}`,
        threshold: 30000,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 1,
        actionsEnabled: true
  
      });
      durationAlarm.addAlarmAction(new actions.SnsAction(existingSnsTopic));
      */

  }
}
