import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

const ALLOW = 'Allow';
const DENY = 'Deny';

const UNAUTHORIZED = 'Unauthorized';
const FORBIDDEN = 'Forbidden';

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
    console.log('Event:', JSON.stringify(event));

    const methodArnParts = event.methodArn.split(':');
    const apiGatewayArnPart = methodArnParts[5].split('/');
    const httpMethod = apiGatewayArnPart[2];

    if (httpMethod === 'OPTIONS') {
        console.log('OPTIONS request - allowing without authentication');
        return generatePolicy('anonymous', ALLOW, event.methodArn);
    }

    try {
        const authorizationToken = event.authorizationToken;
        if (!authorizationToken) {
            console.log('Authorization header is missing');
            return generatePolicy(UNAUTHORIZED, DENY, event.methodArn);
        }

        if (!authorizationToken.startsWith('Basic ')) {
            console.log('Not a Basic authorization token');
            return generatePolicy(FORBIDDEN, DENY, event.methodArn);
        }

        const base64Credentials = authorizationToken.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');

        console.log(`Username: ${username}`);
        console.log(`Password provided: ${password}`);  // For debugging only, remove in production

        const storedCredentialsStr = process.env.CREDENTIALS || '';
        console.log('Stored credentials string:', storedCredentialsStr);

        const storedCredentials = new Map();

        storedCredentialsStr.split(',').forEach(cred => {
            const [user, pass] = cred.split(':');
            console.log(`Parsed credential: user=${user}, pass=${pass}`);
            if (user && pass) {
                storedCredentials.set(user.trim(), pass.trim());
            }
        });

        console.log('Looking for username:', username);
        console.log('Expected password:', storedCredentials.get(username));
        console.log('Provided password:', password);

        const expectedPassword = storedCredentials.get(username);
        if (!expectedPassword || expectedPassword !== password) {
            console.log('Invalid credentials');
            return generatePolicy(FORBIDDEN, DENY, event.methodArn);
        }

        console.log('Authentication successful');
        return generatePolicy(username, ALLOW, event.methodArn);
    } catch (error) {
        console.error('Error in authorization:', error);
        return generatePolicy(UNAUTHORIZED, DENY, event.methodArn);
    }
};

function generatePolicy(
    principalId: string,
    effect: typeof ALLOW | typeof DENY,
    resource: string
): APIGatewayAuthorizerResult {
    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource
                }
            ]
        }
    };
}