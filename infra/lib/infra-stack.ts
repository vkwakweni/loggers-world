import * as path from 'path';
import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'LoggersWorldTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPool = new cognito.UserPool(this, 'LoggersWorldUserPoolV2', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'LoggersWorldUserPoolClientV2', {
      userPool,
      generateSecret: false,
      authFlows: { userSrp: true },
    });

    const backendFunction = new lambda.Function(this, 'LoggersWorldBackendFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend')),
      environment: {
        TABLE_NAME: table.tableName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    // least-privilege: read/write on this table's ARN only, not "*"
    table.grantReadWriteData(backendFunction);

    // no built-in grant() for admin Cognito actions (unlike the table above), so the
    // policy is added by hand — scoped to this one user pool's ARN, not "*"
    backendFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:AdminDeleteUser', 'cognito-idp:AdminGetUser'],
      resources: [userPool.userPoolArn],
    }));

    const frontendOrigin = process.env.FRONTEND_ORIGIN;
    if (!frontendOrigin) {
      throw new Error('FRONTEND_ORIGIN is not set (see infra/.env.example)');
    }
    // comma-separated so local dev (http://localhost:5173) and the deployed
    // Amplify frontend can both call this same Lambda Function URL
    const allowedOrigins = frontendOrigin.split(',').map((origin) => origin.trim());

    const backendFunctionUrl = backendFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins,
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // printed after `cdk deploy` and shown in the CloudFormation console, so the URL doesn't need to be hunted down manually in the Lambda console
    new cdk.CfnOutput(this, 'BackendFunctionUrlOutput', {
      value: backendFunctionUrl.url,
    });

    new cdk.CfnOutput(this, 'UserPoolIdOutput', {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolClientIdOutput', {
      value: userPoolClient.userPoolClientId,
    });
  }
}
