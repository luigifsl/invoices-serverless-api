import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";

const cloudFormationClient = new CloudFormationClient({ region: process.env.REGION });

export async function getCognitoDetails() {
  try {
    const command = new DescribeStacksCommand({ StackName: process.env.STACK_NAME });
    const data = await cloudFormationClient.send(command);

    if (!data.Stacks || !data.Stacks[0] || !data.Stacks[0].Outputs) {
      throw new Error('Cognito details not found');
    }

    const userPoolIdOutput = data.Stacks[0].Outputs.find(o => o.ExportName === 'CognitoUserPoolId');
    const userClientIdOutput = data.Stacks[0].Outputs.find(o => o.ExportName === 'CognitoClientId');

    if (userPoolIdOutput && userClientIdOutput) {
      return {
        userPoolId: userPoolIdOutput.OutputValue,
        userClientId: userClientIdOutput.OutputValue
      };
    } else {
      throw new Error('Cognito details not found');
    }
  } catch (error) {
    console.error(error);
  }
}
