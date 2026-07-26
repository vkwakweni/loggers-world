import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

const GITHUB_REPO = 'vkwakweni/loggers-world';

// Lets GitHub Actions assume an AWS role via OIDC (short-lived credentials per
// workflow run) instead of storing long-lived AWS access keys as repo secrets.
export class GithubOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const provider = new iam.OpenIdConnectProvider(this, 'GithubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    const deployRole = new iam.Role(this, 'GithubActionsDeployRole', {
      roleName: 'github-actions-loggers-world-deploy',
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          // only the main branch (i.e. a merge/push to main) can assume this role
          'token.actions.githubusercontent.com:sub': `repo:${GITHUB_REPO}:ref:refs/heads/main`,
        },
      }),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    const account = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;
    const bootstrapQualifier = 'hnb659fds';

    // `cdk deploy` itself assumes these bootstrap roles to publish assets and
    // run the CloudFormation deployment; this role just needs permission to
    // assume them, not the underlying permissions directly.
    deployRole.addToPolicy(new iam.PolicyStatement({
      actions: ['sts:AssumeRole'],
      resources: [
        `arn:aws:iam::${account}:role/cdk-${bootstrapQualifier}-deploy-role-${account}-${region}`,
        `arn:aws:iam::${account}:role/cdk-${bootstrapQualifier}-file-publishing-role-${account}-${region}`,
        `arn:aws:iam::${account}:role/cdk-${bootstrapQualifier}-lookup-role-${account}-${region}`,
      ],
    }));

    new cdk.CfnOutput(this, 'GithubActionsDeployRoleArnOutput', {
      value: deployRole.roleArn,
    });
  }
}
