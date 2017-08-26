/**
 * Check for ConditionalCheckFailedException and returns null if condition failed
 * @param promise DynamoDB request promise
 */
export async function checkCondition<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      return null;
    }

    throw error;
  }
}

/**
 * Convert object to base64 encoded JSON
 */
export function toBase64JSON(value: any): string {
  return Buffer.from(JSON.stringify(value)).toString('base64');
}

/**
 * Extract object from base64 encoded JSON
 */
export function fromBase64JSON<T = any>(text: string): T {
  return JSON.parse(Buffer.from(text, 'base64').toString());
}
